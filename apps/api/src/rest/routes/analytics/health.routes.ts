import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function biHealthRoutes(app: FastifyInstance) {
  // GET /analytics/health — latest company health score
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const latest = await prisma.biCompanyHealthScore.findFirst({
      where: { tenantId },
      orderBy: { snapshotDate: 'desc' },
    })

    const history = await prisma.biCompanyHealthScore.findMany({
      where: { tenantId },
      orderBy: { snapshotDate: 'desc' },
      take: 12,
      select: { snapshotDate: true, overallScore: true, financialScore: true, salesScore: true, operationsScore: true, hrScore: true },
    })

    return reply.send({ success: true, data: { latest, history } })
  })

  // POST /analytics/health/compute — compute and save health score
  app.post('/compute', async (req, reply) => {
    const { tenantId } = req as any

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const snapshotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      revenueThis, revenueLast, expenses,
      totalEmployees,
      openOrders,
      salesOrders, openInvoices,
      stockValue, lowStockCount,
      activeProjects, onHoldProjects,
      activeOrMfgOrders, failedQC,
    ] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.finVendorBill.aggregate({
        where: { tenantId, status: { in: ['posted', 'partial', 'paid'] }, date: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.hrEmployee.count({ where: { tenantId, status: 'active', deletedAt: null } }),
      prisma.salesOrder.count({ where: { tenantId, status: { in: ['confirmed', 'processing'] }, deletedAt: null } }),
      prisma.salesOrder.count({ where: { tenantId, createdAt: { gte: thisMonthStart }, deletedAt: null } }),
      prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, dueDate: { lt: now }, deletedAt: null } }),
      prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
      prisma.invStockBalance.count({ where: { tenantId, onHand: { lte: 0 } } }),
      prisma.pmProject.count({ where: { tenantId, status: 'active', deletedAt: null } }),
      prisma.pmProject.count({ where: { tenantId, status: 'on_hold', deletedAt: null } }),
      prisma.mfgOrder.count({ where: { tenantId, status: { in: ['released', 'in_progress'] }, deletedAt: null } }),
      prisma.mfgQualityCheck.count({ where: { tenantId, status: 'failed', createdAt: { gte: thisMonthStart }, deletedAt: null } }),
    ])

    const revenueThisVal = Number(revenueThis._sum.total ?? 0)
    const revenueLastVal = Number(revenueLast._sum.total ?? 0)
    const expensesVal = Number(expenses._sum.total ?? 0)
    const stockVal = Number(stockValue._sum.totalValue ?? 0)

    const revenueGrowth = revenueLastVal > 0 ? ((revenueThisVal - revenueLastVal) / revenueLastVal) * 100 : 0
    const grossMargin = revenueThisVal > 0 ? ((revenueThisVal - expensesVal) / revenueThisVal) * 100 : 0

    const financialScore = Math.min(100, Math.max(0,
      50 + revenueGrowth * 1.5 + (grossMargin > 20 ? 20 : grossMargin) - openInvoices * 3
    ))

    const salesScore = Math.min(100, Math.max(0,
      60 + Math.min(30, salesOrders * 3) - openInvoices * 2
    ))

    const hrScore = Math.min(100, Math.max(0,
      totalEmployees > 0 ? 70 + Math.min(20, totalEmployees) - (onHoldProjects * 5) : 50
    ))

    const inventoryScore = Math.min(100, Math.max(0,
      stockVal > 0 ? 80 - (lowStockCount * 4) : 50
    ))

    const operationsScore = Math.min(100, Math.max(0,
      70 + (activeOrMfgOrders > 0 ? 10 : 0) - (failedQC * 8)
    ))

    const overallScore = Math.round(
      (financialScore * 0.30 + salesScore * 0.25 + operationsScore * 0.20 + hrScore * 0.15 + inventoryScore * 0.10)
    )

    const aiTrend = revenueGrowth > 5 ? 'improving' : revenueGrowth < -5 ? 'declining' : 'stable'
    const aiRiskLevel = overallScore >= 75 ? 'low' : overallScore >= 55 ? 'medium' : overallScore >= 35 ? 'high' : 'critical'

    const aiInsights = buildInsightText(overallScore, financialScore, salesScore, hrScore, inventoryScore, operationsScore, aiTrend)

    const score = await prisma.biCompanyHealthScore.upsert({
      where: { tenantId_snapshotDate: { tenantId, snapshotDate } },
      create: {
        tenantId,
        snapshotDate,
        overallScore,
        financialScore: Math.round(financialScore),
        salesScore: Math.round(salesScore),
        operationsScore: Math.round(operationsScore),
        hrScore: Math.round(hrScore),
        inventoryScore: Math.round(inventoryScore),
        revenue: revenueThisVal,
        expenses: expensesVal,
        grossMargin: grossMargin / 100,
        headcount: totalEmployees,
        openOrders,
        inventoryValue: stockVal,
        aiTrend,
        aiRiskLevel,
        aiInsights,
        aiRecommendations: buildRecommendations(financialScore, salesScore, hrScore, inventoryScore, operationsScore),
      },
      update: {
        overallScore,
        financialScore: Math.round(financialScore),
        salesScore: Math.round(salesScore),
        operationsScore: Math.round(operationsScore),
        hrScore: Math.round(hrScore),
        inventoryScore: Math.round(inventoryScore),
        revenue: revenueThisVal,
        expenses: expensesVal,
        grossMargin: grossMargin / 100,
        headcount: totalEmployees,
        openOrders,
        inventoryValue: stockVal,
        aiTrend,
        aiRiskLevel,
        aiInsights,
        aiRecommendations: buildRecommendations(financialScore, salesScore, hrScore, inventoryScore, operationsScore),
      },
    })

    return reply.send({ success: true, data: score })
  })

  // GET /analytics/health/scorecards — module scorecards
  app.get('/scorecards', async (req, reply) => {
    const { tenantId } = req as any

    const latest = await prisma.biCompanyHealthScore.findFirst({
      where: { tenantId },
      orderBy: { snapshotDate: 'desc' },
    })

    if (!latest) {
      return reply.send({ success: true, data: [] })
    }

    const scorecards = [
      { module: 'Finance', score: Number(latest.financialScore ?? 0), icon: 'BarChart3', color: 'blue' },
      { module: 'Sales', score: Number(latest.salesScore ?? 0), icon: 'TrendingUp', color: 'green' },
      { module: 'Operations', score: Number(latest.operationsScore ?? 0), icon: 'Factory', color: 'orange' },
      { module: 'HR', score: Number(latest.hrScore ?? 0), icon: 'Users', color: 'purple' },
      { module: 'Inventory', score: Number(latest.inventoryScore ?? 0), icon: 'Package', color: 'yellow' },
    ]

    return reply.send({ success: true, data: scorecards })
  })
}

