import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function biInsightRoutes(app: FastifyInstance) {
  // GET /analytics/insights
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { module, type, severity, unreadOnly, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, isDismissed: false }
    if (module) where.module = module
    if (type) where.type = type
    if (severity) where.severity = severity
    if (unreadOnly === 'true') where.isRead = false

    const [items, total] = await Promise.all([
      prisma.biAiInsight.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: Number(limit),
      }),
      prisma.biAiInsight.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /analytics/insights/generate — AI insight generation engine
  app.post('/generate', async (req, reply) => {
    const { tenantId } = req as any

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const last7 = new Date(now.getTime() - 7 * 86400000)

    const insights: any[] = []

    const [
      revenueThis, revenueLast,
      lowStock, zeroStock,
      openInvoicesOld,
      failedQC,
      overdueDeliveries,
    ] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: thisMonthStart }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.salesInvoice.aggregate({
        where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.invStockBalance.count({ where: { tenantId, onHand: { gt: 0, lte: 10 } } }),
      prisma.invStockBalance.count({ where: { tenantId, onHand: { lte: 0 } } }),
      prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, dueDate: { lt: now }, deletedAt: null } }),
      prisma.mfgQualityCheck.count({ where: { tenantId, status: 'failed', createdAt: { gte: last7 }, deletedAt: null } }),
      prisma.procOrder.count({ where: { tenantId, status: { in: ['approved', 'sent'] }, expectedDate: { lt: now }, deletedAt: null } }),
    ])

    const revenueThisVal = Number(revenueThis._sum.total ?? 0)
    const revenueLastVal = Number(revenueLast._sum.total ?? 0)

    // Revenue trend anomaly
    if (revenueLastVal > 0) {
      const changePercent = ((revenueThisVal - revenueLastVal) / revenueLastVal) * 100
      if (changePercent < -20) {
        insights.push({
          tenantId,
          type: 'anomaly',
          module: 'finance',
          severity: 'critical',
          title: 'Revenue Drop Detected',
          description: `Revenue this month is ${Math.abs(changePercent).toFixed(1)}% below last month. Immediate review recommended.`,
          metric: 'monthly_revenue',
          metricValue: revenueThisVal,
          confidence: 0.92,
          actionable: true,
          action: 'Review sales pipeline and check for lost customers or cancelled orders.',
        })
      } else if (changePercent > 30) {
        insights.push({
          tenantId,
          type: 'trend',
          module: 'finance',
          severity: 'info',
          title: 'Strong Revenue Growth',
          description: `Revenue is up ${changePercent.toFixed(1)}% compared to last month.`,
          metric: 'monthly_revenue',
          metricValue: revenueThisVal,
          confidence: 0.95,
          actionable: false,
        })
      }
    }

    // Inventory risk
    if (zeroStock > 5) {
      insights.push({
        tenantId,
        type: 'alert',
        module: 'inventory',
        severity: 'warning',
        title: 'Multiple Products Out of Stock',
        description: `${zeroStock} products currently have zero stock. Revenue risk if these are active sale items.`,
        metric: 'out_of_stock_count',
        metricValue: zeroStock,
        confidence: 1.0,
        actionable: true,
        action: 'Run MRP analysis and create purchase requisitions for zero-stock items.',
      })
    }

    if (lowStock > 10) {
      insights.push({
        tenantId,
        type: 'forecast',
        module: 'inventory',
        severity: 'warning',
        title: 'Low Stock Forecast Alert',
        description: `${lowStock} products are approaching reorder levels and may run out within days.`,
        metric: 'low_stock_count',
        metricValue: lowStock,
        confidence: 0.85,
        actionable: true,
        action: 'Review reorder rules and consider running MRP to generate automatic requisitions.',
      })
    }

    // AR collection risk
    if (openInvoicesOld > 3) {
      insights.push({
        tenantId,
        type: 'alert',
        module: 'finance',
        severity: 'warning',
        title: 'Overdue Invoices Detected',
        description: `${openInvoicesOld} invoices are past their due date. Cash flow impact likely.`,
        metric: 'overdue_invoices',
        metricValue: openInvoicesOld,
        confidence: 1.0,
        actionable: true,
        action: 'Follow up with customers on overdue invoices. Consider automated payment reminders.',
      })
    }

    // Quality issues
    if (failedQC > 2) {
      insights.push({
        tenantId,
        type: 'anomaly',
        module: 'manufacturing',
        severity: 'critical',
        title: 'Quality Failure Spike',
        description: `${failedQC} quality checks failed in the last 7 days. Production quality may be degrading.`,
        metric: 'failed_qc_7d',
        metricValue: failedQC,
        confidence: 0.9,
        actionable: true,
        action: 'Review failed quality checks, identify root cause. Consider work center maintenance audit.',
      })
    }

    // Procurement delays
    if (overdueDeliveries > 0) {
      insights.push({
        tenantId,
        type: 'alert',
        module: 'procurement',
        severity: 'warning',
        title: 'Overdue Supplier Deliveries',
        description: `${overdueDeliveries} purchase orders have passed their expected delivery date.`,
        metric: 'overdue_deliveries',
        metricValue: overdueDeliveries,
        confidence: 1.0,
        actionable: true,
        action: 'Contact suppliers for delivery updates. Update expected delivery dates or escalate.',
      })
    }

    const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const created = await Promise.all(
      insights.map(i =>
        prisma.biAiInsight.create({
          data: { ...i, validUntil },
        })
      )
    )

    return reply.send({ success: true, data: created, meta: { generated: created.length } })
  })

  // PATCH /analytics/insights/:id/read
  app.patch('/:id/read', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const insight = await prisma.biAiInsight.findFirst({ where: { id, tenantId } })
    if (!insight) return reply.code(404).send({ success: false, error: 'Insight not found' })

    await prisma.biAiInsight.update({ where: { id }, data: { isRead: true } })
    return reply.send({ success: true })
  })

  // PATCH /analytics/insights/:id/dismiss
  app.patch('/:id/dismiss', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const insight = await prisma.biAiInsight.findFirst({ where: { id, tenantId } })
    if (!insight) return reply.code(404).send({ success: false, error: 'Insight not found' })

    await prisma.biAiInsight.update({ where: { id }, data: { isDismissed: true } })
    return reply.send({ success: true })
  })

  // POST /analytics/insights/mark-all-read
  app.post('/mark-all-read', async (req, reply) => {
    const { tenantId } = req as any

    await prisma.biAiInsight.updateMany({ where: { tenantId, isRead: false }, data: { isRead: true } })
    return reply.send({ success: true })
  })
}
