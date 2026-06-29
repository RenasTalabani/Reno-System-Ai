import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function complianceCalendarRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const [total, upcoming, overdue, completed] = await Promise.all([
      prisma.ccEvent.count({ where: { tenantId } }),
      prisma.ccEvent.count({ where: { tenantId, status: 'upcoming', dueDate: { lte: next30 } } }),
      prisma.ccEvent.count({ where: { tenantId, status: 'upcoming', dueDate: { lt: now } } }),
      prisma.ccEvent.count({ where: { tenantId, status: 'completed' } }),
    ])
    return { success: true, data: { totalEvents: total, upcomingIn30Days: upcoming, overdue, completed } }
  })

  app.get('/events', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    if (q.jurisdiction) where.jurisdiction = q.jurisdiction
    const events = await prisma.ccEvent.findMany({
      where: where as never,
      include: { _count: { select: { reminders: true } } },
      orderBy: { dueDate: 'asc' },
      take: 100,
    })
    return { success: true, data: events }
  })

  app.post('/events', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const event = await prisma.ccEvent.create({ data: { tenantId, ...data } as never })
    return { success: true, data: event }
  })

  app.get('/events/:id', async (req) => {
    const { id } = req.params as { id: string }
    const event = await prisma.ccEvent.findUnique({ where: { id }, include: { reminders: true } })
    return { success: true, data: event }
  })

  app.patch('/events/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const event = await prisma.ccEvent.update({ where: { id }, data: data as never })
    return { success: true, data: event }
  })

  app.patch('/events/:id/complete', async (req) => {
    const { id } = req.params as { id: string }
    const event = await prisma.ccEvent.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } })
    return { success: true, data: event }
  })

  app.post('/events/:id/reminders', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const reminder = await prisma.ccReminder.create({ data: { eventId: id, ...data } as never })
    return { success: true, data: reminder }
  })
}