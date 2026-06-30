import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function coworkingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const today = new Date()
    const [totalSpaces, activeReservations, availableSpaces] = await Promise.all([
      prisma.cwkSpace.count({ where: { tenantId, isActive: true } }),
      prisma.cwkReservation.count({ where: { tenantId, status: 'confirmed', startDate: { lte: today }, endDate: { gte: today } } }),
      prisma.cwkSpace.count({ where: { tenantId, isActive: true } }),
    ])
    return { success: true, data: { totalSpaces, activeReservations, availableSpaces } }
  })

  app.get('/spaces', async (req) => {
    const { tenantId } = req
    const spaces = await prisma.cwkSpace.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { reservations: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: spaces }
  })

  app.post('/spaces', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const space = await prisma.cwkSpace.create({ data: { tenantId, ...data } as never })
    return { success: true, data: space }
  })

  app.get('/reservations', async (req) => {
    const { tenantId } = req
    const reservations = await prisma.cwkReservation.findMany({
      where: { tenantId },
      include: { space: { select: { name: true, type: true } } },
      orderBy: { startDate: 'asc' },
      take: 50,
    })
    return { success: true, data: reservations }
  })

  app.post('/reservations', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const res = await prisma.cwkReservation.create({ data: { tenantId, ...data } as never })
    return { success: true, data: res }
  })
}
