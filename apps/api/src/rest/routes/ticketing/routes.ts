import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function ticketingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalEvents, upcomingEvents, totalOrders] = await Promise.all([
      prisma.tktEvent.count({ where: { tenantId } }),
      prisma.tktEvent.count({ where: { tenantId, startAt: { gt: new Date() }, status: 'published' } }),
      prisma.tktOrder.count({ where: { tenantId } }),
    ])
    return { success: true, data: { totalEvents, upcomingEvents, totalOrders } }
  })

  app.get('/events', async (req) => {
    const { tenantId } = req
    const events = await prisma.tktEvent.findMany({
      where: { tenantId },
      include: { _count: { select: { ticketTypes: true } } },
      orderBy: { startAt: 'asc' },
      take: 50,
    })
    return { success: true, data: events }
  })

  app.post('/events', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const event = await prisma.tktEvent.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: event }
  })

  app.post('/events/:id/ticket-types', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const type = await prisma.tktTicketType.create({ data: { eventId: id, ...data } as never })
    return { success: true, data: type }
  })

  app.post('/ticket-types/:id/purchase', async (req) => {
    const { id } = req.params as { id: string }
    const { tenantId } = req
    const body = req.body as Record<string, unknown>
    const ticketType = await prisma.tktTicketType.findUnique({ where: { id } })
    if (!ticketType) return { success: false, error: 'Not found' }
    const qty = Number(body.quantity ?? 1)
    const total = Number(ticketType.price) * qty
    const qrCode = `QR-${Date.now().toString(36).toUpperCase()}`
    const order = await prisma.tktOrder.create({
      data: { tenantId, ticketTypeId: id, quantity: qty, totalAmount: total, qrCode, ...body } as never,
    })
    await prisma.tktTicketType.update({ where: { id }, data: { sold: { increment: qty } } })
    return { success: true, data: order }
  })
}
