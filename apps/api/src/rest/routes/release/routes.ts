import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'
import { createHash } from 'node:crypto'

// GOLDEN RULE: "Do not perform real production deploy."
// Every deploy plan here is simulation-only: production plans are forced to
// dry-run and cannot be executed against real infrastructure.

export async function releaseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    releaseStatuses: ['draft', 'candidate', 'ga', 'deprecated'],
    platforms: ['docker', 'docker-compose', 'kubernetes-helm', 'windows-installer', 'linux-package'],
    channels: ['stable', 'beta', 'canary'],
    strategies: ['blue-green', 'rolling', 'canary'],
    checklistCategories: ['quality', 'security', 'docs', 'legal', 'ops'],
    note: 'Production deploy plans are always dry-run — real deploys are never executed from here.',
  }))

  // T2: create release
  app.post('/releases', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { version, codename, releaseNotes, metadata } = req.body as any
    const release = await prisma.relRelease.create({
      data: { tenantId: r.tenantId, version, codename, releaseNotes, status: 'draft', metadata: metadata as never },
    })
    const defaults = [
      { title: 'All test suites pass', category: 'quality' },
      { title: 'Security review complete', category: 'security' },
      { title: 'Release notes written', category: 'docs' },
      { title: 'License headers verified', category: 'legal' },
      { title: 'Rollback plan documented', category: 'ops' },
    ]
    for (const c of defaults) {
      await prisma.relChecklistItem.create({ data: { tenantId: r.tenantId, releaseId: release.id, title: c.title, category: c.category, isRequired: true } })
    }
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'release', entityType: 'RelRelease', entityId: release.id, newValues: { version } as never } as never }).catch(() => null)
    return release
  })

  // T3: list releases
  app.get('/releases', async (req) => {
    const r = req as unknown as { tenantId: string }
    const releases = await prisma.relRelease.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { artifacts: true, deployPlans: true, checklistItems: true } } } })
    return { releases, total: releases.length }
  })

  // T4: get release
  app.get('/releases/:rid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    return prisma.relRelease.findFirstOrThrow({ where: { id: rid, tenantId: r.tenantId }, include: { artifacts: true, checklistItems: true, deployPlans: true } })
  })

  // T5: build artifacts (simulation)
  app.post('/releases/:rid/build', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { rid } = req.params as any
    const { platforms = ['docker'] } = req.body as any
    const release = await prisma.relRelease.findFirstOrThrow({ where: { id: rid, tenantId: r.tenantId } })
    const artifacts = []
    for (const platform of platforms.slice(0, 10)) {
      const ref = `dist/reno-${release.version}-${platform}.tar.gz`
      artifacts.push(await prisma.relArtifact.create({
        data: {
          tenantId: r.tenantId, releaseId: rid, platform, artifactRef: ref,
          sizeMb: 150 + Math.floor(Math.random() * 500),
          checksum: createHash('sha256').update(ref + release.version).digest('hex'),
          status: 'built',
        },
      }))
    }
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'BUILD_ARTIFACTS', module: 'release', entityType: 'RelRelease', entityId: rid, newValues: { platforms } as never } as never }).catch(() => null)
    return { built: artifacts.length, artifacts }
  })

  // T6: list artifacts
  app.get('/releases/:rid/artifacts', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const artifacts = await prisma.relArtifact.findMany({ where: { releaseId: rid, tenantId: r.tenantId } })
    return { artifacts, total: artifacts.length }
  })

  // T7: verify artifact checksum
  app.post('/artifacts/:aid/verify', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const artifact = await prisma.relArtifact.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId }, include: { release: true } })
    const expected = createHash('sha256').update(artifact.artifactRef + artifact.release.version).digest('hex')
    const valid = expected === artifact.checksum
    await prisma.relArtifact.update({ where: { id: aid }, data: { status: valid ? 'verified' : 'corrupt' } })
    return { valid, checksum: artifact.checksum }
  })

  // T8: checklist — list
  app.get('/releases/:rid/checklist', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const items = await prisma.relChecklistItem.findMany({ where: { releaseId: rid, tenantId: r.tenantId }, orderBy: { createdAt: 'asc' } })
    return { items, total: items.length, done: items.filter(i => i.isDone).length }
  })

  // T9: complete checklist item
  app.post('/checklist/:cid/done', async (req) => {
    const r = req as unknown as { userId: string }
    const { cid } = req.params as any
    return prisma.relChecklistItem.update({ where: { id: cid }, data: { isDone: true, doneBy: r.userId } })
  })

  // T10: promote to candidate (requires all artifacts + required checklist done)
  app.post('/releases/:rid/promote', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { rid } = req.params as any
    const release = await prisma.relRelease.findFirstOrThrow({ where: { id: rid, tenantId: r.tenantId }, include: { artifacts: true, checklistItems: true } })
    if (release.status === 'draft') {
      if (release.artifacts.length === 0) return { error: 'no artifacts built' }
      return prisma.relRelease.update({ where: { id: rid }, data: { status: 'candidate' } })
    }
    if (release.status === 'candidate') {
      const pending = release.checklistItems.filter(i => i.isRequired && !i.isDone)
      if (pending.length > 0) return { error: `required checklist items pending: ${pending.map(p => p.title).join('; ')}` }
      const updated = await prisma.relRelease.update({ where: { id: rid }, data: { status: 'ga', gaAt: new Date() } })
      await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'GA_RELEASE', module: 'release', entityType: 'RelRelease', entityId: rid, newValues: { version: release.version } as never } as never }).catch(() => null)
      return updated
    }
    return { error: `cannot promote from ${release.status}` }
  })

  // T11: create channel
  app.post('/channels', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, autoUpdate = false } = req.body as any
    return prisma.relChannel.create({ data: { tenantId: r.tenantId, name, autoUpdate } })
  })

  // T12: publish release to channel (GA only for stable)
  app.post('/channels/:chid/publish', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { chid } = req.params as any
    const { releaseId } = req.body as any
    const [channel, release] = await Promise.all([
      prisma.relChannel.findFirstOrThrow({ where: { id: chid, tenantId: r.tenantId } }),
      prisma.relRelease.findFirstOrThrow({ where: { id: releaseId, tenantId: r.tenantId } }),
    ])
    if (channel.name === 'stable' && release.status !== 'ga') return { error: 'only GA releases can go to stable channel' }
    const updated = await prisma.relChannel.update({ where: { id: chid }, data: { currentVersion: release.version } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'PUBLISH_CHANNEL', module: 'release', entityType: 'RelChannel', entityId: chid, newValues: { channel: channel.name, version: release.version } as never } as never }).catch(() => null)
    return updated
  })

  // T13: list channels
  app.get('/channels', async (req) => {
    const r = req as unknown as { tenantId: string }
    const channels = await prisma.relChannel.findMany({ where: { tenantId: r.tenantId } })
    return { channels, total: channels.length }
  })

  // T14: run installer (simulation — walks install steps)
  app.post('/install', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { siteName, installType = 'docker-compose', version, channel = 'stable' } = req.body as any
    const steps = [
      { step: 'preflight-checks', status: 'ok' },
      { step: 'download-artifacts', status: 'ok' },
      { step: 'verify-checksums', status: 'ok' },
      { step: 'provision-database', status: 'ok' },
      { step: 'run-migrations', status: 'ok' },
      { step: 'start-services', status: 'ok' },
      { step: 'smoke-tests', status: 'ok' },
    ]
    const installation = await prisma.relInstallation.create({
      data: {
        tenantId: r.tenantId, siteName, installType, version, channel, status: 'installed',
        steps: steps as never,
        healthCheck: { api: 'healthy', web: 'healthy', database: 'healthy' } as never,
        installedAt: new Date(),
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'INSTALL', module: 'release', entityType: 'RelInstallation', entityId: installation.id, newValues: { siteName, version, simulated: true } as never } as never }).catch(() => null)
    return installation
  })

  // T15: list installations
  app.get('/installations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const installations = await prisma.relInstallation.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { installations, total: installations.length }
  })

  // T16: upgrade installation (simulation)
  app.post('/installations/:iid/upgrade', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { iid } = req.params as any
    const { toVersion } = req.body as any
    const inst = await prisma.relInstallation.findFirstOrThrow({ where: { id: iid, tenantId: r.tenantId } })
    const steps = [...((inst.steps as any[]) ?? []), { step: `upgrade ${inst.version} → ${toVersion}`, status: 'ok', at: new Date().toISOString() }]
    return prisma.relInstallation.update({ where: { id: iid }, data: { version: toVersion, steps: steps as never, status: 'installed' } })
  })

  // T17: installation health check (simulation)
  app.post('/installations/:iid/health-check', async (req) => {
    const { iid } = req.params as any
    const health = { api: 'healthy', web: 'healthy', database: 'healthy', checkedAt: new Date().toISOString() }
    await prisma.relInstallation.update({ where: { id: iid }, data: { healthCheck: health as never } })
    return health
  })

  // T18: create deploy plan (production is ALWAYS dry-run)
  app.post('/releases/:rid/deploy-plans', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const { environment = 'staging', strategy = 'blue-green' } = req.body as any
    const isDryRun = environment === 'production' ? true : ((req.body as any).isDryRun ?? true)
    const planSteps = [
      { order: 1, step: 'freeze-writes' },
      { order: 2, step: `provision-${strategy}-environment` },
      { order: 3, step: 'deploy-artifacts' },
      { order: 4, step: 'run-migrations' },
      { order: 5, step: 'smoke-tests' },
      { order: 6, step: 'switch-traffic' },
      { order: 7, step: 'monitor-30min' },
    ]
    return prisma.relDeployPlan.create({
      data: { tenantId: r.tenantId, releaseId: rid, environment, strategy, status: 'planned', isDryRun, planSteps: planSteps as never },
    })
  })

  // T19: approve deploy plan
  app.post('/deploy-plans/:dpid/approve', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { dpid } = req.params as any
    const plan = await prisma.relDeployPlan.update({ where: { id: dpid }, data: { status: 'approved', approvedBy: r.userId } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'APPROVE_DEPLOY_PLAN', module: 'release', entityType: 'RelDeployPlan', entityId: dpid, newValues: { environment: plan.environment, isDryRun: plan.isDryRun } as never } as never }).catch(() => null)
    return plan
  })

  // T20: execute deploy plan (SIMULATION ONLY — production always dry-run)
  app.post('/deploy-plans/:dpid/execute', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { dpid } = req.params as any
    const plan = await prisma.relDeployPlan.findFirstOrThrow({ where: { id: dpid, tenantId: r.tenantId } })
    if (plan.status !== 'approved') return { error: 'plan must be approved before execution' }
    if (plan.environment === 'production' && !plan.isDryRun) {
      return { error: 'real production deploys are not permitted from this system (golden rule)' }
    }
    const updated = await prisma.relDeployPlan.update({
      where: { id: dpid },
      data: { status: plan.isDryRun ? 'dry-run-completed' : 'executed', executedAt: new Date() },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'EXECUTE_DEPLOY_PLAN', module: 'release', entityType: 'RelDeployPlan', entityId: dpid, newValues: { dryRun: plan.isDryRun, environment: plan.environment } as never } as never }).catch(() => null)
    return { plan: updated, simulated: true, note: plan.isDryRun ? 'Dry run — no real infrastructure touched.' : 'Simulated staging execution.' }
  })

  // T21: list deploy plans
  app.get('/deploy-plans', async (req) => {
    const r = req as unknown as { tenantId: string }
    const plans = await prisma.relDeployPlan.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { release: { select: { version: true } } } })
    return { plans, total: plans.length }
  })

  // T22: release readiness report
  app.get('/releases/:rid/readiness', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const release = await prisma.relRelease.findFirstOrThrow({ where: { id: rid, tenantId: r.tenantId }, include: { artifacts: true, checklistItems: true } })
    const requiredDone = release.checklistItems.filter(i => i.isRequired && i.isDone).length
    const requiredTotal = release.checklistItems.filter(i => i.isRequired).length
    const verified = release.artifacts.filter(a => a.status === 'verified').length
    const ready = release.artifacts.length > 0 && requiredDone === requiredTotal
    return {
      version: release.version, status: release.status, ready,
      artifacts: release.artifacts.length, verifiedArtifacts: verified,
      checklist: `${requiredDone}/${requiredTotal} required done`,
      blockers: ready ? [] : [
        ...(release.artifacts.length === 0 ? ['no artifacts'] : []),
        ...(requiredDone < requiredTotal ? ['checklist incomplete'] : []),
      ],
    }
  })

  // T23: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [releases, artifacts, channels, installations, plans, checklist] = await Promise.all([
      prisma.relRelease.count({ where: { tenantId: r.tenantId } }),
      prisma.relArtifact.count({ where: { tenantId: r.tenantId } }),
      prisma.relChannel.count({ where: { tenantId: r.tenantId } }),
      prisma.relInstallation.count({ where: { tenantId: r.tenantId } }),
      prisma.relDeployPlan.count({ where: { tenantId: r.tenantId } }),
      prisma.relChecklistItem.count({ where: { tenantId: r.tenantId } }),
    ])
    return { releases, artifacts, channels, installations, deployPlans: plans, checklistItems: checklist }
  })

  // T24: update release notes
  app.patch('/releases/:rid', async (req) => {
    const { rid } = req.params as any
    const data = req.body as any
    return prisma.relRelease.update({ where: { id: rid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T25: delete channel
  app.delete('/channels/:chid', async (req) => {
    const { chid } = req.params as any
    await prisma.relChannel.delete({ where: { id: chid } })
    return { success: true }
  })

  // T26: delete installation record
  app.delete('/installations/:iid', async (req) => {
    const { iid } = req.params as any
    await prisma.relInstallation.delete({ where: { id: iid } })
    return { success: true }
  })

  // T27: delete deploy plan
  app.delete('/deploy-plans/:dpid', async (req) => {
    const { dpid } = req.params as any
    await prisma.relDeployPlan.delete({ where: { id: dpid } })
    return { success: true }
  })

  // T28: delete release
  app.delete('/releases/:rid', async (req) => {
    const { rid } = req.params as any
    await prisma.relRelease.delete({ where: { id: rid } })
    return { success: true }
  })
}
