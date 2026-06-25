import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI } from '../../../brain/provider.js'
import { buildExecutiveContext, EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'

export async function aiExecPredictionsRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { predictionType } = req.query as any
    const where: any = { tenantId }
    if (predictionType) where.predictionType = predictionType
    const predictions = await prisma.aiBizPrediction.findMany({
      where, orderBy: { computedAt: 'desc' }, take: 50,
    })
    return reply.send({ success: true, data: predictions })
  })

  app.get('/latest', async (req, reply) => {
    const { tenantId } = req as any
    const types = ['health', 'risk', 'cashflow', 'inventory', 'turnover', 'revenue']
    const predictions = await Promise.all(
      types.map(type => prisma.aiBizPrediction.findFirst({ where: { tenantId, predictionType: type }, orderBy: { computedAt: 'desc' } }))
    )
    const result = Object.fromEntries(types.map((t, i) => [t, predictions[i]]))
    return reply.send({ success: true, data: result })
  })

  app.post('/compute', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { types = ['health', 'risk', 'cashflow', 'inventory', 'turnover', 'revenue'] } = req.body as any

    const ctx = await buildExecutiveContext(tenantId)
    const providerCfg = await prisma.brainProviderConfig.findFirst({ where: { tenantId, isActive: true, isDefault: true } })
    const aiConfig = { provider: (providerCfg?.provider as any) ?? 'mock', apiKey: providerCfg?.apiKey ?? undefined, baseUrl: providerCfg?.baseUrl ?? undefined, model: providerCfg?.model ?? 'claude-sonnet-4-6' }

    const horizonMap: Record<string, string> = {
      health: '30d', risk: '30d', cashflow: '30d', inventory: '30d', turnover: '90d', revenue: '30d',
    }

    const predictionPrompts: Record<string, string> = {
      health: `Predict overall company health score (0-100) for next 30 days.
Data: ${JSON.stringify({ financials: ctx.financials, hr: ctx.hr, helpdesk: ctx.helpdesk })}
JSON: {"score": 0-100, "confidence": 0-100, "narrative": "2 sentence summary", "keyDrivers": ["..."], "riskFactors": ["..."], "assumptions": ["..."]}`,

      risk: `Assess overall business risk level (0-100) for next 30 days.
Data: ${JSON.stringify({ financials: ctx.financials, helpdesk: ctx.helpdesk, inventory: ctx.inventory })}
JSON: {"riskScore": 0-100, "confidence": 0-100, "narrative": "2 sentence summary", "keyDrivers": ["..."], "riskFactors": ["..."], "assumptions": ["..."]}`,

      cashflow: `Predict 30-day projected cash balance.
Data: ${JSON.stringify(ctx.financials)}
JSON: {"projectedCash": number, "confidence": 0-100, "narrative": "2 sentence summary", "keyDrivers": ["..."], "riskFactors": ["..."], "assumptions": ["..."]}`,

      inventory: `Predict inventory shortage risk (0-100) for next 30 days.
Data: ${JSON.stringify({ inventory: ctx.inventory, sales: ctx.sales })}
JSON: {"shortageRisk": 0-100, "confidence": 0-100, "narrative": "2 sentence summary", "keyDrivers": ["..."], "riskFactors": ["..."], "assumptions": ["..."]}`,

      turnover: `Predict employee turnover probability (0-100) for next 90 days.
Data: ${JSON.stringify(ctx.hr)}
JSON: {"turnoverRisk": 0-100, "confidence": 0-100, "narrative": "2 sentence summary", "keyDrivers": ["..."], "riskFactors": ["..."], "assumptions": ["..."]}`,

      revenue: `Predict revenue for next 30 days.
Data: ${JSON.stringify({ financials: ctx.financials, sales: ctx.sales, crm: ctx.crm })}
JSON: {"projectedRevenue": number, "growthPct": number, "confidence": 0-100, "narrative": "2 sentence summary", "keyDrivers": ["..."], "riskFactors": ["..."], "assumptions": ["..."]}`,
    }

    const results: any[] = []

    for (const type of types) {
      if (!predictionPrompts[type]) continue

      let prediction: any = {}
      let narrative = 'Prediction unavailable — configure AI provider.'
      let confidence = 0.5
      let keyDrivers: string[] = []
      let riskFactors: string[] = []
      let assumptions: string[] = []

      try {
        const res = await callAI(
          [{ role: 'user', content: predictionPrompts[type] }],
          { systemPrompt: EXECUTIVE_PERSONAS['analyst']!.systemPromptPrefix, maxTokens: 600, temperature: 0.1 },
          aiConfig
        )
        const parsed = JSON.parse(res.content.replace(/```json\n?|\n?```/g, '').trim())
        prediction = parsed
        narrative = parsed.narrative ?? narrative
        confidence = (parsed.confidence ?? 50) / 100
        keyDrivers = parsed.keyDrivers ?? []
        riskFactors = parsed.riskFactors ?? []
        assumptions = parsed.assumptions ?? []
      } catch {}

      const record = await prisma.aiBizPrediction.create({
        data: {
          tenantId,
          predictionType: type,
          executiveRole: 'analyst',
          horizon: horizonMap[type] ?? '30d',
          prediction: prediction as any,
          narrative,
          confidence,
          keyDrivers: keyDrivers as any,
          riskFactors: riskFactors as any,
          assumptions: assumptions as any,
          validUntil: new Date(Date.now() + (type === 'turnover' ? 90 : 30) * 86400000),
        },
      })

      results.push(record)
    }

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'compute_predictions', module: 'ai_executive', entityType: 'prediction', entityId: tenantId, metadata: { types } as any },
    })

    return reply.send({ success: true, data: results })
  })
}
