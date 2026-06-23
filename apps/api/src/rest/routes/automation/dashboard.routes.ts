import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { SYSTEM_EVENTS } from '../../../automation/events.js'

export async function autoDashboardRoutes(app: FastifyInstance) {
  // GET /automation/dashboard
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const now = new Date()
    const last7 = new Date(now.getTime() - 7 * 86400000)
    const last30 = new Date(now.getTime() - 30 * 86400000)

    const [
      totalWorkflows,
      enabledWorkflows,
      pendingApprovals,
      recentExecutions,
      executionStats,
      executions7d,
      topWorkflows,
    ] = await Promise.all([
      prisma.autoWorkflow.count({ where: { tenantId, deletedAt: null } }),
      prisma.autoWorkflow.count({ where: { tenantId, isEnabled: true, deletedAt: null } }),
      prisma.autoApprovalGate.count({ where: { tenantId, status: 'pending' } }),
      prisma.autoExecution.findMany({
        where: { tenantId, startedAt: { gte: last7 } },
        orderBy: { startedAt: 'desc' },
        take: 8,
        include: { workflow: { select: { name: true, category: true } } },
      }),
      prisma.autoExecution.groupBy({
        by: ['status'],
        where: { tenantId, startedAt: { gte: last30 } },
        _count: true,
      }),
      prisma.autoExecution.count({ where: { tenantId, startedAt: { gte: last7 } } }),
      prisma.autoWorkflow.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { totalRuns: 'desc' },
        take: 5,
        select: { id: true, name: true, totalRuns: true, successRuns: true, failedRuns: true, lastRunStatus: true, isEnabled: true },
      }),
    ])

    const statusCounts: Record<string, number> = {}
    for (const s of executionStats) statusCounts[s.status] = s._count

    return reply.send({
      success: true,
      data: {
        summary: {
          totalWorkflows,
          enabledWorkflows,
          pendingApprovals,
          executions7d,
          totalEventTypes: Object.keys(SYSTEM_EVENTS).length,
        },
        statusBreakdown: statusCounts,
        recentExecutions,
        topWorkflows,
      },
    })
  })
}
