import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'
import { createHash, randomBytes } from 'node:crypto'

// Simulation-grade obfuscation: values are stored base64-wrapped and never
// returned in list endpoints. Real deployments must use envelope encryption
// (KMS). Never expose secrets or API keys in logs or list responses.
function seal(plain: string): string {
  return Buffer.from(plain, 'utf8').toString('base64')
}
function unseal(cipher: string): string {
  return Buffer.from(cipher, 'base64').toString('utf8')
}
function mask(plain: string): string {
  if (plain.length <= 4) return '****'
  return plain.slice(0, 2) + '****' + plain.slice(-2)
}

async function logAccess(tenantId: string, secretRef: string, actor: string, action: string, outcome = 'allowed') {
  await prisma.smAccessLog.create({ data: { tenantId, secretRef, actor, action, outcome } }).catch(() => null)
}

export async function secretsMgmtRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    secretTypes: ['generic', 'api-key', 'database', 'certificate', 'ssh-key', 'oauth-token'],
    permissions: ['read', 'write', 'admin'],
    granteeTypes: ['user', 'role', 'service'],
    vaultStatuses: ['unlocked', 'locked', 'sealed'],
  }))

  // T2: create vault
  app.post('/vaults', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, description, metadata } = req.body as any
    const vault = await prisma.smVault.create({
      data: { tenantId: r.tenantId, name, description, status: 'unlocked', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'secrets-mgmt', entityType: 'SmVault', entityId: vault.id, newValues: { name } as never } as never }).catch(() => null)
    return vault
  })

  // T3: list vaults
  app.get('/vaults', async (req) => {
    const r = req as unknown as { tenantId: string }
    const vaults = await prisma.smVault.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { secrets: true } } } })
    return { vaults, total: vaults.length }
  })

  // T4: lock/unlock vault
  app.post('/vaults/:vid/toggle-lock', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { vid } = req.params as any
    const vault = await prisma.smVault.findFirstOrThrow({ where: { id: vid, tenantId: r.tenantId } })
    const status = vault.status === 'unlocked' ? 'locked' : 'unlocked'
    await prisma.smVault.update({ where: { id: vid }, data: { status } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: status.toUpperCase(), module: 'secrets-mgmt', entityType: 'SmVault', entityId: vid, newValues: { status } as never } as never }).catch(() => null)
    return { success: true, status }
  })

  // T5: create secret (value sealed, never echoed back)
  app.post('/vaults/:vid/secrets', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { vid } = req.params as any
    const { key, value, secretType = 'generic', expiresAt, metadata } = req.body as any
    const vault = await prisma.smVault.findFirstOrThrow({ where: { id: vid, tenantId: r.tenantId } })
    if (vault.status !== 'unlocked') {
      await logAccess(r.tenantId, `${vault.name}/${key}`, r.userId, 'create', 'denied')
      return { error: 'vault is locked', status: vault.status }
    }
    const secret = await prisma.smSecret.create({
      data: { tenantId: r.tenantId, vaultId: vid, key, secretType, currentVersion: 1, status: 'active', expiresAt: expiresAt ? new Date(expiresAt) : null, metadata: metadata as never },
    })
    await prisma.smSecretVersion.create({
      data: { tenantId: r.tenantId, secretId: secret.id, version: 1, cipherText: seal(value), createdBy: r.userId },
    })
    await logAccess(r.tenantId, `${vault.name}/${key}`, r.userId, 'create')
    return { id: secret.id, key: secret.key, secretType: secret.secretType, currentVersion: 1, valuePreview: mask(value) }
  })

  // T6: list secrets (NO values returned — golden rule)
  app.get('/vaults/:vid/secrets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { vid } = req.params as any
    const secrets = await prisma.smSecret.findMany({
      where: { vaultId: vid, tenantId: r.tenantId },
      select: { id: true, key: true, secretType: true, currentVersion: true, status: true, lastRotatedAt: true, expiresAt: true, createdAt: true, _count: { select: { versions: true, grants: true } } },
    })
    return { secrets, total: secrets.length }
  })

  // T7: reveal secret value (audited, explicit action)
  app.post('/secrets/:sid/reveal', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sid } = req.params as any
    const secret = await prisma.smSecret.findFirstOrThrow({ where: { id: sid, tenantId: r.tenantId }, include: { vault: true } })
    if (secret.vault.status !== 'unlocked') {
      await logAccess(r.tenantId, `${secret.vault.name}/${secret.key}`, r.userId, 'reveal', 'denied')
      return { error: 'vault is locked' }
    }
    const version = await prisma.smSecretVersion.findFirstOrThrow({ where: { secretId: sid, version: secret.currentVersion } })
    await logAccess(r.tenantId, `${secret.vault.name}/${secret.key}`, r.userId, 'reveal')
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'REVEAL_SECRET', module: 'secrets-mgmt', entityType: 'SmSecret', entityId: sid, newValues: { key: secret.key, version: secret.currentVersion } as never } as never }).catch(() => null)
    return { key: secret.key, version: secret.currentVersion, value: unseal(version.cipherText) }
  })

  // T8: update secret value (new version)
  app.post('/secrets/:sid/versions', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sid } = req.params as any
    const { value } = req.body as any
    const secret = await prisma.smSecret.findFirstOrThrow({ where: { id: sid, tenantId: r.tenantId }, include: { vault: true } })
    const maxVer = await prisma.smSecretVersion.aggregate({ where: { secretId: sid }, _max: { version: true } })
    const newVersion = (maxVer._max.version ?? secret.currentVersion) + 1
    await prisma.smSecretVersion.create({
      data: { tenantId: r.tenantId, secretId: sid, version: newVersion, cipherText: seal(value), createdBy: r.userId },
    })
    await prisma.smSecret.update({ where: { id: sid }, data: { currentVersion: newVersion } })
    await logAccess(r.tenantId, `${secret.vault.name}/${secret.key}`, r.userId, 'update')
    return { id: sid, currentVersion: newVersion, valuePreview: mask(value) }
  })

  // T9: list versions (cipher never exposed)
  app.get('/secrets/:sid/versions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const versions = await prisma.smSecretVersion.findMany({
      where: { secretId: sid, tenantId: r.tenantId },
      select: { id: true, version: true, createdBy: true, createdAt: true },
      orderBy: { version: 'desc' },
    })
    return { versions, total: versions.length }
  })

  // T10: rollback to version
  app.post('/secrets/:sid/rollback', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sid } = req.params as any
    const { version } = req.body as any
    await prisma.smSecretVersion.findFirstOrThrow({ where: { secretId: sid, version, tenantId: r.tenantId } })
    await prisma.smSecret.update({ where: { id: sid }, data: { currentVersion: version } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'ROLLBACK_SECRET', module: 'secrets-mgmt', entityType: 'SmSecret', entityId: sid, newValues: { version } as never } as never }).catch(() => null)
    return { success: true, currentVersion: version }
  })

  // T11: rotate secret (generates new random value)
  app.post('/secrets/:sid/rotate', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sid } = req.params as any
    const secret = await prisma.smSecret.findFirstOrThrow({ where: { id: sid, tenantId: r.tenantId }, include: { vault: true } })
    const newValue = randomBytes(24).toString('hex')
    const maxVer = await prisma.smSecretVersion.aggregate({ where: { secretId: sid }, _max: { version: true } })
    const newVersion = (maxVer._max.version ?? secret.currentVersion) + 1
    await prisma.smSecretVersion.create({
      data: { tenantId: r.tenantId, secretId: sid, version: newVersion, cipherText: seal(newValue), createdBy: 'rotation-engine' },
    })
    await prisma.smSecret.update({ where: { id: sid }, data: { currentVersion: newVersion, lastRotatedAt: new Date() } })
    await logAccess(r.tenantId, `${secret.vault.name}/${secret.key}`, r.userId, 'rotate')
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'ROTATE_SECRET', module: 'secrets-mgmt', entityType: 'SmSecret', entityId: sid, newValues: { version: newVersion } as never } as never }).catch(() => null)
    return { success: true, currentVersion: newVersion, valuePreview: mask(newValue) }
  })

  // T12: grant access
  app.post('/secrets/:sid/grants', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const { granteeType = 'user', granteeRef, permission = 'read', expiresAt } = req.body as any
    return prisma.smAccessGrant.create({
      data: { tenantId: r.tenantId, secretId: sid, granteeType, granteeRef, permission, expiresAt: expiresAt ? new Date(expiresAt) : null, isActive: true },
    })
  })

  // T13: list grants
  app.get('/secrets/:sid/grants', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const grants = await prisma.smAccessGrant.findMany({ where: { secretId: sid, tenantId: r.tenantId } })
    return { grants, total: grants.length }
  })

  // T14: revoke grant
  app.post('/grants/:gid/revoke', async (req) => {
    const { gid } = req.params as any
    await prisma.smAccessGrant.update({ where: { id: gid }, data: { isActive: false } })
    return { success: true }
  })

  // T15: create rotation policy
  app.post('/rotation-policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, secretType = 'generic', intervalDays = 90, metadata } = req.body as any
    return prisma.smRotationPolicy.create({
      data: { tenantId: r.tenantId, name, secretType, intervalDays, isActive: true, metadata: metadata as never },
    })
  })

  // T16: list rotation policies
  app.get('/rotation-policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const policies = await prisma.smRotationPolicy.findMany({ where: { tenantId: r.tenantId } })
    return { policies, total: policies.length }
  })

  // T17: run rotation policy (rotates all matching stale secrets)
  app.post('/rotation-policies/:rpid/run', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { rpid } = req.params as any
    const policy = await prisma.smRotationPolicy.findFirstOrThrow({ where: { id: rpid, tenantId: r.tenantId } })
    const cutoff = new Date(Date.now() - policy.intervalDays * 86400000)
    const stale = await prisma.smSecret.findMany({
      where: {
        tenantId: r.tenantId, secretType: policy.secretType, status: 'active',
        OR: [{ lastRotatedAt: null }, { lastRotatedAt: { lt: cutoff } }],
      },
      include: { vault: true },
    })
    let rotated = 0
    for (const s of stale) {
      const newValue = randomBytes(24).toString('hex')
      const maxVer = await prisma.smSecretVersion.aggregate({ where: { secretId: s.id }, _max: { version: true } })
      const newVersion = (maxVer._max.version ?? s.currentVersion) + 1
      await prisma.smSecretVersion.create({ data: { tenantId: r.tenantId, secretId: s.id, version: newVersion, cipherText: seal(newValue), createdBy: 'rotation-engine' } })
      await prisma.smSecret.update({ where: { id: s.id }, data: { currentVersion: newVersion, lastRotatedAt: new Date() } })
      await logAccess(r.tenantId, `${s.vault.name}/${s.key}`, 'rotation-engine', 'rotate')
      rotated++
    }
    await prisma.smRotationPolicy.update({ where: { id: rpid }, data: { lastRunAt: new Date() } })
    return { rotated, evaluated: stale.length }
  })

  // T18: access logs
  app.get('/access-logs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const logs = await prisma.smAccessLog.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { logs, total: logs.length }
  })

  // T19: expiring secrets report
  app.get('/secrets/expiring', async (req) => {
    const r = req as unknown as { tenantId: string }
    const soon = new Date(Date.now() + 30 * 86400000)
    const expiring = await prisma.smSecret.findMany({
      where: { tenantId: r.tenantId, expiresAt: { not: null, lte: soon }, status: 'active' },
      select: { id: true, key: true, secretType: true, expiresAt: true },
    })
    return { expiring, total: expiring.length }
  })

  // T20: secrets health overview
  app.get('/overview', async (req) => {
    const r = req as unknown as { tenantId: string }
    const secrets = await prisma.smSecret.findMany({ where: { tenantId: r.tenantId } })
    const neverRotated = secrets.filter(s => !s.lastRotatedAt).length
    const staleCutoff = new Date(Date.now() - 90 * 86400000)
    const stale = secrets.filter(s => s.lastRotatedAt && s.lastRotatedAt < staleCutoff).length
    const [vaults, grants] = await Promise.all([
      prisma.smVault.count({ where: { tenantId: r.tenantId } }),
      prisma.smAccessGrant.count({ where: { tenantId: r.tenantId, isActive: true } }),
    ])
    const hygiene = secrets.length ? Math.max(0, Math.round(100 - ((neverRotated + stale) / secrets.length) * 100)) : 100
    return { vaults, secrets: secrets.length, activeGrants: grants, neverRotated, staleSecrets: stale, hygieneScore: hygiene }
  })

  // T21: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [vaults, secrets, versions, grants, policies, logs] = await Promise.all([
      prisma.smVault.count({ where: { tenantId: r.tenantId } }),
      prisma.smSecret.count({ where: { tenantId: r.tenantId } }),
      prisma.smSecretVersion.count({ where: { tenantId: r.tenantId } }),
      prisma.smAccessGrant.count({ where: { tenantId: r.tenantId } }),
      prisma.smRotationPolicy.count({ where: { tenantId: r.tenantId } }),
      prisma.smAccessLog.count({ where: { tenantId: r.tenantId } }),
    ])
    return { vaults, secrets, versions, grants, rotationPolicies: policies, accessLogs: logs }
  })

  // T22: get secret metadata (no value)
  app.get('/secrets/:sid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    return prisma.smSecret.findFirstOrThrow({
      where: { id: sid, tenantId: r.tenantId },
      select: { id: true, key: true, secretType: true, currentVersion: true, status: true, lastRotatedAt: true, expiresAt: true, vault: { select: { name: true, status: true } } },
    })
  })

  // T23: deactivate secret
  app.post('/secrets/:sid/deactivate', async (req) => {
    const { sid } = req.params as any
    await prisma.smSecret.update({ where: { id: sid }, data: { status: 'deactivated' } })
    return { success: true }
  })

  // T24: locked vault denies secret creation
  // (covered by T5 logic; endpoint here verifies denial is logged)
  app.get('/access-logs/denied', async (req) => {
    const r = req as unknown as { tenantId: string }
    const logs = await prisma.smAccessLog.findMany({ where: { tenantId: r.tenantId, outcome: 'denied' }, orderBy: { createdAt: 'desc' }, take: 50 })
    return { logs, total: logs.length }
  })

  // T25: delete rotation policy
  app.delete('/rotation-policies/:rpid', async (req) => {
    const { rpid } = req.params as any
    await prisma.smRotationPolicy.delete({ where: { id: rpid } })
    return { success: true }
  })

  // T26: delete grant
  app.delete('/grants/:gid', async (req) => {
    const { gid } = req.params as any
    await prisma.smAccessGrant.delete({ where: { id: gid } })
    return { success: true }
  })

  // T27: delete secret (audited)
  app.delete('/secrets/:sid', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sid } = req.params as any
    const secret = await prisma.smSecret.findFirst({ where: { id: sid, tenantId: r.tenantId } })
    await prisma.smSecret.delete({ where: { id: sid } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'DELETE_SECRET', module: 'secrets-mgmt', entityType: 'SmSecret', entityId: sid, newValues: { key: secret?.key } as never } as never }).catch(() => null)
    return { success: true }
  })

  // T28: delete vault
  app.delete('/vaults/:vid', async (req) => {
    const { vid } = req.params as any
    await prisma.smVault.delete({ where: { id: vid } })
    return { success: true }
  })
}
