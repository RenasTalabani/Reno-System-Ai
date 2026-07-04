import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'
import { createHash, randomBytes } from 'node:crypto'

// License keys follow the API-key rule: full key shown once at issue,
// only prefix + SHA-256 hash stored.
function makeLicenseKey(): { full: string; prefix: string; hash: string } {
  const segs = Array.from({ length: 4 }, () => randomBytes(3).toString('hex').toUpperCase())
  const full = `RENO-${segs.join('-')}`
  return { full, prefix: full.slice(0, 12), hash: createHash('sha256').update(full).digest('hex') }
}

export async function licensingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    tiers: ['starter', 'professional', 'enterprise', 'unlimited'],
    keyStatuses: ['issued', 'active', 'suspended', 'revoked', 'expired'],
    meterTypes: ['api-calls', 'ai-tokens', 'storage-gb', 'active-users'],
    entitlementSources: ['plan', 'addon', 'trial', 'manual'],
  }))

  // T2: create plan
  app.post('/plans', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, code, tier = 'starter', priceMonthly = 0, priceYearly = 0, maxUsers = 10, features = [] } = req.body as any
    const plan = await prisma.licPlan.create({
      data: { tenantId: r.tenantId, name, code, tier, priceMonthly, priceYearly, maxUsers, features: features as never, isActive: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'licensing', entityType: 'LicPlan', entityId: plan.id, newValues: { name, tier } as never } as never }).catch(() => null)
    return plan
  })

  // T3: list plans
  app.get('/plans', async (req) => {
    const r = req as unknown as { tenantId: string }
    const plans = await prisma.licPlan.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { keys: true } } } })
    return { plans, total: plans.length }
  })

  // T4: update plan
  app.patch('/plans/:pid', async (req) => {
    const { pid } = req.params as any
    const data = req.body as any
    return prisma.licPlan.update({ where: { id: pid }, data: { ...data, features: data.features as never } })
  })

  // T5: issue license key (shown once, audited)
  app.post('/keys', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { planId, customerRef, seats = 10, validDays = 365 } = req.body as any
    const plan = await prisma.licPlan.findFirstOrThrow({ where: { id: planId, tenantId: r.tenantId } })
    const { full, prefix, hash } = makeLicenseKey()
    const key = await prisma.licKey.create({
      data: { tenantId: r.tenantId, planId, keyHash: hash, keyPrefix: prefix, customerRef, seats, status: 'issued', expiresAt: new Date(Date.now() + validDays * 86400000) },
    })
    // grant plan features as entitlements
    for (const feature of ((plan.features as string[]) ?? [])) {
      await prisma.licEntitlement.upsert({
        where: { tenantId_customerRef_feature: { tenantId: r.tenantId, customerRef, feature } },
        update: { enabled: true, source: 'plan' },
        create: { tenantId: r.tenantId, customerRef, feature, enabled: true, source: 'plan' },
      })
    }
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'ISSUE_LICENSE', module: 'licensing', entityType: 'LicKey', entityId: key.id, newValues: { prefix, customerRef, seats } as never } as never }).catch(() => null)
    return { id: key.id, licenseKey: full, keyPrefix: prefix, expiresAt: key.expiresAt, note: 'Store this key now — it will not be shown again.' }
  })

  // T6: list keys (prefix only)
  app.get('/keys', async (req) => {
    const r = req as unknown as { tenantId: string }
    const keys = await prisma.licKey.findMany({
      where: { tenantId: r.tenantId },
      select: { id: true, keyPrefix: true, customerRef: true, seats: true, status: true, issuedAt: true, expiresAt: true, plan: { select: { name: true, tier: true } }, _count: { select: { activations: true } } },
      orderBy: { issuedAt: 'desc' },
    })
    return { keys, total: keys.length }
  })

  // T7: validate + activate license on a machine
  app.post('/activate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { licenseKey, machineRef, hostname, appVersion } = req.body as any
    const hash = createHash('sha256').update(licenseKey ?? '').digest('hex')
    const key = await prisma.licKey.findFirst({ where: { tenantId: r.tenantId, keyHash: hash } })
    if (!key) return { activated: false, reason: 'invalid license key' }
    if (key.status === 'revoked' || key.status === 'suspended') return { activated: false, reason: `license is ${key.status}` }
    if (key.expiresAt && key.expiresAt < new Date()) return { activated: false, reason: 'license expired' }
    const activeCount = await prisma.licActivation.count({ where: { keyId: key.id, isActive: true } })
    const existing = await prisma.licActivation.findFirst({ where: { keyId: key.id, machineRef } })
    if (!existing && activeCount >= key.seats) return { activated: false, reason: `seat limit reached (${key.seats})` }
    const activation = existing
      ? await prisma.licActivation.update({ where: { id: existing.id }, data: { isActive: true, lastSeenAt: new Date(), hostname, appVersion, deactivatedAt: null } })
      : await prisma.licActivation.create({ data: { tenantId: r.tenantId, keyId: key.id, machineRef, hostname, appVersion, isActive: true } })
    if (key.status === 'issued') await prisma.licKey.update({ where: { id: key.id }, data: { status: 'active' } })
    return { activated: true, activationId: activation.id, seatsUsed: existing ? activeCount : activeCount + 1, seats: key.seats, expiresAt: key.expiresAt }
  })

  // T8: heartbeat (license check-in)
  app.post('/activations/:actId/heartbeat', async (req) => {
    const { actId } = req.params as any
    const activation = await prisma.licActivation.update({ where: { id: actId }, data: { lastSeenAt: new Date() } })
    return { ok: true, lastSeenAt: activation.lastSeenAt }
  })

  // T9: deactivate machine
  app.post('/activations/:actId/deactivate', async (req) => {
    const { actId } = req.params as any
    return prisma.licActivation.update({ where: { id: actId }, data: { isActive: false, deactivatedAt: new Date() } })
  })

  // T10: list activations for a key
  app.get('/keys/:kid/activations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { kid } = req.params as any
    const activations = await prisma.licActivation.findMany({ where: { keyId: kid, tenantId: r.tenantId } })
    return { activations, total: activations.length }
  })

  // T11: suspend key (audited)
  app.post('/keys/:kid/suspend', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { kid } = req.params as any
    const key = await prisma.licKey.update({ where: { id: kid }, data: { status: 'suspended' } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'SUSPEND_LICENSE', module: 'licensing', entityType: 'LicKey', entityId: kid, newValues: { status: 'suspended' } as never } as never }).catch(() => null)
    return key
  })

  // T12: reinstate key
  app.post('/keys/:kid/reinstate', async (req) => {
    const { kid } = req.params as any
    return prisma.licKey.update({ where: { id: kid }, data: { status: 'active' } })
  })

  // T13: revoke key (permanent, audited)
  app.post('/keys/:kid/revoke', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { kid } = req.params as any
    const key = await prisma.licKey.update({ where: { id: kid }, data: { status: 'revoked' } })
    await prisma.licActivation.updateMany({ where: { keyId: kid }, data: { isActive: false, deactivatedAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'REVOKE_LICENSE', module: 'licensing', entityType: 'LicKey', entityId: kid, newValues: { status: 'revoked' } as never } as never }).catch(() => null)
    return key
  })

  // T14: renew key
  app.post('/keys/:kid/renew', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { kid } = req.params as any
    const { extendDays = 365, amount = 0 } = req.body as any
    const key = await prisma.licKey.findFirstOrThrow({ where: { id: kid, tenantId: r.tenantId } })
    const base = key.expiresAt && key.expiresAt > new Date() ? key.expiresAt : new Date()
    const newExpiry = new Date(base.getTime() + extendDays * 86400000)
    await prisma.licKey.update({ where: { id: kid }, data: { expiresAt: newExpiry, status: key.status === 'expired' ? 'active' : key.status } })
    const renewal = await prisma.licRenewal.create({
      data: { tenantId: r.tenantId, keyId: kid, previousExpiry: key.expiresAt, newExpiry, amount, status: 'completed' },
    })
    return { renewal, newExpiry }
  })

  // T15: list renewals
  app.get('/keys/:kid/renewals', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { kid } = req.params as any
    const renewals = await prisma.licRenewal.findMany({ where: { keyId: kid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { renewals, total: renewals.length }
  })

  // T16: set entitlement
  app.post('/entitlements', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { customerRef, feature, enabled = true, limitValue, source = 'manual', expiresAt } = req.body as any
    return prisma.licEntitlement.upsert({
      where: { tenantId_customerRef_feature: { tenantId: r.tenantId, customerRef, feature } },
      update: { enabled, limitValue, source, expiresAt: expiresAt ? new Date(expiresAt) : null },
      create: { tenantId: r.tenantId, customerRef, feature, enabled, limitValue, source, expiresAt: expiresAt ? new Date(expiresAt) : null },
    })
  })

  // T17: check entitlement (feature gate)
  app.get('/entitlements/check', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { customerRef, feature } = req.query as any
    const ent = await prisma.licEntitlement.findFirst({ where: { tenantId: r.tenantId, customerRef, feature } })
    if (!ent || !ent.enabled) return { entitled: false, reason: ent ? 'disabled' : 'not granted' }
    if (ent.expiresAt && ent.expiresAt < new Date()) return { entitled: false, reason: 'expired' }
    return { entitled: true, limitValue: ent.limitValue, source: ent.source }
  })

  // T18: list customer entitlements
  app.get('/customers/:customerRef/entitlements', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { customerRef } = req.params as any
    const entitlements = await prisma.licEntitlement.findMany({ where: { tenantId: r.tenantId, customerRef } })
    return { customerRef, entitlements, total: entitlements.length }
  })

  // T19: record metered usage
  app.post('/meters/record', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { customerRef, meterType, amount = 1 } = req.body as any
    const meter = await prisma.licMeter.upsert({
      where: { tenantId_customerRef_meterType: { tenantId: r.tenantId, customerRef, meterType } },
      update: { usedValue: { increment: amount } },
      create: { tenantId: r.tenantId, customerRef, meterType, usedValue: amount, periodEnd: new Date(Date.now() + 30 * 86400000) },
    })
    return meter
  })

  // T20: customer usage summary
  app.get('/customers/:customerRef/usage', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { customerRef } = req.params as any
    const meters = await prisma.licMeter.findMany({ where: { tenantId: r.tenantId, customerRef } })
    return { customerRef, meters, total: meters.length }
  })

  // T21: expiring licenses report (next 30 days)
  app.get('/keys/expiring', async (req) => {
    const r = req as unknown as { tenantId: string }
    const soon = new Date(Date.now() + 30 * 86400000)
    const keys = await prisma.licKey.findMany({
      where: { tenantId: r.tenantId, status: { in: ['issued', 'active'] }, expiresAt: { not: null, lte: soon } },
      select: { id: true, keyPrefix: true, customerRef: true, expiresAt: true },
    })
    return { expiring: keys, total: keys.length }
  })

  // T22: licensing dashboard
  app.get('/dashboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [plans, keys, activations, expiringSoon] = await Promise.all([
      prisma.licPlan.count({ where: { tenantId: r.tenantId, isActive: true } }),
      prisma.licKey.findMany({ where: { tenantId: r.tenantId } }),
      prisma.licActivation.count({ where: { tenantId: r.tenantId, isActive: true } }),
      prisma.licKey.count({ where: { tenantId: r.tenantId, status: { in: ['issued', 'active'] }, expiresAt: { not: null, lte: new Date(Date.now() + 30 * 86400000) } } }),
    ])
    const active = keys.filter(k => k.status === 'active').length
    const totalSeats = keys.filter(k => ['issued', 'active'].includes(k.status)).reduce((s, k) => s + k.seats, 0)
    return { plans, totalKeys: keys.length, activeKeys: active, revoked: keys.filter(k => k.status === 'revoked').length, activeActivations: activations, totalSeats, expiringSoon }
  })

  // T23: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [plans, keys, activations, entitlements, meters, renewals] = await Promise.all([
      prisma.licPlan.count({ where: { tenantId: r.tenantId } }),
      prisma.licKey.count({ where: { tenantId: r.tenantId } }),
      prisma.licActivation.count({ where: { tenantId: r.tenantId } }),
      prisma.licEntitlement.count({ where: { tenantId: r.tenantId } }),
      prisma.licMeter.count({ where: { tenantId: r.tenantId } }),
      prisma.licRenewal.count({ where: { tenantId: r.tenantId } }),
    ])
    return { plans, keys, activations, entitlements, meters, renewals }
  })

  // T24: reset meter
  app.post('/meters/:mid/reset', async (req) => {
    const { mid } = req.params as any
    return prisma.licMeter.update({ where: { id: mid }, data: { usedValue: 0, periodStart: new Date(), periodEnd: new Date(Date.now() + 30 * 86400000) } })
  })

  // T25: delete entitlement
  app.delete('/entitlements/:eid', async (req) => {
    const { eid } = req.params as any
    await prisma.licEntitlement.delete({ where: { id: eid } })
    return { success: true }
  })

  // T26: delete meter
  app.delete('/meters/:mid', async (req) => {
    const { mid } = req.params as any
    await prisma.licMeter.delete({ where: { id: mid } })
    return { success: true }
  })

  // T27: delete key
  app.delete('/keys/:kid', async (req) => {
    const { kid } = req.params as any
    await prisma.licKey.delete({ where: { id: kid } })
    return { success: true }
  })

  // T28: delete plan
  app.delete('/plans/:pid', async (req) => {
    const { pid } = req.params as any
    await prisma.licPlan.delete({ where: { id: pid } })
    return { success: true }
  })
}
