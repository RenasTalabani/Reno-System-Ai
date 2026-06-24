import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function sdAgentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /helpdesk/agents
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any

    const agents = await prisma.sdAgent.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { displayName: 'asc' },
      include: {
        _count: { select: { tickets: { where: { deletedAt: null, status: { in: ['open', 'in_progress'] } } } } },
      },
    })

    return reply.send(buildSuccessResponse(agents))
  })

  // GET /helpdesk/agents/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const agent = await prisma.sdAgent.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        tickets: {
          where: { deletedAt: null, status: { in: ['open', 'in_progress', 'waiting'] } },
          include: { category: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { tickets: { where: { deletedAt: null } } } },
      },
    })

    if (!agent) throw new RenoError(ErrorCode.NOT_FOUND, 'Agent not found', 404)
    return reply.send(buildSuccessResponse(agent))
  })

  // POST /helpdesk/agents — register a user as support agent
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const existing = await prisma.sdAgent.findFirst({
      where: { tenantId, userId: body.userId, deletedAt: null },
    })
    if (existing) throw new RenoError(ErrorCode.CONFLICT, 'User is already a support agent', 409)

    const agent = await prisma.sdAgent.create({
      data: {
        tenantId, userId: body.userId,
        displayName: body.displayName,
        specializations: body.specializations ?? [],
        maxTickets: body.maxTickets ?? 20,
        isAvailable: body.isAvailable ?? true,
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(agent))
  })

  // PUT /helpdesk/agents/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.sdAgent.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Agent not found', 404)

    const updated = await prisma.sdAgent.update({
      where: { id },
      data: {
        displayName: body.displayName ?? undefined,
        specializations: body.specializations ?? undefined,
        maxTickets: body.maxTickets ?? undefined,
        isAvailable: body.isAvailable ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // GET /helpdesk/agents/workload — all agents workload overview
  app.get('/workload/summary', async (request, reply) => {
    const { tenantId } = request as any

    const agents = await prisma.sdAgent.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      include: {
        _count: {
          select: {
            tickets: { where: { deletedAt: null, status: { in: ['open', 'in_progress'] } } },
          },
        },
      },
    })

    const workload = agents.map(a => ({
      agentId: a.id,
      userId: a.userId,
      displayName: a.displayName,
      maxTickets: a.maxTickets,
      activeTickets: a._count.tickets,
      utilizationPct: Math.round((a._count.tickets / a.maxTickets) * 100),
      isAvailable: a.isAvailable,
    }))

    return reply.send(buildSuccessResponse(workload))
  })

  // GET /helpdesk/agents/leaderboard — agent performance stats
  app.get('/leaderboard/stats', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const from = q.from ? new Date(q.from) : new Date(Date.now() - 30 * 86400000)
    const to = q.to ? new Date(q.to) : new Date()

    const agents = await prisma.sdAgent.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
    })

    const stats = await Promise.all(agents.map(async (agent) => {
      const [resolved, total, csat] = await Promise.all([
        prisma.sdTicket.count({
          where: { tenantId, agentId: agent.id, resolvedAt: { gte: from, lte: to }, deletedAt: null },
        }),
        prisma.sdTicket.count({
          where: { tenantId, agentId: agent.id, createdAt: { gte: from, lte: to }, deletedAt: null },
        }),
        prisma.sdCsat.findMany({
          where: { tenantId, ticket: { agentId: agent.id, resolvedAt: { gte: from, lte: to } } },
          select: { rating: true },
        }),
      ])

      const avgCsat = csat.length ? csat.reduce((s, c) => s + c.rating, 0) / csat.length : null

      return {
        agentId: agent.id,
        userId: agent.userId,
        displayName: agent.displayName,
        resolved,
        total,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgCsat: avgCsat ? Math.round(avgCsat * 10) / 10 : null,
        csatResponses: csat.length,
      }
    }))

    stats.sort((a, b) => b.resolved - a.resolved)

    return reply.send(buildSuccessResponse(stats))
  })
}
