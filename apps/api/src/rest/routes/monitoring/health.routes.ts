import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { registry } from '../../../observability/metrics.js'
import { collectKpis } from '../../../observability/kpi-collector.js'

export async function healthRoutes(app: FastifyInstance) {
  // GET /v1/monitoring/health/platform — overall platform health
  app.get('/platform', { preHandler: [requireAuth] }, async (_request, reply) => {
    const [dbOk, redisOk, metricsText] = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`.then(() => true),
      // Redis is optional — graceful degradation
      import('../../../cache/index.js').then(m => m.cacheGet('__health__').then(() => true)).catch(() => false),
      registry.metrics(),
    ])

    const memUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Parse a few key metrics from the registry output for the summary
    const metricsOutput = metricsText.status === 'fulfilled' ? metricsText.value : ''
    const requestRateMatch = metricsOutput.match(/reno_http_requests_total\{[^}]*\}\s+([\d.]+)/g)
    const totalRequests = requestRateMatch
      ? requestRateMatch.reduce((sum, m) => sum + parseFloat(m.split(' ')[1] ?? '0'), 0)
      : 0

    const services = {
      api: { status: 'healthy', uptime: Math.round(uptime) },
      database: { status: dbOk.status === 'fulfilled' && dbOk.value ? 'healthy' : 'degraded' },
      cache: { status: redisOk.status === 'fulfilled' && redisOk.value ? 'healthy' : 'degraded' },
    }

    const allHealthy = Object.values(services).every(s => s.status === 'healthy')
    const overallStatus = allHealthy ? 'healthy' : 'degraded'

    return reply.send(buildSuccessResponse({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      process: {
        uptime: Math.round(uptime),
        memoryMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMb: Math.round(memUsage.rss / 1024 / 1024),
      },
      metrics: {
        totalRequestsServed: Math.round(totalRequests),
      },
    }))
  })

  // GET /v1/monitoring/health/tenants — per-tenant health scores (real data)
  app.get('/tenants', { preHandler: [requireAuth] }, async (_request, reply) => {
    const tenants = await prisma.coreTenant.findMany({
      where: { deletedAt: null, status: 'active' },
      select: { id: true, name: true, slug: true },
    })

    const tenantHealth = await Promise.all(
      tenants.map(async (tenant) => {
        const [users, sessions, failedLogins, incidents, jobs] = await Promise.all([
          prisma.coreUser.count({ where: { tenantId: tenant.id, deletedAt: null, status: 'active' } }),
          prisma.coreSession.count({ where: { tenantId: tenant.id, isActive: true, revokedAt: null, expiresAt: { gt: new Date() } } }),
          prisma.secLoginAttempt.count({ where: { tenantId: tenant.id, success: false, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } }),
          prisma.obsIncident.count({ where: { tenantId: tenant.id, status: 'open' } }),
          prisma.sysJob.count({ where: { tenantId: tenant.id, status: 'failed', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        ])

        // Health score: start at 100, deduct for issues
        let score = 100
        if (failedLogins > 20) score -= 15
        else if (failedLogins > 5) score -= 5
        if (incidents > 0) score -= incidents * 10
        if (jobs > 10) score -= 10
        score = Math.max(0, score)

        return {
          tenantId: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          healthScore: score,
          status: score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical',
          metrics: { activeUsers: users, activeSessions: sessions, failedLoginsLastHour: failedLogins, openIncidents: incidents, failedJobsLast24h: jobs },
        }
      }),
    )

    return reply.send(buildSuccessResponse({
      tenants: tenantHealth.sort((a, b) => a.healthScore - b.healthScore),
      summary: {
        total: tenantHealth.length,
        healthy: tenantHealth.filter(t => t.status === 'healthy').length,
        degraded: tenantHealth.filter(t => t.status === 'degraded').length,
        critical: tenantHealth.filter(t => t.status === 'critical').length,
      },
    }))
  })

  // GET /v1/monitoring/health/dependencies — service dependency map
  app.get('/dependencies', { preHandler: [requireAuth] }, async (_request, reply) => {
    const [dbLatency, redisLatency] = await Promise.all([
      (async () => {
        const start = Date.now()
        await prisma.$queryRaw`SELECT 1`
        return Date.now() - start
      })(),
      (async () => {
        const start = Date.now()
        const { cacheGet } = await import('../../../cache/index.js')
        await cacheGet('__dep_check__').catch(() => null)
        return Date.now() - start
      })(),
    ])

    const dependencies = [
      { from: 'reno-api', to: 'postgresql', type: 'database', latencyMs: dbLatency, healthy: dbLatency < 1000 },
      { from: 'reno-api', to: 'redis', type: 'cache', latencyMs: redisLatency, healthy: redisLatency < 500 },
      { from: 'reno-api', to: 'minio', type: 'object-storage', latencyMs: null, healthy: true },
      { from: 'reno-web', to: 'reno-api', type: 'http', latencyMs: null, healthy: true },
      { from: 'reno-mobile', to: 'reno-api', type: 'http', latencyMs: null, healthy: true },
    ]

    return reply.send(buildSuccessResponse({ dependencies, checkedAt: new Date().toISOString() }))
  })

  // POST /v1/monitoring/health/kpi/refresh — force KPI collection
  app.post('/kpi/refresh', { preHandler: [requireAuth] }, async (_request, reply) => {
    await collectKpis()
    return reply.send(buildSuccessResponse({ refreshed: true }))
  })

  // POST /v1/monitoring/health/web-vitals — receive Core Web Vitals from Next.js frontend
  app.post('/web-vitals', async (request, reply) => {
    const body = request.body as {
      name?: string; value?: number; rating?: string; delta?: number;
      id?: string; navigationType?: string; url?: string; timestamp?: string;
    }
    // Non-blocking fire-and-forget storage
    prisma.sysAuditLog.create({
      data: {
        tenantId: null as unknown as string,
        userId: null as unknown as string,
        action: 'web_vital',
        module: 'frontend',
        entityType: 'web_vital',
        entityId: null,
        metadata: body as object,
      },
    }).catch(() => {})
    return reply.status(204).send()
  })

  // POST /v1/monitoring/health/mobile-crash — receive Flutter crash reports
  app.post('/mobile-crash', async (request, reply) => {
    const body = request.body as {
      error?: string; stackTrace?: string; context?: string;
      fatal?: boolean; appVersion?: string; device?: object; timestamp?: string;
    }
    prisma.sysAuditLog.create({
      data: {
        tenantId: null as unknown as string,
        userId: null as unknown as string,
        action: 'mobile_crash',
        module: 'mobile',
        entityType: 'crash_report',
        entityId: null,
        metadata: body as object,
      },
    }).catch(() => {})
    return reply.status(204).send()
  })
}
