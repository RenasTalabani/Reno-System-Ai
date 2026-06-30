import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function laundryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [received, ready, completed] = await Promise.all([
      prisma.lndOrder.count({ where: { tenantId, status: 'received' } }),
      prisma.lndOrder.count({ where: { tenantId, status: 'ready' } }),
      prisma.lndOrder.count({ where: { tenantId, status: 'delivered' } }),
    ])
    return { success: true, data: { received, ready, completed } }
  })

  app.get('/orders', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const orders = await prisma.lndOrder.findMany({ where: where as never, orderBy: { receivedAt: 'desc' }, take: 50 })
    return { success: true, data: orders }
  })

  app.post('/orders', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const orderRef = `LND-${Date.now().toString(36).toUpperCase()}`
    const order = await prisma.lndOrder.create({ data: { tenantId, orderRef, ...data } as never })
    return { success: true, data: order }
  })

  app.patch('/orders/:id/ready', async (req) => {
    const { id } = req.params as { id: string }
    const order = await prisma.lndOrder.update({ where: { id }, data: { status: 'ready', readyAt: new Date() } })
    return { success: true, data: order }
  })

  app.patch('/orders/:id/deliver', async (req) => {
    const { id } = req.params as { id: string }
    const order = await prisma.lndOrder.update({ where: { id }, data: { status: 'delivered' } })
    return { success: true, data: order }
  })
}
