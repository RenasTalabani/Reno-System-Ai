import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function musicRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalArtists, confirmedBookings, pendingBookings] = await Promise.all([
      prisma.mscArtist.count({ where: { tenantId, status: 'active' } }),
      prisma.mscBooking.count({ where: { tenantId, status: 'confirmed' } }),
      prisma.mscBooking.count({ where: { tenantId, status: 'pending' } }),
    ])
    return { success: true, data: { totalArtists, confirmedBookings, pendingBookings } }
  })

  app.get('/artists', async (req) => {
    const { tenantId } = req
    const artists = await prisma.mscArtist.findMany({
      where: { tenantId },
      include: { _count: { select: { bookings: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: artists }
  })

  app.post('/artists', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const artist = await prisma.mscArtist.create({ data: { tenantId, ...data } as never })
    return { success: true, data: artist }
  })

  app.get('/bookings', async (req) => {
    const { tenantId } = req
    const bookings = await prisma.mscBooking.findMany({
      where: { tenantId },
      include: { artist: { select: { name: true, genre: true } } },
      orderBy: { eventDate: 'asc' },
      take: 50,
    })
    return { success: true, data: bookings }
  })

  app.post('/bookings', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const booking = await prisma.mscBooking.create({ data: { tenantId, ...data } as never })
    return { success: true, data: booking }
  })

  app.patch('/bookings/:id/confirm', async (req) => {
    const { id } = req.params as { id: string }
    const booking = await prisma.mscBooking.update({ where: { id }, data: { status: 'confirmed' } })
    return { success: true, data: booking }
  })
}
