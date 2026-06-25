import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI } from '../../../brain/provider.js'
import { buildExecutiveContext, formatExecutiveContextForPrompt, EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'

const REPORT_TYPES = ['board_meeting', 'ceo_weekly', 'daily_ops', 'scorecard', 'strategic_plan']

export async function aiExecReportsRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { reportType, limit = 20, offset = 0 } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (reportType) where.reportType = reportType
    const [reports, total] = await Promise.all([
      prisma.aiExecReport.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip: Number(offset) }),
      prisma.aiExecReport.count({ where }),
    ])
    return reply.send({ success: true, data: reports, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const report = await prisma.aiExecReport.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!report) return reply.status(404).send({ success: false, error: 'Report not found' })
    return reply.send({ success: true, data: report })
  })

  app.post('/generate', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { reportType = 'daily_ops', title } = req.body as any

    if (!REPORT_TYPES.includes(reportType)) return reply.status(400).send({ success: false, error: `Invalid reportType. Use: ${REPORT_TYPES.join(', ')}` })

    const ctx = await buildExecutiveContext(tenantId)
    const contextText = formatExecutiveContextForPrompt(ctx, 'ceo')

    const reportPrompts: Record<string, string> = {
      board_meeting: `Generate a comprehensive board meeting report for ${ctx.tenant.name}. Include:
1. Executive Summary (company status, key wins this period)
2. Financial Performance (revenue, margins, cash position, outlook)
3. Operations Review (sales, HR, support, projects — key metrics)
4. Strategic Initiatives (progress, blockers)
5. Risk Assessment (top 3 risks with mitigation plans)
6. Opportunities (top 3 growth opportunities)
7. Decisions Required from Board (if any)
8. Forward Outlook (next 30/60/90 days)
Be professional, data-driven, and concise. Use the provided company data.`,

      ceo_weekly: `Generate a CEO weekly report for ${ctx.tenant.name}. Include:
1. This Week's Headlines (top 5 KPI changes)
2. Revenue & Pipeline (weekly performance vs target)
3. Operational Highlights (what went well, what didn't)
4. People & Culture (key HR events)
5. Customer Pulse (CSAT trend, support volume)
6. Next Week's Priorities (top 3 focus areas)
Keep it scannable — use bullet points and clear section headers.`,

      daily_ops: `Generate a daily operations briefing for ${ctx.tenant.name}. Include:
1. Today's KPI Snapshot (key numbers to watch)
2. Active Orders & Pipeline (what needs attention)
3. Support Queue (open tickets, SLA status)
4. HR Today (attendance, pending leaves)
5. Immediate Actions Required (anything urgent)
Keep it brief and action-oriented.`,

      scorecard: `Generate an executive scorecard for ${ctx.tenant.name}. Create a structured scorecard with:
1. Financial Scorecard (revenue vs target, margin, cash — RAG status)
2. Sales Scorecard (pipeline health, win rate, deals closing)
3. Operations Scorecard (fulfillment, inventory, projects)
4. People Scorecard (headcount, attendance, open roles, leaves)
5. Customer Scorecard (CSAT, resolution time, open tickets)
6. Overall Company Health: GREEN / AMBER / RED (with justification)
Format with clear scores/ratings for each item.`,

      strategic_plan: `Generate a strategic planning report for ${ctx.tenant.name}. Include:
1. Strategic Position (where we are vs where we want to be)
2. SWOT Analysis based on current data
3. Key Strategic Themes for next 90 days
4. Priority Initiatives (top 5 with owner, timeline, expected impact)
5. Resource Requirements (people, budget, technology)
6. Success Metrics (how we'll know we're winning)
7. Risks to Strategy (top 3 with contingency plans)`,
    }

    const providerCfg = await prisma.brainProviderConfig.findFirst({ where: { tenantId, isActive: true, isDefault: true } })
    const aiConfig = { provider: (providerCfg?.provider as any) ?? 'mock' as const, apiKey: providerCfg?.apiKey ?? undefined, baseUrl: providerCfg?.baseUrl ?? undefined, model: providerCfg?.model ?? 'claude-sonnet-4-6' }

    const systemPrompt = `${EXECUTIVE_PERSONAS['ceo']!.systemPromptPrefix}\n\nCompany data:\n${contextText}`

    let aiSummary = 'Report generation unavailable — configure AI provider.'

    try {
      const res = await callAI([{ role: 'user', content: reportPrompts[reportType] ?? '' }], { systemPrompt, maxTokens: 3000, temperature: 0.2 }, aiConfig)
      aiSummary = res.content
    } catch {}

    const periodLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    const report = await prisma.aiExecReport.create({
      data: {
        tenantId,
        reportType,
        executiveRole: 'ceo',
        title: title ?? `${reportType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} — ${new Date().toLocaleDateString()}`,
        period: periodLabel,
        aiSummary,
        sections: [{ title: 'Full Report', content: aiSummary }] as any,
        keyMetrics: { financials: ctx.financials, sales: ctx.sales, hr: ctx.hr } as any,
        highlights: [] as any,
        concerns: [] as any,
        nextActions: [] as any,
        generatedBy: userId,
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        periodEnd: new Date(),
        status: 'published',
      },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'generate_report', module: 'ai_executive', entityType: 'report', entityId: report.id, metadata: { reportType } as any },
    })

    return reply.status(201).send({ success: true, data: report })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    await prisma.aiExecReport.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } })
    return reply.send({ success: true })
  })
}
