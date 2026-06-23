import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function biOverviewRoutes(app: FastifyInstance) {
  // GET /analytics/overview — executive dashboard overview (all modules)
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const last30 = new Date(now.getTime() - 30 * 86400000)

    const [
      healthScore,
      unreadInsights,
      criticalInsights,
      // Finance
      revenue, expenses,
      openInvoices,
      // Sales
      openOrders, closedOrdersMonth,
      // HR
      employees, onLeave,
      // Inventory
      stockValue, outOfStock,
      // Procurement
      pendingPOs,
      // Manufacturing
      activeMfgOrders, pendingQC,
      // Projects
      activeProjects,
      // Dashboards
      totalDashboards,
      totalReports,
    ] = await Promise.all([
      prisma.biCompanyHealthScore.findFirst({ where: { tenantId }, orderBy: { snapshotDate: 'desc' } }),
      prisma.biAiInsight.count({ where: { tenantId, isRead: false, isDismissed: false } }),
      prisma.biAiInsight.count({ where: { tenantId, severity: { in: ['critical', 'warning'] }, isDismissed: false } }),
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.finVendorBill.aggregate({
        where: { tenantId, status: { in: ['posted', 'partial', 'paid'] }, date: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, deletedAt: null } }),
      prisma.salesOrder.count({ where: { tenantId, status: { in: ['confirmed', 'processing'] }, deletedAt: null } }),
      prisma.salesOrder.count({ where: { tenantId, status: { in: ['delivered', 'completed'] }, createdAt: { gte: thisMonthStart }, deletedAt: null } }),
      prisma.hrEmployee.count({ where: { tenantId, status: 'active', deletedAt: null } }),
      prisma.hrEmployee.count({ where: { tenantId, status: 'on_leave', deletedAt: null } }),
      prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
      prisma.invStockBalance.count({ where: { tenantId, onHand: { lte: 0 } } }),
      prisma.procOrder.count({ where: { tenantId, status: { in: ['submitted', 'approved'] }, deletedAt: null } }),
      prisma.mfgOrder.count({ where: { tenantId, status: { in: ['released', 'in_progress'] }, deletedAt: null } }),
      prisma.mfgQualityCheck.count({ where: { tenantId, status: 'pending', deletedAt: null } }),
      prisma.pmProject.count({ where: { tenantId, status: 'active', deletedAt: null } }),
      prisma.biDashboard.count({ where: { tenantId, deletedAt: null } }),
      prisma.biReport.count({ where: { tenantId, deletedAt: null } }),
    ])

    const revenueVal = Number(revenue._sum.total ?? 0)
    const expensesVal = Number(expenses._sum.total ?? 0)

    return reply.send({
      success: true,
      data: {
        health: {
          overallScore: healthScore ? Number(healthScore.overallScore) : null,
          trend: healthScore?.aiTrend ?? 'stable',
          riskLevel: healthScore?.aiRiskLevel ?? 'medium',
          lastUpdated: healthScore?.createdAt ?? null,
        },
        alerts: {
          unreadInsights,
          criticalInsights,
        },
        finance: {
          revenueThisMonth: revenueVal,
          expensesThisMonth: expensesVal,
          netMargin: revenueVal > 0 ? Math.round(((revenueVal - expensesVal) / revenueVal) * 10000) / 100 : 0,
          openInvoicesCount: openInvoices,
        },
        sales: {
          openOrders,
          closedOrdersThisMonth: closedOrdersMonth,
        },
        hr: {
          totalEmployees: employees,
          onLeaveNow: onLeave,
        },
        inventory: {
          totalStockValue: Number(stockValue._sum.totalValue ?? 0),
          outOfStockProducts: outOfStock,
        },
        procurement: {
          pendingApprovalPOs: pendingPOs,
        },
        manufacturing: {
          activeOrders: activeMfgOrders,
          pendingQualityChecks: pendingQC,
        },
        projects: {
          activeProjects,
        },
        bi: {
          totalDashboards,
          totalReports,
        },
      },
    })
  })
}
