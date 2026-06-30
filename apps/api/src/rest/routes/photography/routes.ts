import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function photographyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [upcomingSessions, completedSessions, totalRevenue] = await Promise.all([
      prisma.phoSession.count({ where: { tenantId, scheduledAt: { gte: now }, status: 'booked' } }),
      prisma.phoSession.count({ where: { tenantId, status: 'delivered' } }),
      prisma.phoSession.aggregate({ where: { tenantId, status: 'delivered' }, _sum: { price: true } }),
    ])
    return { success: true, data: { upcomingSessions, completedSessions, totalRevenue: totalRevenue._sum.price ?? 0 } }
  })

  app.get('/sessions', async (req) => {
    const { tenantId } = req
    const sessions = await prisma.phoSession.findMany({
      where: { tenantId },
      include: { _count: { select: { deliverables: true } } },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    })
    return { success: true, data: sessions }
  })

  app.post('/sessions', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const session = await prisma.phoSession.create({ data: { tenantId, ...data } as never })
    return { success: true, data: session }
  })

  app.post('/sessions/:id/deliverables', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const del = await prisma.phoDeliverable.create({ data: { sessionId: id, deliveredAt: new Date(), ...data } as never })
    await prisma.phoSession.update({ where: { id }, data: { status: 'delivered' } })
    return { success: true, data: del }
  })
}
