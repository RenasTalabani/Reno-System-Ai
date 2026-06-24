import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

function ticketNumber(tenantId: string) {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `TKT-${ts}-${rnd}`
}

function calcSlaDeadlines(policy: { firstResponseMinutes: number; resolutionMinutes: number }, from = new Date()) {
  const firstResponseDue = new Date(from.getTime() + policy.firstResponseMinutes * 60000)
  const resolutionDue = new Date(from.getTime() + policy.resolutionMinutes * 60000)
  return { firstResponseDue, resolutionDue }
}

const TICKET_INCLUDE = {
  category: { select: { id: true, name: true, color: true, icon: true } },
  agent: { select: { id: true, userId: true, displayName: true } },
  slaPolicy: { select: { id: true, name: true, firstResponseMinutes: true, resolutionMinutes: true } },
  csat: { select: { rating: true, comment: true, createdAt: true } },
  _count: { select: { comments: { where: { deletedAt: null } }, attachments: true } },
} as const

export async function sdTicketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /helpdesk/tickets
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '25'))

    const where: any = { tenantId, deletedAt: null }
    if (q.status) where.status = q.status
    if (q.priority) where.priority = q.priority
    if (q.categoryId) where.categoryId = q.categoryId
    if (q.agentId) where.agentId = q.agentId
    if (q.source) where.source = q.source
    if (q.requesterId) where.requesterId = q.requesterId
    if (q.slaBreached !== undefined) where.slaBreached = q.slaBreached === 'true'
    if (q.search) where.subject = { contains: q.search, mode: 'insensitive' }
    if (q.unassigned === 'true') where.agentId = null

    const [total, tickets] = await Promise.all([
      prisma.sdTicket.count({ where }),
      prisma.sdTicket.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: TICKET_INCLUDE,
      }),
    ])

    return reply.send(buildSuccessResponse(tickets, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /helpdesk/tickets/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const ticket = await prisma.sdTicket.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        ...TICKET_INCLUDE,
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { attachments: true },
        },
        attachments: true,
      },
    })

    if (!ticket) throw new RenoError(ErrorCode.NOT_FOUND, 'Ticket not found', 404)
    return reply.send(buildSuccessResponse(ticket))
  })

  // POST /helpdesk/tickets
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    // Find default SLA policy for priority
    let slaPolicyId = body.slaPolicyId
    let firstResponseDue: Date | undefined
    let resolutionDue: Date | undefined

    if (!slaPolicyId) {
      const defaultPolicy = await prisma.sdSlaPolicy.findFirst({
        where: { tenantId, priority: body.priority ?? 'medium', deletedAt: null, isActive: true, isDefault: true },
      }) ?? await prisma.sdSlaPolicy.findFirst({
        where: { tenantId, priority: body.priority ?? 'medium', deletedAt: null, isActive: true },
      })
      if (defaultPolicy) {
        slaPolicyId = defaultPolicy.id
        const deadlines = calcSlaDeadlines(defaultPolicy)
        firstResponseDue = deadlines.firstResponseDue
        resolutionDue = deadlines.resolutionDue
      }
    }

    const ticket = await prisma.sdTicket.create({
      data: {
        tenantId, number: ticketNumber(tenantId),
        source: body.source ?? 'internal',
        sourceRef: body.sourceRef,
        portalTicketId: body.portalTicketId,
        subject: body.subject, description: body.description,
        categoryId: body.categoryId,
        priority: body.priority ?? 'medium',
        status: 'open',
        type: body.type ?? 'question',
        requesterId: body.requesterId ?? userId,
        requesterType: body.requesterType ?? 'user',
        agentId: body.agentId,
        slaPolicyId,
        firstResponseDue,
        resolutionDue,
        tags: body.tags ?? [],
        metadata: body.metadata,
        createdBy: userId,
      },
      include: TICKET_INCLUDE,
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE_TICKET', module: 'helpdesk', entityType: 'sd_tickets', entityId: ticket.id, newValues: { number: ticket.number, subject: ticket.subject, priority: ticket.priority }, ipAddress: request.ip },
    })

    return reply.status(201).send(buildSuccessResponse(ticket))
  })

  // PUT /helpdesk/tickets/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.sdTicket.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Ticket not found', 404)

    const updated = await prisma.sdTicket.update({
      where: { id },
      data: {
        subject: body.subject ?? undefined,
        description: body.description ?? undefined,
        categoryId: body.categoryId ?? undefined,
        priority: body.priority ?? undefined,
        type: body.type ?? undefined,
        tags: body.tags ?? undefined,
        metadata: body.metadata ?? undefined,
        updatedBy: userId,
      },
      include: TICKET_INCLUDE,
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /helpdesk/tickets/:id/assign
  app.patch('/:id/assign', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { agentId } = request.body as any

    const ticket = await prisma.sdTicket.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!ticket) throw new RenoError(ErrorCode.NOT_FOUND, 'Ticket not found', 404)

    const updated = await prisma.sdTicket.update({
      where: { id },
      data: { agentId, status: ticket.status === 'open' ? 'in_progress' : ticket.status, updatedBy: userId },
      include: TICKET_INCLUDE,
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASSIGN_TICKET', module: 'helpdesk', entityType: 'sd_tickets', entityId: id, newValues: { agentId }, ipAddress: request.ip },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /helpdesk/tickets/:id/status
  app.patch('/:id/status', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { status } = request.body as any

    const ticket = await prisma.sdTicket.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!ticket) throw new RenoError(ErrorCode.NOT_FOUND, 'Ticket not found', 404)

    const now = new Date()
    const data: any = { status, updatedBy: userId }

    if (status === 'resolved' && !ticket.resolvedAt) data.resolvedAt = now
    if (status === 'closed' && !ticket.closedAt) data.closedAt = now
    if (status === 'open' || status === 'in_progress') {
      data.resolvedAt = null
      data.closedAt = null
    }

    const updated = await prisma.sdTicket.update({ where: { id }, data, include: TICKET_INCLUDE })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPDATE_TICKET_STATUS', module: 'helpdesk', entityType: 'sd_tickets', entityId: id, newValues: { status }, ipAddress: request.ip },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /helpdesk/tickets/:id/priority
  app.patch('/:id/priority', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { priority } = request.body as any

    const ticket = await prisma.sdTicket.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!ticket) throw new RenoError(ErrorCode.NOT_FOUND, 'Ticket not found', 404)

    const updated = await prisma.sdTicket.update({
      where: { id }, data: { priority, updatedBy: userId }, include: TICKET_INCLUDE,
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /helpdesk/tickets/:id/close
  app.patch('/:id/close', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const updated = await prisma.sdTicket.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date(), resolvedAt: new Date(), updatedBy: userId },
      include: TICKET_INCLUDE,
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /helpdesk/tickets/:id/reopen
  app.patch('/:id/reopen', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const updated = await prisma.sdTicket.update({
      where: { id },
      data: { status: 'open', closedAt: null, resolvedAt: null, updatedBy: userId },
      include: TICKET_INCLUDE,
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /helpdesk/tickets/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.sdTicket.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // ─── Comments ─────────────────────────────────────────────────────────────

  // GET /helpdesk/tickets/:id/comments
  app.get('/:id/comments', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const comments = await prisma.sdTicketComment.findMany({
      where: { ticketId: id, tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { attachments: true },
    })

    return reply.send(buildSuccessResponse(comments))
  })

  // POST /helpdesk/tickets/:id/comments
  app.post('/:id/comments', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const ticket = await prisma.sdTicket.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!ticket) throw new RenoError(ErrorCode.NOT_FOUND, 'Ticket not found', 404)

    const comment = await prisma.sdTicketComment.create({
      data: {
        tenantId, ticketId: id, userId,
        content: body.content,
        isInternal: body.isInternal ?? false,
        isAiSuggested: body.isAiSuggested ?? false,
      },
      include: { attachments: true },
    })

    // First response tracking
    if (!ticket.firstResponseAt && !body.isInternal) {
      await prisma.sdTicket.update({
        where: { id },
        data: { firstResponseAt: new Date(), status: 'in_progress', updatedBy: userId },
      })
    }

    return reply.status(201).send(buildSuccessResponse(comment))
  })

  // PUT /helpdesk/tickets/:id/comments/:commentId
  app.put('/:id/comments/:commentId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { commentId } = request.params as any
    const body = request.body as any

    const comment = await prisma.sdTicketComment.findFirst({ where: { id: commentId, tenantId, deletedAt: null } })
    if (!comment) throw new RenoError(ErrorCode.NOT_FOUND, 'Comment not found', 404)
    if (comment.userId !== userId) throw new RenoError(ErrorCode.FORBIDDEN, 'Not your comment', 403)

    const updated = await prisma.sdTicketComment.update({
      where: { id: commentId },
      data: { content: body.content, editedAt: new Date() },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /helpdesk/tickets/:id/comments/:commentId
  app.delete('/:id/comments/:commentId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { commentId } = request.params as any

    await prisma.sdTicketComment.updateMany({
      where: { id: commentId, tenantId },
      data: { deletedAt: new Date() },
    })

    return reply.send(buildSuccessResponse({ id: commentId }))
  })

  // ─── CSAT ─────────────────────────────────────────────────────────────────

  // POST /helpdesk/tickets/:id/csat
  app.post('/:id/csat', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const ticket = await prisma.sdTicket.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!ticket) throw new RenoError(ErrorCode.NOT_FOUND, 'Ticket not found', 404)

    const existing = await prisma.sdCsat.findUnique({ where: { ticketId: id } })
    if (existing) throw new RenoError(ErrorCode.CONFLICT, 'CSAT already submitted for this ticket', 409)

    if (body.rating < 1 || body.rating > 5) {
      throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Rating must be between 1 and 5', 400)
    }

    const csat = await prisma.sdCsat.create({
      data: {
        tenantId, ticketId: id,
        rating: body.rating,
        comment: body.comment,
        submittedBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(csat))
  })
}
