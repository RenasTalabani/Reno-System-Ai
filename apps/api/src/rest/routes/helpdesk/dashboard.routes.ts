import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function sdDashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /helpdesk/dashboard
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const from = q.from ? new Date(q.from) : new Date(Date.now() - 30 * 86400000)
    const to = q.to ? new Date(q.to) : new Date()

    const [
      totalOpen, totalInProgress, totalWaiting, totalResolved, totalClosed,
      totalSlaBreached, createdToday, resolvedToday,
      byPriority, byCategory, bySource, recentTickets, avgCsat,
    ] = await Promise.all([
      prisma.sdTicket.count({ where: { tenantId, status: 'open', deletedAt: null } }),
      prisma.sdTicket.count({ where: { tenantId, status: 'in_progress', deletedAt: null } }),
      prisma.sdTicket.count({ where: { tenantId, status: 'waiting', deletedAt: null } }),
      prisma.sdTicket.count({ where: { tenantId, status: 'resolved', deletedAt: null } }),
      prisma.sdTicket.count({ where: { tenantId, status: 'closed', deletedAt: null } }),
      prisma.sdTicket.count({ where: { tenantId, slaBreached: true, deletedAt: null } }),
      prisma.sdTicket.count({
        where: { tenantId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, deletedAt: null },
      }),
      prisma.sdTicket.count({
        where: { tenantId, resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, deletedAt: null },
      }),
      prisma.sdTicket.groupBy({
        by: ['priority'],
        where: { tenantId, deletedAt: null, status: { in: ['open', 'in_progress'] } },
        _count: { priority: true },
      }),
      prisma.sdTicket.groupBy({
        by: ['categoryId'],
        where: { tenantId, deletedAt: null, createdAt: { gte: from, lte: to } },
        _count: { categoryId: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 10,
      }),
      prisma.sdTicket.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null, createdAt: { gte: from, lte: to } },
        _count: { source: true },
      }),
      prisma.sdTicket.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          category: { select: { id: true, name: true, color: true } },
          agent: { select: { id: true, displayName: true } },
        },
      }),
      prisma.sdCsat.aggregate({
        where: { tenantId, createdAt: { gte: from, lte: to } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ])

    return reply.send(buildSuccessResponse({
      summary: {
        totalOpen, totalInProgress, totalWaiting, totalResolved, totalClosed,
        totalActive: totalOpen + totalInProgress + totalWaiting,
        totalSlaBreached, createdToday, resolvedToday,
      },
      byPriority: byPriority.reduce((acc: Record<string, number>, r) => {
        acc[r.priority] = r._count.priority
        return acc
      }, {}),
      byCategory: byCategory.map(r => ({ categoryId: r.categoryId, count: r._count.categoryId })),
      bySource: bySource.reduce((acc: Record<string, number>, r) => {
        acc[r.source] = r._count.source
        return acc
      }, {}),
      csat: {
        average: avgCsat._avg.rating ? Math.round((avgCsat._avg.rating ?? 0) * 10) / 10 : null,
        responses: avgCsat._count.rating,
      },
      recentTickets,
    }))
  })

  // GET /helpdesk/dashboard/sla-breaches
  app.get('/sla-breaches', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(50, parseInt(q.limit ?? '20'))

    const now = new Date()

    const [total, breached] = await Promise.all([
      prisma.sdTicket.count({
        where: {
          tenantId, deletedAt: null,
          status: { notIn: ['resolved', 'closed', 'cancelled'] },
          OR: [
            { resolutionDue: { lt: now }, slaBreached: false },
            { slaBreached: true },
          ],
        },
      }),
      prisma.sdTicket.findMany({
        where: {
          tenantId, deletedAt: null,
          status: { notIn: ['resolved', 'closed', 'cancelled'] },
          OR: [
            { resolutionDue: { lt: now }, slaBreached: false },
            { slaBreached: true },
          ],
        },
        orderBy: { resolutionDue: 'asc' },
        skip: (page - 1) * limit, take: limit,
        include: {
          category: { select: { id: true, name: true } },
          agent: { select: { id: true, displayName: true } },
          slaPolicy: { select: { id: true, name: true, resolutionMinutes: true } },
        },
      }),
    ])

    // Mark breached tickets
    const breachedIds = breached.filter(t => t.resolutionDue && t.resolutionDue < now && !t.slaBreached).map(t => t.id)
    if (breachedIds.length > 0) {
      await prisma.sdTicket.updateMany({
        where: { id: { in: breachedIds } },
        data: { slaBreached: true },
      })
    }

    return reply.send(buildSuccessResponse(breached, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /helpdesk/dashboard/trends — ticket volume over time
  app.get('/trends', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const days = parseInt(q.days ?? '30')

    const from = new Date(Date.now() - days * 86400000)

    const tickets = await prisma.sdTicket.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: from } },
      select: { createdAt: true, resolvedAt: true, status: true, priority: true },
    })

    // Group by day
    const byDay: Record<string, { created: number; resolved: number }> = {}
    for (const t of tickets) {
      const day = t.createdAt.toISOString().slice(0, 10)
      if (!byDay[day]) byDay[day] = { created: 0, resolved: 0 }
      byDay[day]!.created++
      if (t.resolvedAt) {
        const rday = t.resolvedAt.toISOString().slice(0, 10)
        if (!byDay[rday]) byDay[rday] = { created: 0, resolved: 0 }
        byDay[rday]!.resolved++
      }
    }

    const trend = Object.entries(byDay)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return reply.send(buildSuccessResponse(trend))
  })
}
