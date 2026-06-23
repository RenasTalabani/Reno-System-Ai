import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function brainDashboardRoutes(app: FastifyInstance) {
  // GET /brain/dashboard — AI usage dashboard
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const last7 = new Date(now.getTime() - 7 * 86400000)
    const last30 = new Date(now.getTime() - 30 * 86400000)

    const [
      tenant,
      usageThisMonth,
      usageByAgent,
      recentConversations,
      pendingActions,
      totalConversations,
      activeAgentCount,
      recentAuditLogs,
      providerConfig,
    ] = await Promise.all([
      prisma.coreTenant.findUnique({ where: { id: tenantId }, select: { aiMonthlyTokenQuota: true } }),
      prisma.aiUsageLog.aggregate({
        where: { tenantId, occurredAt: { gte: thisMonthStart }, status: 'success' },
        _sum: { totalTokens: true, estimatedCostUsd: true },
        _count: true,
      }),
      prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where: { tenantId, occurredAt: { gte: last30 }, status: 'success' },
        _sum: { totalTokens: true },
        _count: true,
        orderBy: { _sum: { totalTokens: 'desc' } },
        take: 9,
      }),
      prisma.brainConversation.findMany({
        where: { tenantId, status: 'active', lastMessageAt: { gte: last7 } },
        include: { agent: { select: { name: true, slug: true, iconName: true, color: true } } },
        orderBy: { lastMessageAt: 'desc' },
        take: 5,
      }),
      prisma.brainAction.count({ where: { tenantId, status: 'pending' } }),
      prisma.brainConversation.count({ where: { tenantId, status: { not: 'deleted' } } }),
      prisma.brainAgent.count({ where: { OR: [{ tenantId }, { isSystem: true }], isActive: true } }),
      prisma.brainAuditLog.findMany({
        where: { tenantId },
        orderBy: { occurredAt: 'desc' },
        take: 10,
      }),
      prisma.brainProviderConfig.findFirst({
        where: { tenantId, isDefault: true, isActive: true },
        select: { provider: true, model: true, name: true, apiKey: false },
      }),
    ])

    const tokensUsed = usageThisMonth._sum.totalTokens ?? 0
    const quota = tenant?.aiMonthlyTokenQuota ?? null
    const costUsd = Number(usageThisMonth._sum.estimatedCostUsd ?? 0)

    return reply.send({
      success: true,
      data: {
        usage: {
          tokensThisMonth: tokensUsed,
          quota,
          quotaUsedPercent: quota ? Math.round((tokensUsed / quota) * 100) : null,
          requestsThisMonth: usageThisMonth._count,
          estimatedCostUsd: costUsd.toFixed(4),
        },
        byAgent: usageByAgent.map(u => ({
          agent: u.feature.replace('agent:', ''),
          tokens: u._sum.totalTokens ?? 0,
          requests: u._count,
        })),
        recentConversations,
        pendingActions,
        totalConversations,
        activeAgentCount,
        recentAuditLogs,
        provider: providerConfig
          ? { provider: providerConfig.provider, model: providerConfig.model, name: providerConfig.name, configured: true }
          : { provider: 'mock', model: 'demo', name: 'Demo Mode', configured: false },
      },
    })
  })

  // GET /brain/dashboard/audit — AI audit logs
  app.get('/audit', async (req, reply) => {
    const { tenantId } = req as any
    const { agentId, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (agentId) where.agentId = agentId

    const [items, total] = await Promise.all([
      prisma.brainAuditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.brainAuditLog.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })
}
