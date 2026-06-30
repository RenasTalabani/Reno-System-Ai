import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function sportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [activeMembers, totalFacilities, todayBookings] = await Promise.all([
      prisma.sptMember.count({ where: { tenantId, status: 'active' } }),
      prisma.sptFacility.count({ where: { tenantId, isActive: true } }),
      prisma.sptBooking.count({ where: { tenantId, startAt: { gte: new Date(now.toDateString()) } } }),
    ])
    return { success: true, data: { activeMembers, totalFacilities, todayBookings } }
  })

  app.get('/facilities', async (req) => {
    const { tenantId } = req
    const facilities = await prisma.sptFacility.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: facilities }
  })

  app.post('/facilities', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const facility = await prisma.sptFacility.create({ data: { tenantId, ...data } as never })
    return { success: true, data: facility }
  })

  app.get('/members', async (req) => {
    const { tenantId } = req
    const members = await prisma.sptMember.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, take: 100 })
    return { success: true, data: members }
  })

  app.post('/members', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const member = await prisma.sptMember.create({ data: { tenantId, ...data } as never })
    return { success: true, data: member }
  })

  app.get('/bookings', async (req) => {
    const { tenantId } = req
    const bookings = await prisma.sptBooking.findMany({
      where: { tenantId },
      include: { facility: { select: { name: true } }, member: { select: { name: true } } },
      orderBy: { startAt: 'asc' },
      take: 50,
    })
    return { success: true, data: bookings }
  })

  app.post('/bookings', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const booking = await prisma.sptBooking.create({ data: { tenantId, ...data } as never })
    return { success: true, data: booking }
  })
}
