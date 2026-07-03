import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

// Env var values are stored base64-sealed; secret vars are masked in reads.
function seal(v: string): string { return Buffer.from(v, 'utf8').toString('base64') }
function unseal(v: string): string { return Buffer.from(v, 'base64').toString('utf8') }

async function logActivity(tenantId: string, appRef: string, actor: string, action: string, detail?: string) {
  await prisma.devActivity.create({ data: { tenantId, appRef, actor, action, detail } }).catch(() => null)
}

export async function devConsoleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    appTypes: ['api-integration', 'plugin', 'extension', 'webhook-consumer', 'internal-tool'],
    appStatuses: ['development', 'testing', 'staging-ready', 'production', 'archived'],
    sandboxStatuses: ['stopped', 'starting', 'running', 'expired'],
    logLevels: ['debug', 'info', 'warn', 'error'],
    environments: ['development', 'staging', 'production'],
  }))

  // T2: create app
  app.post('/apps', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, appType = 'api-integration', description, metadata } = req.body as any
    const created = await prisma.devApp.create({
      data: { tenantId: r.tenantId, name, appType, description, ownerRef: r.userId, status: 'development', metadata: metadata as never },
    })
    await logActivity(r.tenantId, created.name, r.userId, 'app.created')
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'dev-console', entityType: 'DevApp', entityId: created.id, newValues: { name } as never } as never }).catch(() => null)
    return created
  })

  // T3: list apps
  app.get('/apps', async (req) => {
    const r = req as unknown as { tenantId: string }
    const apps = await prisma.devApp.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { sandboxes: true, testRuns: true, envVars: true } } } })
    return { apps, total: apps.length }
  })

  // T4: get app
  app.get('/apps/:aid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    return prisma.devApp.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId }, include: { sandboxes: true, _count: { select: { testRuns: true, logEntries: true } } } })
  })

  // T5: update app (status transitions)
  app.patch('/apps/:aid', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const data = req.body as any
    const updated = await prisma.devApp.update({ where: { id: aid }, data: { ...data, metadata: data.metadata as never } })
    if (data.status) await logActivity(r.tenantId, updated.name, r.userId, 'app.status-changed', data.status)
    return updated
  })

  // T6: create sandbox
  app.post('/apps/:aid/sandboxes', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const { name, seedData = true, ttlHours = 24 } = req.body as any
    const app_ = await prisma.devApp.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId } })
    const sandbox = await prisma.devSandbox.create({
      data: { tenantId: r.tenantId, appId: aid, name, seedData, status: 'stopped', expiresAt: new Date(Date.now() + ttlHours * 3600000) },
    })
    await logActivity(r.tenantId, app_.name, r.userId, 'sandbox.created', name)
    return sandbox
  })

  // T7: start sandbox (simulation)
  app.post('/sandboxes/:sbid/start', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sbid } = req.params as any
    const sandbox = await prisma.devSandbox.update({ where: { id: sbid }, data: { status: 'running' } })
    return { ...sandbox, endpoint: `https://sandbox-${sbid.slice(0, 8)}.reno.dev` }
  })

  // T8: stop sandbox
  app.post('/sandboxes/:sbid/stop', async (req) => {
    const { sbid } = req.params as any
    return prisma.devSandbox.update({ where: { id: sbid }, data: { status: 'stopped' } })
  })

  // T9: list sandboxes
  app.get('/apps/:aid/sandboxes', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const sandboxes = await prisma.devSandbox.findMany({ where: { appId: aid, tenantId: r.tenantId } })
    return { sandboxes, total: sandboxes.length }
  })

  // T10: write log entry
  app.post('/apps/:aid/logs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { level = 'info', message, context } = req.body as any
    return prisma.devLogEntry.create({
      data: { tenantId: r.tenantId, appId: aid, level, message, context: context as never },
    })
  })

  // T11: query logs
  app.get('/apps/:aid/logs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { level, text } = req.query as any
    const where: any = { appId: aid, tenantId: r.tenantId }
    if (level) where.level = level
    if (text) where.message = { contains: text, mode: 'insensitive' }
    const logs = await prisma.devLogEntry.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })
    return { logs, total: logs.length }
  })

  // T12: run test suite (simulation)
  app.post('/apps/:aid/test-runs', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const { suiteName = 'default', testCount = 10 } = req.body as any
    const app_ = await prisma.devApp.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId } })
    const total = Math.min(testCount, 100)
    const failed = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0
    const passed = total - failed
    const results = Array.from({ length: total }, (_, i) => ({ name: `${suiteName} test ${i + 1}`, status: i < passed ? 'passed' : 'failed', ms: Math.floor(Math.random() * 200) }))
    const run = await prisma.devTestRun.create({
      data: {
        tenantId: r.tenantId, appId: aid, suiteName, status: failed > 0 ? 'failed' : 'passed',
        totalTests: total, passedTests: passed, failedTests: failed,
        durationMs: results.reduce((s, t) => s + t.ms, 0), results: results as never, finishedAt: new Date(),
      },
    })
    await logActivity(r.tenantId, app_.name, r.userId, 'tests.run', `${passed}/${total} passed`)
    return run
  })

  // T13: list test runs
  app.get('/apps/:aid/test-runs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const runs = await prisma.devTestRun.findMany({
      where: { appId: aid, tenantId: r.tenantId }, orderBy: { startedAt: 'desc' }, take: 50,
      select: { id: true, suiteName: true, status: true, totalTests: true, passedTests: true, failedTests: true, durationMs: true, startedAt: true },
    })
    return { runs, total: runs.length }
  })

  // T14: get test run details
  app.get('/test-runs/:trid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { trid } = req.params as any
    return prisma.devTestRun.findFirstOrThrow({ where: { id: trid, tenantId: r.tenantId } })
  })

  // T15: set env var (sealed at rest)
  app.post('/apps/:aid/env', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const { key, value, isSecret = false, environment = 'development' } = req.body as any
    const app_ = await prisma.devApp.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId } })
    const envVar = await prisma.devEnvVar.upsert({
      where: { appId_environment_key: { appId: aid, environment, key } },
      update: { valueSealed: seal(value), isSecret },
      create: { tenantId: r.tenantId, appId: aid, key, valueSealed: seal(value), isSecret, environment },
    })
    await logActivity(r.tenantId, app_.name, r.userId, 'env.set', `${environment}/${key}`)
    return { id: envVar.id, key, environment, isSecret }
  })

  // T16: list env vars (secrets masked — golden rule)
  app.get('/apps/:aid/env', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { environment } = req.query as any
    const where: any = { appId: aid, tenantId: r.tenantId }
    if (environment) where.environment = environment
    const vars = await prisma.devEnvVar.findMany({ where })
    return {
      vars: vars.map(v => ({ id: v.id, key: v.key, environment: v.environment, isSecret: v.isSecret, value: v.isSecret ? '••••••••' : unseal(v.valueSealed) })),
      total: vars.length,
    }
  })

  // T17: reveal secret env var (audited)
  app.post('/env/:evid/reveal', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { evid } = req.params as any
    const v = await prisma.devEnvVar.findFirstOrThrow({ where: { id: evid, tenantId: r.tenantId } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'REVEAL_ENV_VAR', module: 'dev-console', entityType: 'DevEnvVar', entityId: evid, newValues: { key: v.key, environment: v.environment } as never } as never }).catch(() => null)
    return { key: v.key, value: unseal(v.valueSealed) }
  })

  // T18: activity feed
  app.get('/activity', async (req) => {
    const r = req as unknown as { tenantId: string }
    const activities = await prisma.devActivity.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { activities, total: activities.length }
  })

  // T19: API playground (simulated request execution)
  app.post('/playground/execute', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { method = 'GET', path = '/v1/users', body } = req.body as any
    await logActivity(r.tenantId, 'playground', r.userId, 'playground.execute', `${method} ${path}`)
    return {
      request: { method, path, body },
      response: { statusCode: 200, latencyMs: Math.floor(Math.random() * 100) + 10, body: { success: true, note: 'Simulated playground response', echo: { method, path } } },
    }
  })

  // T20: app health dashboard
  app.get('/apps/:aid/health', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const [errors, lastRun, sandboxes] = await Promise.all([
      prisma.devLogEntry.count({ where: { appId: aid, tenantId: r.tenantId, level: 'error', createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.devTestRun.findFirst({ where: { appId: aid, tenantId: r.tenantId }, orderBy: { startedAt: 'desc' } }),
      prisma.devSandbox.count({ where: { appId: aid, tenantId: r.tenantId, status: 'running' } }),
    ])
    const health = errors > 10 ? 'unhealthy' : errors > 0 ? 'degraded' : 'healthy'
    return { health, errorsLast24h: errors, lastTestStatus: lastRun?.status ?? 'never-run', runningSandboxes: sandboxes }
  })

  // T21: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [apps, sandboxes, logs, runs, envVars, activities] = await Promise.all([
      prisma.devApp.count({ where: { tenantId: r.tenantId } }),
      prisma.devSandbox.count({ where: { tenantId: r.tenantId } }),
      prisma.devLogEntry.count({ where: { tenantId: r.tenantId } }),
      prisma.devTestRun.count({ where: { tenantId: r.tenantId } }),
      prisma.devEnvVar.count({ where: { tenantId: r.tenantId } }),
      prisma.devActivity.count({ where: { tenantId: r.tenantId } }),
    ])
    return { apps, sandboxes, logEntries: logs, testRuns: runs, envVars, activities }
  })

  // T22: promote app (development → testing → staging-ready → production)
  app.post('/apps/:aid/promote', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const chain = ['development', 'testing', 'staging-ready', 'production']
    const app_ = await prisma.devApp.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId } })
    const idx = chain.indexOf(app_.status)
    if (idx < 0 || idx === chain.length - 1) return { error: 'cannot promote from ' + app_.status }
    if (chain[idx + 1] === 'production') {
      const lastRun = await prisma.devTestRun.findFirst({ where: { appId: aid }, orderBy: { startedAt: 'desc' } })
      if (!lastRun || lastRun.status !== 'passed') return { error: 'latest test run must pass before production promotion' }
    }
    const updated = await prisma.devApp.update({ where: { id: aid }, data: { status: chain[idx + 1] } })
    await logActivity(r.tenantId, app_.name, r.userId, 'app.promoted', chain[idx + 1])
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'PROMOTE', module: 'dev-console', entityType: 'DevApp', entityId: aid, newValues: { status: chain[idx + 1] } as never } as never }).catch(() => null)
    return updated
  })

  // T23: simulate app logs
  app.post('/apps/:aid/simulate-logs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { count = 10 } = req.body as any
    const levels = ['debug', 'info', 'info', 'info', 'warn', 'error']
    let created = 0
    for (let i = 0; i < Math.min(count, 50); i++) {
      const level = levels[Math.floor(Math.random() * levels.length)]
      await prisma.devLogEntry.create({
        data: { tenantId: r.tenantId, appId: aid, level, message: `Simulated ${level} log #${i + 1}`, context: { simulated: true } as never },
      })
      created++
    }
    return { created }
  })

  // T24: clear logs
  app.post('/apps/:aid/logs/clear', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const result = await prisma.devLogEntry.deleteMany({ where: { appId: aid, tenantId: r.tenantId } })
    return { success: true, cleared: result.count }
  })

  // T25: delete env var
  app.delete('/env/:evid', async (req) => {
    const { evid } = req.params as any
    await prisma.devEnvVar.delete({ where: { id: evid } })
    return { success: true }
  })

  // T26: delete sandbox
  app.delete('/sandboxes/:sbid', async (req) => {
    const { sbid } = req.params as any
    await prisma.devSandbox.delete({ where: { id: sbid } })
    return { success: true }
  })

  // T27: archive app
  app.post('/apps/:aid/archive', async (req) => {
    const { aid } = req.params as any
    return prisma.devApp.update({ where: { id: aid }, data: { status: 'archived' } })
  })

  // T28: delete app
  app.delete('/apps/:aid', async (req) => {
    const { aid } = req.params as any
    await prisma.devApp.delete({ where: { id: aid } })
    return { success: true }
  })
}
