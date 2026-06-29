import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function sub2Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [plans, activeSubs, totalMrr] = await Promise.all([
      prisma.sub2Plan.count({ where: { tenantId, isActive: true } }),
      prisma.sub2Sub.count({ where: { tenantId, status: 'active' } }),
      prisma.sub2Sub.aggregate({ where: { tenantId, status: 'active' }, _sum: { mrr: true } }),
    ])
    return { success: true, data: { activePlans: plans, activeSubscriptions: activeSubs, totalMrr: totalMrr._sum.mrr ?? 0 } }
  })

  app.get('/plans', async (req) => {
    const { tenantId } = req
    const plans = await prisma.sub2Plan.findMany({
      where: { tenantId },
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { price: 'asc' },
    })
    return { success: true, data: plans }
  })

  app.post('/plans', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const plan = await prisma.sub2Plan.create({ data: { tenantId, ...data } as never })
    return { success: true, data: plan }
  })

  app.patch('/plans/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const plan = await prisma.sub2Plan.update({ where: { id }, data: data as never })
    return { success: true, data: plan }
  })

  app.get('/subscriptions', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const subs = await prisma.sub2Sub.findMany({
      where: where as never,
      include: { plan: { select: { name: true, price: true, interval: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: subs }
  })

  app.post('/subscriptions', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const plan = await prisma.sub2Plan.findUnique({ where: { id: data.planId as string } })
    const mrr = plan ? (plan.interval === 'annual' ? Number(plan.price) / 12 : Number(plan.price)) : 0
    const sub = await prisma.sub2Sub.create({ data: { tenantId, mrr, ...data } as never })
    return { success: true, data: sub }
  })

  app.patch('/subscriptions/:id/cancel', async (req) => {
    const { id } = req.params as { id: string }
    const sub = await prisma.sub2Sub.update({ where: { id }, data: { status: 'cancelled', cancelledAt: new Date() } })
    return { success: true, data: sub }
  })
}
