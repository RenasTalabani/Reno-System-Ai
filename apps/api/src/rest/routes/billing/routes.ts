import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

export async function billingRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/plans', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const plans = await prisma.billingPlan.findMany({ where: { tenantId }, orderBy: { price: 'asc' } })
    return { success: true, data: plans }
  })

  app.post('/plans', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const data = req.body as Record<string, unknown>
    const plan = await prisma.billingPlan.create({ data: { tenantId, ...data } as never })
    return { success: true, data: plan }
  })

  app.get('/subscriptions', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const subs = await prisma.billingSubscription.findMany({
      where: { tenantId }, include: { plan: true }, orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: subs }
  })

  app.post('/subscriptions', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const { planId, ...rest } = req.body as Record<string, unknown>
    const sub = await prisma.billingSubscription.create({
      data: { tenantId, planId: planId as string, ...rest } as never,
      include: { plan: true },
    })
    return { success: true, data: sub }
  })

  app.get('/invoices', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const q = req.query as Record<string, string>
    const invoices = await prisma.billingInvoice.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: invoices }
  })

  app.get('/invoices/:id', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const { id } = req.params as { id: string }
    const invoice = await prisma.billingInvoice.findFirst({ where: { id, tenantId }, include: { items: true } })
    return { success: true, data: invoice }
  })

  app.patch('/invoices/:id/status', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const invoice = await prisma.billingInvoice.update({
      where: { id }, data: { status, ...(status === 'paid' ? { paidAt: new Date() } : {}) },
    })
    return { success: true, data: invoice }
  })

  app.get('/payment-methods', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const methods = await prisma.billingPaymentMethod.findMany({ where: { tenantId } })
    return { success: true, data: methods }
  })

  app.get('/summary', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const [activeSubs, pendingInvoices, totalRevenue] = await Promise.all([
      prisma.billingSubscription.count({ where: { tenantId, status: 'active' } }),
      prisma.billingInvoice.count({ where: { tenantId, status: 'open' } }),
      prisma.billingInvoice.aggregate({ where: { tenantId, status: 'paid' }, _sum: { total: true } }),
    ])
    return { success: true, data: { activeSubs, pendingInvoices, totalRevenue: totalRevenue._sum.total ?? 0 } }
  })
}
