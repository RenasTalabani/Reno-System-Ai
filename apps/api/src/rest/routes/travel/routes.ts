import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function travelRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, pending, approved, totalCost] = await Promise.all([
      prisma.trvTrip.count({ where: { tenantId } }),
      prisma.trvTrip.count({ where: { tenantId, status: 'pending' } }),
      prisma.trvTrip.count({ where: { tenantId, status: 'approved' } }),
      prisma.trvTrip.aggregate({ where: { tenantId }, _sum: { actualCost: true } }),
    ])
    return { success: true, data: { totalTrips: total, pendingApproval: pending, approvedTrips: approved, totalCost: totalCost._sum.actualCost ?? 0 } }
  })

  app.get('/trips', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.travelerId) where.travelerId = q.travelerId
    const trips = await prisma.trvTrip.findMany({
      where: where as never,
      include: { _count: { select: { bookings: true } } },
      orderBy: { departDate: 'desc' },
      take: 50,
    })
    return { success: true, data: trips }
  })

  app.post('/trips', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const trip = await prisma.trvTrip.create({ data: { tenantId, travelerId: userId, ...data } as never })
    return { success: true, data: trip }
  })

  app.get('/trips/:id', async (req) => {
    const { id } = req.params as { id: string }
    const trip = await prisma.trvTrip.findUnique({ where: { id }, include: { bookings: { orderBy: { createdAt: 'asc' } } } })
    return { success: true, data: trip }
  })

  app.patch('/trips/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const trip = await prisma.trvTrip.update({ where: { id }, data: data as never })
    return { success: true, data: trip }
  })

  app.patch('/trips/:id/approve', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const trip = await prisma.trvTrip.update({ where: { id }, data: { status: 'approved', approvedBy: userId, approvedAt: new Date() } })
    return { success: true, data: trip }
  })

  app.post('/trips/:id/bookings', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const booking = await prisma.trvBooking.create({ data: { tripId: id, ...data } as never })
    return { success: true, data: booking }
  })
}
