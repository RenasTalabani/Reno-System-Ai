import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function meetingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const [totalRooms, todayBookings, upcomingBookings] = await Promise.all([
      prisma.meetRoom.count({ where: { tenantId, isActive: true } }),
      prisma.meetBooking.count({ where: { tenantId, startAt: { gte: new Date(now.toDateString()), lte: todayEnd } } }),
      prisma.meetBooking.count({ where: { tenantId, startAt: { gt: now }, status: 'confirmed' } }),
    ])
    return { success: true, data: { totalRooms, todayBookings, upcomingBookings } }
  })

  app.get('/rooms', async (req) => {
    const { tenantId } = req
    const rooms = await prisma.meetRoom.findMany({
      where: { tenantId },
      include: { _count: { select: { bookings: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: rooms }
  })

  app.post('/rooms', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const room = await prisma.meetRoom.create({ data: { tenantId, ...data } as never })
    return { success: true, data: room }
  })

  app.get('/bookings', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.roomId) where.roomId = q.roomId
    const bookings = await prisma.meetBooking.findMany({
      where: where as never,
      include: { room: { select: { name: true, capacity: true } } },
      orderBy: { startAt: 'asc' },
      take: 50,
    })
    return { success: true, data: bookings }
  })

  app.post('/bookings', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const booking = await prisma.meetBooking.create({ data: { tenantId, organizer: userId, ...data } as never })
    return { success: true, data: booking }
  })

  app.delete('/bookings/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.meetBooking.update({ where: { id }, data: { status: 'cancelled' } })
    return { success: true }
  })

  app.post('/bookings/:id/catering', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const catering = await prisma.meetCatering.create({ data: { bookingId: id, ...data } as never })
    return { success: true, data: catering }
  })
}
