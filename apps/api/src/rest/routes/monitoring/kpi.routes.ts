import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { registry } from '../../../observability/metrics.js'

export async function kpiRoutes(app: FastifyInstance) {
  // GET /v1/monitoring/kpi — live business KPIs from real data
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const tenantId = request.tenantId
    const now = new Date()
    const last24h = new Date(now.getTime() - 86400000)
    const last7d = new Date(now.getTime() - 7 * 86400000)

    const [
      totalUsers, activeUsers, newUsersLast24h,
      totalSessions, activeSessions,
      totalEmployees,
      totalContacts, newContactsLast7d,
      auditLogsLast24h,
      pendingJobs, failedJobs,
      openIncidents,
      loginAttempts, failedLogins,
    ] = await Promise.all([
      prisma.coreUser.count({ where: { tenantId, deletedAt: null } }),
      prisma.coreUser.count({ where: { tenantId, deletedAt: null, status: 'active' } }),
      prisma.coreUser.count({ where: { tenantId, deletedAt: null, createdAt: { gte: last24h } } }),
      prisma.coreSession.count({ where: { tenantId, deletedAt: null } }),
      prisma.coreSession.count({ where: { tenantId, isActive: true, revokedAt: null, expiresAt: { gt: now } } }),
      prisma.hrEmployee.count({ where: { tenantId, deletedAt: null } }),
      prisma.crmContact.count({ where: { tenantId, deletedAt: null } }),
      prisma.crmContact.count({ where: { tenantId, deletedAt: null, createdAt: { gte: last7d } } }),
      prisma.sysAuditLog.count({ where: { tenantId, occurredAt: { gte: last24h } } }),
      prisma.sysJob.count({ where: { tenantId, status: 'pending', deletedAt: null } }),
      prisma.sysJob.count({ where: { tenantId, status: 'failed', deletedAt: null, createdAt: { gte: last24h } } }),
      prisma.obsIncident.count({ where: { tenantId, status: 'open', deletedAt: null } }),
      prisma.secLoginAttempt.count({ where: { tenantId, createdAt: { gte: last24h } } }),
      prisma.secLoginAttempt.count({ where: { tenantId, success: false, createdAt: { gte: last24h } } }),
    ])

    const loginSuccessRate = loginAttempts > 0
      ? Math.round(((loginAttempts - failedLogins) / loginAttempts) * 100)
      : 100

    // Take a snapshot for historical trending
    const snapshot = {
      totalUsers, activeUsers, newUsersLast24h,
      totalSessions, activeSessions,
      totalEmployees, totalContacts, newContactsLast7d,
      auditLogsLast24h, pendingJobs, failedJobs,
      openIncidents, loginSuccessRate,
    }

    await prisma.obsMetricSnapshot.create({
      data: { tenantId, period: '5m', metrics: snapshot as object },
    }).catch(() => {}) // non-fatal

    return reply.send(buildSuccessResponse({
      tenantId,
      collectedAt: now.toISOString(),
      users: { total: totalUsers, active: activeUsers, newLast24h: newUsersLast24h },
      sessions: { total: totalSessions, active: activeSessions },
      hr: { totalEmployees },
      crm: { totalContacts, newLast7d: newContactsLast7d },
      operations: { auditLogsLast24h, pendingJobs, failedJobsLast24h: failedJobs },
      security: { openIncidents, loginSuccessRatePct: loginSuccessRate, loginAttemptsLast24h: loginAttempts, failedLoginsLast24h: failedLogins },
    }))
  })

  // GET /v1/monitoring/kpi/history — metric snapshots for trend charts
  app.get('/history', { preHandler: [requireAuth] }, async (request, reply) => {
    const { limit = '60' } = request.query as { limit?: string }
    const snapshots = await prisma.obsMetricSnapshot.findMany({
      where: { tenantId: request.tenantId },
      orderBy: { snapshotAt: 'desc' },
      take: Math.min(parseInt(limit), 200),
      select: { snapshotAt: true, period: true, metrics: true },
    })
    return reply.send(buildSuccessResponse(snapshots.reverse()))
  })

  // GET /v1/monitoring/kpi/prometheus — current Prometheus metric values as JSON
  app.get('/prometheus', { preHandler: [requireAuth] }, async (_request, reply) => {
    const metricsJson = await registry.getMetricsAsJSON()
    return reply.send(buildSuccessResponse(metricsJson))
  })
}
