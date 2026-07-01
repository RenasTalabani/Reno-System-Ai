// Phase 55 — AI Platform Command Center: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  PLATFORM_MODULES, runHealthCheck, gatherPlatformMetrics,
  generateAlerts, generateInsights, generateCommandCenterSummary,
} from './ai-engine.js'

export async function pccRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Master Dashboard ───────────────────────────────────────────────────────
  app.get('/overview', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }

    // Gather metrics
    const metrics = await gatherPlatformMetrics(prisma as never, tenantId)

    // Run health checks on all modules
    const healthChecks = PLATFORM_MODULES.map(m => runHealthCheck(m.id))
    metrics.modules.healthyModules = healthChecks.filter(h => h.status === 'healthy').length
    metrics.modules.degradedModules = healthChecks.filter(h => h.status === 'degraded').length
    metrics.modules.downModules = healthChecks.filter(h => h.status === 'down').length

    // Get active alerts
    const activeAlerts = await prisma.pccAlert.count({ where: { tenantId, isResolved: false } })

    // Generate new alerts from current state
    const suggestedAlerts = generateAlerts(metrics, healthChecks)

    // Generate insights
    const insights = generateInsights(metrics)

    // Recent alerts
    const recentAlerts = await prisma.pccAlert.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10,
    })

    // Latest metric snapshot
    const latestSnapshot = await prisma.pccMetricSnapshot.findFirst({
      where: { tenantId }, orderBy: { capturedAt: 'desc' },
    })

    const summary = generateCommandCenterSummary(
      metrics.aiScore, metrics.trend, activeAlerts,
      metrics.modules.healthyModules, metrics.modules.totalModules,
    )

    return {
      summary, metrics, healthChecks, suggestedAlerts, insights,
      recentAlerts, activeAlertCount: activeAlerts, latestSnapshot,
      modules: PLATFORM_MODULES,
    }
  })

  // ── Health Checks ──────────────────────────────────────────────────────────
  app.get('/health', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const checks = PLATFORM_MODULES.map(m => runHealthCheck(m.id))
    const healthy = checks.filter(h => h.status === 'healthy').length
    return { checks, summary: { healthy, degraded: checks.filter(h => h.status === 'degraded').length, down: checks.filter(h => h.status === 'down').length }, overallStatus: healthy === checks.length ? 'healthy' : healthy > checks.length * 0.8 ? 'degraded' : 'critical' }
  })

  app.post('/health/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const checks = PLATFORM_MODULES.map(m => runHealthCheck(m.id))

    // Persist health checks
    await prisma.pccHealthCheck.createMany({
      data: checks.map(c => ({
        tenantId, module: c.module, status: c.status, responseMs: c.responseMs, details: c.details as never,
      })),
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'health_check', module: 'pcc', entityType: 'platform', entityId: tenantId, newValues: { modules: checks.length } as never } }).catch(() => null)
    return { checks, ran: checks.length }
  })

  app.get('/health/history', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { module?: string }
    const history = await prisma.pccHealthCheck.findMany({
      where: { tenantId, ...(q.module && { module: q.module }) },
      orderBy: { checkedAt: 'desc' }, take: 100,
    })
    return { history }
  })

  // ── Alerts ─────────────────────────────────────────────────────────────────
  app.get('/alerts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { severity?: string; module?: string; resolved?: string }
    const alerts = await prisma.pccAlert.findMany({
      where: {
        tenantId,
        ...(q.severity && { severity: q.severity }),
        ...(q.module && { module: q.module }),
        ...(q.resolved !== undefined && { isResolved: q.resolved === 'true' }),
      },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    const counts = await prisma.pccAlert.groupBy({ by: ['severity'], where: { tenantId, isResolved: false }, _count: true })
    return { alerts, severityCounts: counts.reduce((a, c) => ({ ...a, [c.severity]: c._count }), {} as Record<string, number>) }
  })

  app.post('/alerts', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { module: string; alertType: string; severity?: string; title: string; message: string; metadata?: Record<string, unknown> }
    const alert = await prisma.pccAlert.create({
      data: { tenantId, module: body.module, alertType: body.alertType, severity: body.severity ?? 'info', title: body.title, message: body.message, metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'pcc', entityType: 'alert', entityId: alert.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(alert)
  })

  // Generate alerts from current platform state
  app.post('/alerts/generate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const metrics = await gatherPlatformMetrics(prisma as never, tenantId)
    const healthChecks = PLATFORM_MODULES.map(m => runHealthCheck(m.id))
    const suggested = generateAlerts(metrics, healthChecks)

    const created = await Promise.all(suggested.map(a =>
      prisma.pccAlert.create({ data: { tenantId, module: a.module, alertType: a.alertType, severity: a.severity, title: a.title, message: a.message, metadata: a.metadata as never } })
    ))

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'generate_alerts', module: 'pcc', entityType: 'platform', entityId: tenantId, newValues: { count: created.length } as never } }).catch(() => null)
    return { generated: created.length, alerts: created }
  })

  app.patch('/alerts/:id/read', async (req) => {
    const { id } = req.params as { id: string }
    const alert = await prisma.pccAlert.update({ where: { id }, data: { isRead: true } })
    return alert
  })

  app.patch('/alerts/:id/resolve', async (req) => {
    const { userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const alert = await prisma.pccAlert.update({ where: { id }, data: { isResolved: true, resolvedAt: new Date(), resolvedBy: userId } })
    return alert
  })

  app.delete('/alerts/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.pccAlert.delete({ where: { id } })
    return { success: true }
  })

  // ── Metrics Snapshots ──────────────────────────────────────────────────────
  app.get('/metrics', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const snapshots = await prisma.pccMetricSnapshot.findMany({
      where: { tenantId }, orderBy: { capturedAt: 'desc' }, take: 30,
    })
    return { snapshots }
  })

  app.post('/metrics/capture', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = (req.body ?? {}) as { period?: string }
    const metrics = await gatherPlatformMetrics(prisma as never, tenantId)
    const period = body.period ?? 'hourly'

    const capturedAt = new Date()
    capturedAt.setMinutes(0, 0, 0)

    const snapshot = await prisma.pccMetricSnapshot.upsert({
      where: { tenantId_period_capturedAt: { tenantId, period, capturedAt } },
      create: {
        tenantId, period, capturedAt, metrics: metrics as never,
        aiScore: metrics.aiScore, trend: metrics.trend,
        notes: `Captured ${new Date().toISOString()}`,
      },
      update: { metrics: metrics as never, aiScore: metrics.aiScore, trend: metrics.trend },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'capture_metrics', module: 'pcc', entityType: 'snapshot', entityId: snapshot.id, newValues: { aiScore: metrics.aiScore } as never } }).catch(() => null)
    return { snapshot, aiScore: metrics.aiScore, trend: metrics.trend }
  })

  // ── Insights ───────────────────────────────────────────────────────────────
  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const metrics = await gatherPlatformMetrics(prisma as never, tenantId)
    const insights = generateInsights(metrics)
    return { insights, metrics }
  })

  // ── Module Registry ────────────────────────────────────────────────────────
  app.get('/modules', async () => ({ modules: PLATFORM_MODULES }))
}