function buildInsightText(overall: number, finance: number, sales: number, hr: number, inventory: number, ops: number, trend: string): string {
  const parts = []
  if (overall >= 75) parts.push('Company health is strong.')
  else if (overall >= 55) parts.push('Company health is moderate with areas to improve.')
  else parts.push('Company health needs immediate attention.')

  if (finance < 50) parts.push('Financial performance is below target.')
  if (sales < 50) parts.push('Sales pipeline needs reinforcement.')
  if (inventory < 50) parts.push('Inventory levels are critical.')
  if (ops < 50) parts.push('Production quality issues detected.')

  parts.push(`Overall trend: ${trend}.`)
  return parts.join(' ')
}

function buildRecommendations(finance: number, sales: number, hr: number, inventory: number, ops: number): any[] {
  const recs = []
  if (finance < 60) recs.push({ priority: 'high', area: 'Finance', action: 'Review pricing and collect overdue invoices' })
  if (sales < 60) recs.push({ priority: 'high', area: 'Sales', action: 'Accelerate pipeline and follow up on open quotations' })
  if (inventory < 60) recs.push({ priority: 'medium', area: 'Inventory', action: 'Run MRP and replenish low-stock products' })
  if (ops < 60) recs.push({ priority: 'medium', area: 'Manufacturing', action: 'Schedule work center maintenance and review QC processes' })
  if (hr < 60) recs.push({ priority: 'low', area: 'HR', action: 'Review workforce planning and retention programs' })
  return recs
}
