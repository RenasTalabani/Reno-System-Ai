import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function conferenceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [totalHalls, upcomingBookings, totalBookings] = await Promise.all([
      prisma.cnfHall.count({ where: { tenantId, isActive: true } }),
      prisma.cnfBooking.count({ where: { tenantId, startDate: { gte: now }, status: 'confirmed' } }),
      prisma.cnfBooking.count({ where: { tenantId } }),
    ])
    return { success: true, data: { totalHalls, upcomingBookings, totalBookings } }
  })

  app.get('/halls', async (req) => {
    const { tenantId } = req
    const halls = await prisma.cnfHall.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } })
    return { success: true, data: halls }
  })

  app.post('/halls', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const hall = await prisma.cnfHall.create({ data: { tenantId, ...data } as never })
    return { success: true, data: hall }
  })

  app.post('/bookings', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const booking = await prisma.cnfBooking.create({ data: { tenantId, ...data } as never })
    return { success: true, data: booking }
  })

  app.get('/bookings', async (req) => {
    const { tenantId } = req
    const bookings = await prisma.cnfBooking.findMany({
      where: { tenantId },
      include: { hall: { select: { name: true, capacity: true } } },
      orderBy: { startDate: 'asc' },
      take: 50,
    })
    return { success: true, data: bookings }
  })
}
