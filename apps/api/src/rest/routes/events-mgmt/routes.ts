import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function eventsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [totalEvents, upcoming, totalRegistrations, checkedIn] = await Promise.all([
      prisma.evtEvent.count({ where: { tenantId } }),
      prisma.evtEvent.count({ where: { tenantId, startsAt: { gte: now }, status: 'published' } }),
      prisma.evtRegistration.count({ where: { event: { tenantId } } }),
      prisma.evtRegistration.count({ where: { event: { tenantId }, checkedInAt: { not: null } } }),
    ])
    return { success: true, data: { totalEvents, upcomingEvents: upcoming, totalRegistrations, checkedIn } }
  })

  app.get('/', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const events = await prisma.evtEvent.findMany({
      where: where as never,
      include: { _count: { select: { registrations: true, ticketTypes: true } } },
      orderBy: { startsAt: 'desc' },
      take: 50,
    })
    return { success: true, data: events }
  })

  app.post('/', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const event = await prisma.evtEvent.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: event }
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const event = await prisma.evtEvent.findUnique({
      where: { id },
      include: { ticketTypes: true, _count: { select: { registrations: true } } },
    })
    return { success: true, data: event }
  })

  app.patch('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const event = await prisma.evtEvent.update({ where: { id }, data: data as never })
    return { success: true, data: event }
  })

  app.post('/:id/ticket-types', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const tt = await prisma.evtTicketType.create({ data: { eventId: id, ...data } as never })
    return { success: true, data: tt }
  })

  app.post('/:id/registrations', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const reg = await prisma.evtRegistration.create({ data: { eventId: id, ...data } as never })
    if ((data as { ticketTypeId?: string }).ticketTypeId) {
      await prisma.evtTicketType.update({ where: { id: (data as { ticketTypeId: string }).ticketTypeId }, data: { soldCount: { increment: 1 } } })
    }
    return { success: true, data: reg }
  })

  app.patch('/registrations/:regId/check-in', async (req) => {
    const { regId } = req.params as { regId: string }
    const reg = await prisma.evtRegistration.update({ where: { id: regId }, data: { checkedInAt: new Date(), status: 'checked_in' } })
    return { success: true, data: reg }
  })

  app.get('/:id/registrations', async (req) => {
    const { id } = req.params as { id: string }
    const regs = await prisma.evtRegistration.findMany({
      where: { eventId: id },
      include: { ticketType: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return { success: true, data: regs }
  })
}