import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function omsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/orders', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const orders = await prisma.omsOrder.findMany({
      where: {
        tenantId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.channel ? { channel: q.channel } : {}),
      },
      include: { _count: { select: { lines: true, shipments: true } } },
      orderBy: { placedAt: 'desc' },
      take: 100,
    })
    return { success: true, data: orders }
  })

  app.post('/orders', async (req) => {
    const { tenantId } = req
    const { lines, ...rest } = req.body as { lines: Record<string, unknown>[]; [k: string]: unknown }
    const orderNo = `ORD-${Date.now()}`
    const order = await prisma.omsOrder.create({
      data: {
        tenantId,
        orderNo,
        ...rest,
        lines: { create: lines as never[] },
      } as never,
      include: { lines: true },
    })
    return { success: true, data: order }
  })

  app.get('/orders/:id', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const order = await prisma.omsOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true, shipments: true },
    })
    return { success: true, data: order }
  })

  app.patch('/orders/:id/status', async (req) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const order = await prisma.omsOrder.update({ where: { id }, data: { status } })
    return { success: true, data: order }
  })

  app.post('/orders/:id/shipments', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const shipment = await prisma.omsShipment.create({ data: { tenantId, orderId: id, ...data } as never })
    return { success: true, data: shipment }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, pending, shipped, revenue] = await Promise.all([
      prisma.omsOrder.count({ where: { tenantId } }),
      prisma.omsOrder.count({ where: { tenantId, status: 'pending' } }),
      prisma.omsOrder.count({ where: { tenantId, status: 'shipped' } }),
      prisma.omsOrder.aggregate({ where: { tenantId }, _sum: { total: true } }),
    ])
    return { success: true, data: { totalOrders: total, pendingOrders: pending, shippedOrders: shipped, totalRevenue: revenue._sum.total ?? 0 } }
  })
}
