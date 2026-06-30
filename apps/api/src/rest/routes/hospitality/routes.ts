import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function hospitalityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [totalRooms, occupiedRooms, upcomingCheckins] = await Promise.all([
      prisma.hotelRoom.count({ where: { property: { tenantId } } }),
      prisma.hotelRoom.count({ where: { property: { tenantId }, status: 'occupied' } }),
      prisma.hotelReservation.count({ where: { tenantId, checkIn: { gte: now }, status: 'confirmed' } }),
    ])
    return { success: true, data: { totalRooms, occupiedRooms, upcomingCheckins } }
  })

  app.get('/properties', async (req) => {
    const { tenantId } = req
    const properties = await prisma.hotelProperty.findMany({
      where: { tenantId },
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: properties }
  })

  app.post('/properties', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const property = await prisma.hotelProperty.create({ data: { tenantId, ...data } as never })
    return { success: true, data: property }
  })

  app.get('/properties/:id/rooms', async (req) => {
    const { id } = req.params as { id: string }
    const rooms = await prisma.hotelRoom.findMany({ where: { propertyId: id }, orderBy: { roomNumber: 'asc' } })
    return { success: true, data: rooms }
  })

  app.post('/properties/:id/rooms', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const room = await prisma.hotelRoom.create({ data: { propertyId: id, ...data } as never })
    return { success: true, data: room }
  })

  app.get('/reservations', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const reservations = await prisma.hotelReservation.findMany({
      where: where as never,
      include: { room: { select: { roomNumber: true, type: true } } },
      orderBy: { checkIn: 'asc' },
      take: 50,
    })
    return { success: true, data: reservations }
  })

  app.post('/reservations', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const reservation = await prisma.hotelReservation.create({ data: { tenantId, ...data } as never })
    await prisma.hotelRoom.update({ where: { id: data.roomId as string }, data: { status: 'reserved' } })
    return { success: true, data: reservation }
  })

  app.patch('/reservations/:id/checkin', async (req) => {
    const { id } = req.params as { id: string }
    const res = await prisma.hotelReservation.update({ where: { id }, data: { status: 'checked-in' } })
    await prisma.hotelRoom.update({ where: { id: res.roomId }, data: { status: 'occupied' } })
    return { success: true, data: res }
  })

  app.patch('/reservations/:id/checkout', async (req) => {
    const { id } = req.params as { id: string }
    const res = await prisma.hotelReservation.update({ where: { id }, data: { status: 'checked-out' } })
    await prisma.hotelRoom.update({ where: { id: res.roomId }, data: { status: 'available' } })
    return { success: true, data: res }
  })
}
