import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
      totalContacts,
      newLeadsThisMonth,
      totalCompanies,
      openOpportunities,
      wonThisMonth,
      lostThisMonth,
      activitiesThisMonth,
      overdueActivities,
      contactsByType,
      opportunitiesByStage,
      recentActivities,
      topOpportunities,
      pipelineValue,
    ] = await Promise.all([
      prisma.crmContact.count({ where: { tenantId, deletedAt: null } }),
      prisma.crmContact.count({ where: { tenantId, deletedAt: null, contactType: 'lead', createdAt: { gte: startOfMonth } } }),
      prisma.crmCompany.count({ where: { tenantId, deletedAt: null } }),
      prisma.crmOpportunity.count({ where: { tenantId, deletedAt: null, status: 'open' } }),
      prisma.crmOpportunity.aggregate({
        where: { tenantId, deletedAt: null, status: 'won', actualCloseDate: { gte: startOfMonth } },
        _sum: { value: true },
        _count: true,
      }),
      prisma.crmOpportunity.count({ where: { tenantId, deletedAt: null, status: 'lost', actualCloseDate: { gte: startOfMonth } } }),
      prisma.crmActivity.count({ where: { tenantId, deletedAt: null, createdAt: { gte: startOfMonth } } }),
      prisma.crmActivity.count({
        where: {
          tenantId,
          deletedAt: null,
          status: 'scheduled',
          scheduledAt: { lt: now },
        },
      }),
      prisma.crmContact.groupBy({
        by: ['contactType'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      prisma.crmOpportunity.groupBy({
        by: ['stageId'],
        where: { tenantId, deletedAt: null, status: 'open' },
        _count: { id: true },
        _sum: { value: true },
      }),
      prisma.crmActivity.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          opportunity: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.crmOpportunity.findMany({
        where: { tenantId, deletedAt: null, status: 'open' },
        include: {
          stage: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { value: 'desc' },
        take: 5,
      }),
      prisma.crmOpportunity.aggregate({
        where: { tenantId, deletedAt: null, status: 'open' },
        _sum: { value: true },
      }),
    ])

    // Resolve stage names for grouped opportunities
    const stageIds = opportunitiesByStage.map(s => s.stageId)
    const stages = stageIds.length > 0 ? await prisma.crmPipelineStage.findMany({
      where: { id: { in: stageIds } },
      select: { id: true, name: true, color: true },
    }) : []
    const stageMap = Object.fromEntries(stages.map(s => [s.id, s]))

    const stageBreakdown = opportunitiesByStage.map(g => ({
      stageId: g.stageId,
      stageName: stageMap[g.stageId]?.name ?? 'Unknown',
      stageColor: stageMap[g.stageId]?.color ?? '#6366f1',
      count: g._count.id,
      totalValue: Number(g._sum.value ?? 0),
    }))

    const winRate = (wonThisMonth._count + lostThisMonth) > 0
      ? Math.round((wonThisMonth._count / (wonThisMonth._count + lostThisMonth)) * 100)
      : 0

    return reply.send({
      success: true,
      data: {
        kpis: {
          totalContacts,
          newLeadsThisMonth,
          totalCompanies,
          openOpportunities,
          wonThisMonth: { count: wonThisMonth._count, value: Number(wonThisMonth._sum.value ?? 0) },
          lostThisMonth,
          activitiesThisMonth,
          overdueActivities,
          pipelineValue: Number(pipelineValue._sum.value ?? 0),
          winRate,
        },
        contactsByType: contactsByType.map(g => ({ type: g.contactType, count: g._count.id })),
        stageBreakdown,
        recentActivities,
        topOpportunities,
      },
    })
  })

  // GET /dashboard/sales-trend?months=6
  app.get('/sales-trend', async (req, reply) => {
    const { tenantId } = req as any
    const months = parseInt((req.query as any).months ?? '6')
    const trend: Array<{ month: string; won: number; lost: number; revenue: number }> = []

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

      const [won, lost] = await Promise.all([
        prisma.crmOpportunity.aggregate({
          where: { tenantId, deletedAt: null, status: 'won', actualCloseDate: { gte: start, lte: end } },
          _count: true,
          _sum: { value: true },
        }),
        prisma.crmOpportunity.count({
          where: { tenantId, deletedAt: null, status: 'lost', actualCloseDate: { gte: start, lte: end } },
        }),
      ])

      trend.push({
        month: start.toLocaleString('en', { month: 'short', year: 'numeric' }),
        won: won._count,
        lost,
        revenue: Number(won._sum.value ?? 0),
      })
    }

    return reply.send({ success: true, data: trend })
  })
}
