import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [
      totalRevenue,
      revenueThisMonth,
      revenueThisYear,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      quotationCount,
      orderCount,
      invoiceCount,
      activeSubscriptions,
      paidThisMonth,
      recentInvoices,
      topProducts,
    ] = await Promise.all([
      prisma.salesPayment.aggregate({ where: { tenantId, deletedAt: null }, _sum: { amountInBase: true } }),
      prisma.salesPayment.aggregate({ where: { tenantId, deletedAt: null, paidAt: { gte: startOfMonth } }, _sum: { amountInBase: true } }),
      prisma.salesPayment.aggregate({ where: { tenantId, deletedAt: null, paidAt: { gte: startOfYear } }, _sum: { amountInBase: true } }),
      prisma.salesInvoice.aggregate({ where: { tenantId, deletedAt: null, status: { not: 'void' } }, _sum: { total: true } }),
      prisma.salesInvoice.aggregate({ where: { tenantId, deletedAt: null, status: { in: ['paid','partial'] } }, _sum: { amountPaid: true } }),
      prisma.salesInvoice.aggregate({ where: { tenantId, deletedAt: null, status: { in: ['sent','partial'] } }, _sum: { amountDue: true } }),
      prisma.salesInvoice.count({ where: { tenantId, deletedAt: null, status: 'overdue', dueDate: { lt: now } } }),
      prisma.salesQuotation.count({ where: { tenantId, deletedAt: null } }),
      prisma.salesOrder.count({ where: { tenantId, deletedAt: null } }),
      prisma.salesInvoice.count({ where: { tenantId, deletedAt: null } }),
      prisma.salesSubscription.count({ where: { tenantId, deletedAt: null, status: 'active' } }),
      prisma.salesInvoice.count({ where: { tenantId, deletedAt: null, status: 'paid', paidAt: { gte: startOfMonth } } }),
      prisma.salesInvoice.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, number: true, status: true, total: true, amountDue: true, dueDate: true, createdAt: true },
      }),
      prisma.salesOrderItem.groupBy({
        by: ['productId'],
        where: { tenantId, deletedAt: null, productId: { not: null } },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ])

    // MRR from active subscriptions
    const mrrData = await prisma.salesSubscription.findMany({
      where: { tenantId, deletedAt: null, status: 'active' },
      select: { billingInterval: true, amount: true },
    })
    const mrr = mrrData.reduce((sum, s) => {
      const monthly = s.billingInterval === 'yearly' ? Number(s.amount) / 12
        : s.billingInterval === 'quarterly' ? Number(s.amount) / 3
        : Number(s.amount)
      return sum + monthly
    }, 0)

    // Enrich top products with names
    const productIds = topProducts.map(p => p.productId).filter(Boolean) as string[]
    const productNames = await prisma.salesProduct.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    const nameMap = Object.fromEntries(productNames.map(p => [p.id, p.name]))

    return reply.send({
      success: true,
      data: {
        revenue: {
          total: Number(totalRevenue._sum.amountInBase ?? 0),
          thisMonth: Number(revenueThisMonth._sum.amountInBase ?? 0),
          thisYear: Number(revenueThisYear._sum.amountInBase ?? 0),
          mrr: +mrr.toFixed(2),
          arr: +(mrr * 12).toFixed(2),
        },
        invoices: {
          totalInvoiced: Number(totalInvoiced._sum.total ?? 0),
          totalPaid: Number(totalPaid._sum.amountPaid ?? 0),
          totalOutstanding: Number(totalOutstanding._sum.amountDue ?? 0),
          overdueCount: totalOverdue,
          paidThisMonth,
        },
        counts: { quotations: quotationCount, orders: orderCount, invoices: invoiceCount, activeSubscriptions },
        recentInvoices,
        topProducts: topProducts.map(p => ({ productId: p.productId, name: nameMap[p.productId!] ?? 'Unknown', totalRevenue: Number(p._sum.total ?? 0) })),
      },
    })
  })

  // GET /sales/dashboard/revenue-trend?months=6
  app.get('/revenue-trend', async (req, reply) => {
    const { tenantId } = req as any
    const months = Math.min(parseInt((req.query as any).months ?? '6'), 24)
    const result = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date()
      const start = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 1)
      const agg = await prisma.salesPayment.aggregate({
        where: { tenantId, deletedAt: null, paidAt: { gte: start, lt: end } },
        _sum: { amountInBase: true },
      })
      result.push({ month: start.toISOString().slice(0, 7), revenue: Number(agg._sum.amountInBase ?? 0) })
    }
    return reply.send({ success: true, data: result })
  })
}
