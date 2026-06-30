import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function aviationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeAircraft, scheduledFlights, completedFlights] = await Promise.all([
      prisma.avnAircraft.count({ where: { tenantId, status: 'active' } }),
      prisma.avnFlight.count({ where: { tenantId, status: 'scheduled' } }),
      prisma.avnFlight.count({ where: { tenantId, status: 'landed' } }),
    ])
    return { success: true, data: { activeAircraft, scheduledFlights, completedFlights } }
  })

  app.get('/aircraft', async (req) => {
    const { tenantId } = req
    const aircraft = await prisma.avnAircraft.findMany({
      where: { tenantId },
      include: { _count: { select: { flights: true } } },
      orderBy: { tailNumber: 'asc' },
    })
    return { success: true, data: aircraft }
  })

  app.post('/aircraft', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const a = await prisma.avnAircraft.create({ data: { tenantId, ...data } as never })
    return { success: true, data: a }
  })

  app.get('/flights', async (req) => {
    const { tenantId } = req
    const flights = await prisma.avnFlight.findMany({
      where: { tenantId },
      include: { aircraft: { select: { tailNumber: true, type: true } } },
      orderBy: { departureAt: 'asc' },
      take: 50,
    })
    return { success: true, data: flights }
  })

  app.post('/flights', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const flight = await prisma.avnFlight.create({ data: { tenantId, ...data } as never })
    return { success: true, data: flight }
  })

  app.patch('/flights/:id/depart', async (req) => {
    const { id } = req.params as { id: string }
    const flight = await prisma.avnFlight.update({ where: { id }, data: { status: 'in-flight' } })
    return { success: true, data: flight }
  })

  app.patch('/flights/:id/land', async (req) => {
    const { id } = req.params as { id: string }
    const flight = await prisma.avnFlight.update({ where: { id }, data: { status: 'landed', arrivalAt: new Date() } })
    return { success: true, data: flight }
  })
}
