import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function carRentalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [availableVehicles, activeRentals, totalRentals] = await Promise.all([
      prisma.crnVehicle.count({ where: { tenantId, status: 'available' } }),
      prisma.crnRental.count({ where: { tenantId, status: 'active' } }),
      prisma.crnRental.count({ where: { tenantId } }),
    ])
    return { success: true, data: { availableVehicles, activeRentals, totalRentals } }
  })

  app.get('/vehicles', async (req) => {
    const { tenantId } = req
    const vehicles = await prisma.crnVehicle.findMany({
      where: { tenantId },
      orderBy: { make: 'asc' },
    })
    return { success: true, data: vehicles }
  })

  app.post('/vehicles', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const v = await prisma.crnVehicle.create({ data: { tenantId, ...data } as never })
    return { success: true, data: v }
  })

  app.post('/rentals', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const rental = await prisma.crnRental.create({ data: { tenantId, ...data } as never })
    await prisma.crnVehicle.update({ where: { id: data.vehicleId as string }, data: { status: 'rented' } })
    return { success: true, data: rental }
  })

  app.patch('/rentals/:id/return', async (req) => {
    const { id } = req.params as { id: string }
    const rental = await prisma.crnRental.update({ where: { id }, data: { status: 'returned' } })
    await prisma.crnVehicle.update({ where: { id: rental.vehicleId }, data: { status: 'available' } })
    return { success: true, data: rental }
  })
}
