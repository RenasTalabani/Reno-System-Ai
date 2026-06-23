import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function portalTicketRoutes(app: FastifyInstance) {
  // GET /portal/tickets — list my tickets
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { status, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, submittedBy: userId, deletedAt: null }
    if (status) where.status = status

    const [tickets, total] = await Promise.all([
      prisma.portalTicket.findMany({
        where,
        include: { _count: { select: { replies: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.portalTicket.count({ where }),
    ])

    return reply.send({ success: true, data: tickets, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /portal/tickets — submit a ticket
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { subject, description, category, priority, portalType } = req.body as any
    if (!subject || !description || !category) {
      return reply.code(400).send({ success: false, error: 'subject, description, category required' })
    }

    const count = await prisma.portalTicket.count({ where: { tenantId } })
    const number = `TICK-${String(count + 1).padStart(5, '0')}`

    const ticket = await prisma.portalTicket.create({
      data: {
        tenantId,
        number,
        submittedBy: userId,
        portalType: portalType ?? 'employee',
        subject,
        description,
        category,
        priority: priority ?? 'normal',
        status: 'open',
      },
    })

    await prisma.portalNotification.create({
      data: {
        tenantId,
        userId,
        portalType: portalType ?? 'employee',
        title: 'Ticket Submitted',
        body: `Your support ticket ${number} has been submitted. We'll respond soon.`,
        type: 'info',
        data: { entityId: ticket.id, module: 'tickets' },
      },
    })

    return reply.code(201).send({ success: true, data: ticket })
  })

  // GET /portal/tickets/:id — ticket detail with replies
  app.get('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const ticket = await prisma.portalTicket.findFirst({
      where: { id, tenantId, submittedBy: userId, deletedAt: null },
      include: {
        replies: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' })

    return reply.send({ success: true, data: ticket })
  })

  // POST /portal/tickets/:id/reply — add a reply
  app.post('/:id/reply', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { content } = req.body as any
    if (!content) return reply.code(400).send({ success: false, error: 'content required' })

    const ticket = await prisma.portalTicket.findFirst({ where: { id, tenantId, submittedBy: userId, deletedAt: null } })
    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' })
    if (ticket.status === 'closed') return reply.code(400).send({ success: false, error: 'Cannot reply to a closed ticket' })

    const ticketReply = await prisma.portalTicketReply.create({
      data: { tenantId, ticketId: id, userId, content, isInternal: false },
    })

    await prisma.portalTicket.update({
      where: { id },
      data: { status: 'in_progress', updatedAt: new Date() },
    })

    return reply.code(201).send({ success: true, data: ticketReply })
  })

  // PATCH /portal/tickets/:id/close — close ticket
  app.patch('/:id/close', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const ticket = await prisma.portalTicket.findFirst({ where: { id, tenantId, submittedBy: userId, deletedAt: null } })
    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' })

    await prisma.portalTicket.update({
      where: { id },
      data: { status: 'closed', resolvedAt: new Date() },
    })

    return reply.send({ success: true, data: { closed: true } })
  })
}
