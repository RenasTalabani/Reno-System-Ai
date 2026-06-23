import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function biKpiRoutes(app: FastifyInstance) {
  // GET /analytics/kpis — cross-module KPI aggregation engine
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { period = 'monthly' } = req.query as any

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const last30 = new Date(now.getTime() - 30 * 86400000)

    const [
      // Finance — use SalesInvoice for revenue, FinVendorBill for expenses
      revenueThisMonth,
      revenueLastMonth,
      expensesThisMonth,
      openInvoicesCount,
      openInvoicesValue,
      // Sales
      salesOrdersThisMonth,
      salesOrdersValue,
      quotationsOpen,
      // HR
      totalEmployees,
      newHiresThisMonth,
      openLeaveRequests,
      // Inventory
      totalStockValue,
      lowStockCount,
      // Procurement
      openPOCount,
      openPOValue,
      // Manufacturing
      activeOrders,
      completedOrders30d,
      pendingQC,
      // Projects
      activeProjects,
    ] = await Promise.all([
      // Revenue this month from invoices
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      // Revenue last month
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
        _sum: { total: true },
      }),
      // Expenses this month (vendor bills)
      prisma.finVendorBill.aggregate({
        where: { tenantId, status: { in: ['posted', 'partial', 'paid'] }, date: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      // Open invoices
      prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, deletedAt: null } }),
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial'] }, deletedAt: null },
        _sum: { total: true },
      }),
      // Sales orders this month
      prisma.salesOrder.count({ where: { tenantId, createdAt: { gte: thisMonthStart }, deletedAt: null } }),
      prisma.salesOrder.aggregate({
        where: { tenantId, createdAt: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      // Open quotations
      prisma.salesQuotation.count({ where: { tenantId, status: { in: ['draft', 'sent'] }, deletedAt: null } }),
      // HR
      prisma.hrEmployee.count({ where: { tenantId, status: 'active', deletedAt: null } }),
      prisma.hrEmployee.count({ where: { tenantId, hireDate: { gte: thisMonthStart }, deletedAt: null } }),
      prisma.hrEmployee.count({ where: { tenantId, status: 'on_leave', deletedAt: null } }),
      // Inventory
      prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
      prisma.invStockBalance.count({ where: { tenantId, onHand: { lte: 0 } } }),
      // Procurement
      prisma.procOrder.count({ where: { tenantId, status: { in: ['draft', 'submitted', 'approved', 'sent'] }, deletedAt: null } }),
      prisma.procOrder.aggregate({
        where: { tenantId, status: { in: ['draft', 'submitted', 'approved', 'sent'] }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      // Manufacturing
      prisma.mfgOrder.count({ where: { tenantId, status: { in: ['released', 'in_progress'] }, deletedAt: null } }),
      prisma.mfgOrder.count({ where: { tenantId, status: 'completed', actualEnd: { gte: last30 }, deletedAt: null } }),
      prisma.mfgQualityCheck.count({ where: { tenantId, status: 'pending', deletedAt: null } }),
      // Projects
      prisma.pmProject.count({ where: { tenantId, status: { in: ['planning', 'active'] }, deletedAt: null } }),
    ])

    const revenueThisMonthVal = Number(revenueThisMonth._sum.total ?? 0)
    const revenueLastMonthVal = Number(revenueLastMonth._sum.total ?? 0)
    const expensesVal = Number(expensesThisMonth._sum.total ?? 0)
    const revenueChange = revenueLastMonthVal > 0
      ? ((revenueThisMonthVal - revenueLastMonthVal) / revenueLastMonthVal) * 100
      : 0

    return reply.send({
      success: true,
      data: {
        period,
        generatedAt: now.toISOString(),
        finance: {
          revenueThisMonth: revenueThisMonthVal,
          revenueLastMonth: revenueLastMonthVal,
          revenueChangePercent: Math.round(revenueChange * 100) / 100,
          expensesThisMonth: expensesVal,
          grossMargin: revenueThisMonthVal > 0
            ? Math.round(((revenueThisMonthVal - expensesVal) / revenueThisMonthVal) * 10000) / 100
            : 0,
          openInvoicesCount,
          openInvoicesValue: Number(openInvoicesValue._sum.total ?? 0),
        },
        sales: {
          ordersThisMonth: salesOrdersThisMonth,
          ordersValueThisMonth: Number(salesOrdersValue._sum.total ?? 0),
          quotationsOpen,
        },
        hr: {
          totalEmployees,
          newHiresThisMonth,
          onLeaveNow: openLeaveRequests,
        },
        inventory: {
          totalStockValue: Number(totalStockValue._sum.totalValue ?? 0),
          lowStockProducts: lowStockCount,
        },
        procurement: {
          openPurchaseOrders: openPOCount,
          openPOValue: Number(openPOValue._sum.totalAmount ?? 0),
        },
        manufacturing: {
          activeOrders,
          completedLast30Days: completedOrders30d,
          pendingQualityChecks: pendingQC,
        },
        projects: {
          activeProjects,
        },
      },
    })
  })

  // GET /analytics/kpis/snapshots — historical KPI snapshots
  app.get('/snapshots', async (req, reply) => {
    const { tenantId } = req as any
    const { module, kpiKey, period = 'monthly', limit = '12' } = req.query as any

    const where: any = { tenantId, period }
    if (module) where.module = module
    if (kpiKey) where.kpiKey = kpiKey

    const snapshots = await prisma.biKpiSnapshot.findMany({
      where,
      orderBy: { periodDate: 'desc' },
      take: Number(limit),
    })

    return reply.send({ success: true, data: snapshots })
  })

  // POST /analytics/kpis/snapshot — capture current KPIs as a snapshot
  app.post('/snapshot', async (req, reply) => {
    const { tenantId } = req as any
    const { period = 'monthly' } = req.body as any

    const now = new Date()
    const periodDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthStart = periodDate

    const [revenue, expenses, employees, stockValue] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.finVendorBill.aggregate({
        where: { tenantId, status: { in: ['posted', 'partial', 'paid'] }, date: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.hrEmployee.count({ where: { tenantId, status: 'active', deletedAt: null } }),
      prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
    ])

    const kpis = [
      { module: 'finance', kpiKey: 'revenue', value: Number(revenue._sum.total ?? 0) },
      { module: 'finance', kpiKey: 'expenses', value: Number(expenses._sum.total ?? 0) },
      { module: 'hr', kpiKey: 'headcount', value: employees },
      { module: 'inventory', kpiKey: 'stock_value', value: Number(stockValue._sum.totalValue ?? 0) },
    ]

    const created = await Promise.all(
      kpis.map(k =>
        prisma.biKpiSnapshot.upsert({
          where: { tenantId_module_kpiKey_period_periodDate: { tenantId, module: k.module, kpiKey: k.kpiKey, period, periodDate } },
          create: { tenantId, module: k.module, kpiKey: k.kpiKey, period, periodDate, value: k.value },
          update: { value: k.value },
        })
      )
    )

    return reply.send({ success: true, data: created })
  })
}
