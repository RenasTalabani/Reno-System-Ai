import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI } from '../../../brain/provider.js'
import { buildExecutiveContext, EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'

export async function aiDigitalTwinRoutes(app: FastifyInstance) {
  // Get latest digital twin
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const twin = await prisma.aiDigitalTwin.findFirst({
      where: { tenantId },
      orderBy: { computedAt: 'desc' },
    })
    return reply.send({ success: true, data: twin })
  })

  // Get twin history
  app.get('/history', async (req, reply) => {
    const { tenantId } = req as any
    const { limit = 30 } = req.query as any
    const history = await prisma.aiDigitalTwin.findMany({
      where: { tenantId },
      orderBy: { computedAt: 'desc' },
      take: Number(limit),
      select: { id: true, healthScore: true, riskScore: true, growthScore: true, efficiencyScore: true, overallScore: true, computedAt: true },
    })
    return reply.send({ success: true, data: history })
  })

  // Compute (refresh) digital twin
  app.post('/compute', async (req, reply) => {
    const { tenantId, userId } = req as any

    const ctx = await buildExecutiveContext(tenantId)

    // Compute scores (0-100)
    const f = ctx.financials
    const hr = ctx.hr
    const hd = ctx.helpdesk

    // Health score: weighted composite
    const revenueGrowthScore = Math.min(100, Math.max(0, 50 + f.revenueGrowthPct * 2))
    const marginScore = Math.min(100, f.grossMarginPct * 1.5)
    const cashScore = f.cashBalance > 0 ? Math.min(100, 60 + (f.cashBalance / 10000) * 10) : 30
    const financialScore = Math.round((revenueGrowthScore * 0.4 + marginScore * 0.35 + cashScore * 0.25))

    const attendanceScore = hr.attendanceRate > 0 ? Math.min(100, hr.attendanceRate) : 75
    const hrScore = Math.round(attendanceScore * 0.6 + (hr.openPositions === 0 ? 80 : Math.max(30, 80 - hr.openPositions * 5)) * 0.4)

    const csatScore = hd.avgCsatScore > 0 ? Math.round((hd.avgCsatScore / 5) * 100) : 70
    const slaScore = hd.slaBreaches === 0 ? 100 : Math.max(20, 100 - hd.slaBreaches * 10)
    const supportScore = Math.round(csatScore * 0.6 + slaScore * 0.4)

    const salesScore = Math.min(100, Math.max(0, ctx.sales.winRate > 0 ? ctx.sales.winRate : 50))

    const healthScore = Math.round((financialScore * 0.35 + hrScore * 0.25 + supportScore * 0.2 + salesScore * 0.2))
    const riskScore = Math.min(100, (f.overdueInvoices * 5) + (hd.slaBreaches * 8) + (hr.openPositions * 3))
    const growthScore = Math.min(100, Math.max(0, 50 + f.revenueGrowthPct * 3 + ctx.sales.wonDealsThisMonth * 2))
    const efficiencyScore = Math.round((supportScore * 0.4 + (hr.attendanceRate > 0 ? hr.attendanceRate : 75) * 0.3 + (ctx.projects.activeProjects > 0 ? 70 : 60) * 0.3))
    const overallScore = Math.round((healthScore * 0.3 + Math.max(0, 100 - riskScore) * 0.25 + growthScore * 0.25 + efficiencyScore * 0.2))

    // Generate AI insights
    const providerCfg = await prisma.brainProviderConfig.findFirst({ where: { tenantId, isActive: true, isDefault: true } })
    const aiConfig = { provider: (providerCfg?.provider as any) ?? 'mock', apiKey: providerCfg?.apiKey ?? undefined, baseUrl: providerCfg?.baseUrl ?? undefined, model: providerCfg?.model ?? 'claude-sonnet-4-6' }

    const twinData = {
      scores: { health: healthScore, risk: riskScore, growth: growthScore, efficiency: efficiencyScore, overall: overallScore },
      financials: ctx.financials, hr: ctx.hr, helpdesk: ctx.helpdesk, sales: ctx.sales,
    }

    let insights = 'AI insights unavailable — configure provider.'
    let topRisks: any[] = []
    let topOpportunities: any[] = []

    try {
      const prompt = `Analyze this company's digital twin data and provide:
1. A 2-sentence executive insights summary
2. Top 3 risks (as JSON array: [{title, severity: high/medium/low, description}])
3. Top 3 opportunities (as JSON array: [{title, impact: high/medium/low, description}])

Data: ${JSON.stringify(twinData)}

Respond in this exact JSON format:
{"summary": "...", "risks": [...], "opportunities": [...]}`

      const res = await callAI([{ role: 'user', content: prompt }], { systemPrompt: EXECUTIVE_PERSONAS['ceo']!.systemPromptPrefix, maxTokens: 600, temperature: 0.1 }, aiConfig)
      const parsed = JSON.parse(res.content.replace(/```json\n?|\n?```/g, '').trim())
      insights = parsed.summary ?? insights
      topRisks = parsed.risks ?? []
      topOpportunities = parsed.opportunities ?? []
    } catch {}

    const twin = await prisma.aiDigitalTwin.create({
      data: {
        tenantId,
        healthScore,
        riskScore,
        growthScore,
        efficiencyScore,
        overallScore,
        financials: ctx.financials as any,
        salesMetrics: ctx.sales as any,
        hrMetrics: ctx.hr as any,
        operationsMetrics: { projects: ctx.projects, inventory: ctx.inventory } as any,
        customerMetrics: ctx.crm as any,
        inventoryMetrics: ctx.inventory as any,
        projectMetrics: ctx.projects as any,
        communicationMetrics: {} as any,
        aiInsightsSummary: insights,
        topRisks: topRisks as any,
        topOpportunities: topOpportunities as any,
      },
    })

    await prisma.brainAuditLog.create({
      data: {
        tenantId, userId, action: 'compute_digital_twin', module: 'ai_executive',
        entityType: 'digital_twin', entityId: twin.id,
        metadata: { overallScore, healthScore, riskScore } as any,
      },
    })

    return reply.send({ success: true, data: twin })
  })
}
