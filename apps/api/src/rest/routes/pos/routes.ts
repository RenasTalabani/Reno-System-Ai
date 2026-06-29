import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function posRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [openOrders, todayRevenue, todayOrders] = await Promise.all([
      prisma.posOrder.count({ where: { tenantId, status: 'open' } }),
      prisma.posOrder.aggregate({ where: { tenantId, status: 'paid', paidAt: { gte: today } }, _sum: { total: true } }),
      prisma.posOrder.count({ where: { tenantId, createdAt: { gte: today } } }),
    ])
    return { success: true, data: { openOrders, todayRevenue: todayRevenue._sum.total ?? 0, todayOrders } }
  })

  app.get('/orders', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const orders = await prisma.posOrder.findMany({
      where: where as never,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: orders }
  })

  app.post('/orders', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const order = await prisma.posOrder.create({ data: { tenantId, cashierId: userId, ...data } as never })
    return { success: true, data: order }
  })

  app.post('/orders/:id/items', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const item = await prisma.posOrderItem.create({ data: { orderId: id, ...data } as never })
    const agg = await prisma.posOrderItem.aggregate({ where: { orderId: id }, _sum: { total: true } })
    const subtotal = Number(agg._sum.total ?? 0)
    const tax = subtotal * 0.1
    await prisma.posOrder.update({ where: { id }, data: { subtotal, tax, total: subtotal + tax } })
    return { success: true, data: item }
  })

  app.patch('/orders/:id/pay', async (req) => {
    const { id } = req.params as { id: string }
    const { paymentMethod, tip } = req.body as { paymentMethod: string; tip?: number }
    const order = await prisma.posOrder.findUnique({ where: { id } })
    if (!order) return { success: false, error: 'Not found' }
    const tipAmt = tip ?? 0
    const updated = await prisma.posOrder.update({
      where: { id },
      data: { status: 'paid', paymentMethod, tip: tipAmt, total: Number(order.total) + tipAmt, paidAt: new Date() },
    })
    return { success: true, data: updated }
  })
}
