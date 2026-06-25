import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildExecutiveContext, EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'

export async function aiExecDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const [ctx, latestTwin, pendingProposals, pendingRecs, latestReports, latestPredictions, recentDecisions, recentScenarios] = await Promise.all([
      buildExecutiveContext(tenantId),
      prisma.aiDigitalTwin.findFirst({ where: { tenantId }, orderBy: { computedAt: 'desc' } }),
      prisma.aiExecProposal.count({ where: { tenantId, status: 'pending_approval', deletedAt: null } }),
      prisma.aiExecRecommendation.count({ where: { tenantId, status: 'pending', deletedAt: null } }),
      prisma.aiExecReport.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, reportType: true, title: true, createdAt: true } }),
      prisma.aiBizPrediction.findMany({ where: { tenantId }, orderBy: { computedAt: 'desc' }, take: 6 }),
      prisma.aiExecDecision.findMany({ where: { tenantId, deletedAt: null }, orderBy: { decisionDate: 'desc' }, take: 5 }),
      prisma.aiScenario.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, confidence: true, status: true, createdAt: true } }),
    ])

    const executives = Object.entries(EXECUTIVE_PERSONAS).map(([role, persona]) => ({
      role, name: persona.name, title: persona.role,
    }))

    return reply.send({
      success: true,
      data: {
        company: ctx.tenant,
        digitalTwin: latestTwin,
        kpis: {
          healthScore: latestTwin?.overallScore ?? null,
          riskScore: latestTwin?.riskScore ?? null,
          growthScore: latestTwin?.growthScore ?? null,
          efficiencyScore: latestTwin?.efficiencyScore ?? null,
        },
        pendingApprovals: { proposals: pendingProposals, recommendations: pendingRecs, total: pendingProposals + pendingRecs },
        financials: ctx.financials,
        sales: ctx.sales,
        hr: ctx.hr,
        helpdesk: ctx.helpdesk,
        executives,
        recentReports: latestReports,
        latestPredictions,
        recentDecisions,
        recentScenarios,
        generatedAt: new Date().toISOString(),
      },
    })
  })

  // Executive scorecards — aggregate KPIs per role
  app.get('/scorecards', async (req, reply) => {
    const { tenantId } = req as any
    const ctx = await buildExecutiveContext(tenantId)
    const twin = await prisma.aiDigitalTwin.findFirst({ where: { tenantId }, orderBy: { computedAt: 'desc' } })

    const scorecards = [
      {
        role: 'cfo',
        name: 'Morgan (AI CFO)',
        metrics: [
          { label: 'Revenue (Month)', value: `$${ctx.financials.revenueThisMonth.toLocaleString()}`, trend: ctx.financials.revenueGrowthPct >= 0 ? 'up' : 'down' },
          { label: 'Gross Margin', value: `${ctx.financials.grossMarginPct}%`, trend: 'neutral' },
          { label: 'Cash Balance', value: `$${ctx.financials.cashBalance.toLocaleString()}`, trend: 'neutral' },
          { label: 'Overdue Invoices', value: ctx.financials.overdueInvoices, trend: ctx.financials.overdueInvoices > 0 ? 'down' : 'up' },
        ],
        score: twin?.healthScore ?? null,
      },
      {
        role: 'sales_director',
        name: 'Sam (AI Sales Director)',
        metrics: [
          { label: 'Active Orders', value: ctx.sales.activeOrders, trend: 'neutral' },
          { label: 'Won Deals (Month)', value: ctx.sales.wonDealsThisMonth, trend: 'neutral' },
          { label: 'Win Rate', value: `${ctx.sales.winRate}%`, trend: ctx.sales.winRate >= 50 ? 'up' : 'down' },
          { label: 'Pipelines', value: ctx.sales.pipelineCount, trend: 'neutral' },
        ],
        score: twin?.growthScore ?? null,
      },
      {
        role: 'chro',
        name: 'Riley (AI CHRO)',
        metrics: [
          { label: 'Headcount', value: ctx.hr.headcount, trend: 'neutral' },
          { label: 'Open Positions', value: ctx.hr.openPositions, trend: ctx.hr.openPositions > 5 ? 'down' : 'neutral' },
          { label: 'Attendance Rate', value: `${ctx.hr.attendanceRate}%`, trend: ctx.hr.attendanceRate >= 90 ? 'up' : 'down' },
          { label: 'Pending Leaves', value: ctx.hr.pendingLeaveRequests, trend: 'neutral' },
        ],
        score: twin?.efficiencyScore ?? null,
      },
      {
        role: 'support_director',
        name: 'Quinn (AI Support Director)',
        metrics: [
          { label: 'Open Tickets', value: ctx.helpdesk.openTickets, trend: ctx.helpdesk.openTickets > 20 ? 'down' : 'up' },
          { label: 'Avg CSAT', value: `${ctx.helpdesk.avgCsatScore}/5`, trend: ctx.helpdesk.avgCsatScore >= 4 ? 'up' : 'down' },
          { label: 'SLA Breaches', value: ctx.helpdesk.slaBreaches, trend: ctx.helpdesk.slaBreaches === 0 ? 'up' : 'down' },
        ],
        score: ctx.helpdesk.avgCsatScore > 0 ? Math.round((ctx.helpdesk.avgCsatScore / 5) * 100) : null,
      },
    ]

    return reply.send({ success: true, data: scorecards })
  })
}
