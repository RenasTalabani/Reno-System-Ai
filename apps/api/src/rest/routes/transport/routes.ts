import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function transportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalRoutes, activeDrivers, inTransit] = await Promise.all([
      prisma.trpRoute.count({ where: { tenantId, isActive: true } }),
      prisma.trpDriver.count({ where: { tenantId, status: 'on-route' } }),
      prisma.trpShipment.count({ where: { tenantId, status: 'in-transit' } }),
    ])
    return { success: true, data: { totalRoutes, activeDrivers, inTransit } }
  })

  app.get('/routes', async (req) => {
    const { tenantId } = req
    const routes = await prisma.trpRoute.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: routes }
  })

  app.post('/routes', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const route = await prisma.trpRoute.create({ data: { tenantId, ...data } as never })
    return { success: true, data: route }
  })

  app.get('/drivers', async (req) => {
    const { tenantId } = req
    const drivers = await prisma.trpDriver.findMany({
      where: { tenantId },
      include: { _count: { select: { shipments: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: drivers }
  })

  app.post('/drivers', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const driver = await prisma.trpDriver.create({ data: { tenantId, ...data } as never })
    return { success: true, data: driver }
  })

  app.get('/shipments', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const shipments = await prisma.trpShipment.findMany({
      where: where as never,
      include: { route: { select: { name: true } }, driver: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: shipments }
  })

  app.post('/shipments', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const trackingCode = `TRK-${Date.now().toString(36).toUpperCase()}`
    const shipment = await prisma.trpShipment.create({ data: { tenantId, trackingCode, ...data } as never })
    return { success: true, data: shipment }
  })

  app.patch('/shipments/:id/status', async (req) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const update: Record<string, unknown> = { status }
    if (status === 'delivered') update.actualDeliveredAt = new Date()
    const shipment = await prisma.trpShipment.update({ where: { id }, data: update as never })
    return { success: true, data: shipment }
  })
}
