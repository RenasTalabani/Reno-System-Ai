import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function fleetRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/vehicles', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const vehicles = await prisma.fleetVehicle.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}) },
      include: { _count: { select: { trips: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: vehicles }
  })

  app.post('/vehicles', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const v = await prisma.fleetVehicle.create({ data: { tenantId, ...data } as never })
    return { success: true, data: v }
  })

  app.get('/drivers', async (req) => {
    const { tenantId } = req
    const drivers = await prisma.fleetDriver.findMany({
      where: { tenantId },
      include: { _count: { select: { trips: true } } },
    })
    return { success: true, data: drivers }
  })

  app.post('/drivers', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const d = await prisma.fleetDriver.create({ data: { tenantId, ...data } as never })
    return { success: true, data: d }
  })

  app.get('/trips', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const trips = await prisma.fleetTrip.findMany({
      where: { tenantId, ...(q.vehicleId ? { vehicleId: q.vehicleId } : {}), ...(q.status ? { status: q.status } : {}) },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        driver: { select: { licenseNo: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    })
    return { success: true, data: trips }
  })

  app.post('/trips', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const trip = await prisma.fleetTrip.create({ data: { tenantId, ...data } as never })
    return { success: true, data: trip }
  })

  app.patch('/trips/:id/complete', async (req) => {
    const { id } = req.params as { id: string }
    const { endOdo, fuelCost } = req.body as { endOdo: number; fuelCost?: number }
    const trip = await prisma.fleetTrip.update({
      where: { id },
      data: { endOdo, fuelCost, endedAt: new Date(), status: 'completed' },
    })
    return { success: true, data: trip }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [vehicles, drivers, activeTrips, available] = await Promise.all([
      prisma.fleetVehicle.count({ where: { tenantId } }),
      prisma.fleetDriver.count({ where: { tenantId, status: 'active' } }),
      prisma.fleetTrip.count({ where: { tenantId, status: 'active' } }),
      prisma.fleetVehicle.count({ where: { tenantId, status: 'available' } }),
    ])
    return { success: true, data: { vehicles, drivers, activeTrips, availableVehicles: available } }
  })
}
