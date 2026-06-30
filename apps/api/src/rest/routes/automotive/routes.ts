import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function automotiveRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [availableVehicles, totalSales, testDrivesToday] = await Promise.all([
      prisma.autoVehicle.count({ where: { tenantId, status: 'available' } }),
      prisma.autoSale.count({ where: { tenantId } }),
      prisma.autoTestDrive.count({ where: { vehicle: { tenantId }, scheduledAt: { gte: new Date(new Date().toDateString()) } } }),
    ])
    return { success: true, data: { availableVehicles, totalSales, testDrivesToday } }
  })

  app.get('/vehicles', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.condition) where.condition = q.condition
    const vehicles = await prisma.autoVehicle.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: vehicles }
  })

  app.post('/vehicles', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const vehicle = await prisma.autoVehicle.create({ data: { tenantId, ...data } as never })
    return { success: true, data: vehicle }
  })

  app.post('/vehicles/:id/test-drives', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const td = await prisma.autoTestDrive.create({ data: { vehicleId: id, ...data } as never })
    return { success: true, data: td }
  })

  app.post('/vehicles/:id/sell', async (req) => {
    const { id } = req.params as { id: string }
    const { tenantId, userId } = req
    const body = req.body as Record<string, unknown>
    const sale = await prisma.autoSale.create({
      data: { tenantId, vehicleId: id, salesRepId: userId, saleDate: new Date(), ...body } as never,
    })
    await prisma.autoVehicle.update({ where: { id }, data: { status: 'sold' } })
    return { success: true, data: sale }
  })

  app.get('/sales', async (req) => {
    const { tenantId } = req
    const sales = await prisma.autoSale.findMany({
      where: { tenantId },
      include: { vehicle: { select: { make: true, model: true, year: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: sales }
  })
}
