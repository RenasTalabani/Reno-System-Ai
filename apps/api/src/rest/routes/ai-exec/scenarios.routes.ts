import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI } from '../../../brain/provider.js'
import { buildExecutiveContext, formatExecutiveContextForPrompt, EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'

export async function aiExecScenariosRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { limit = 20, offset = 0 } = req.query as any
    const [items, total] = await Promise.all([
      prisma.aiScenario.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: Number(limit), skip: Number(offset) }),
      prisma.aiScenario.count({ where: { tenantId, deletedAt: null } }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.aiScenario.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!item) return reply.status(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: item })
  })

  // Run a what-if simulation
  app.post('/simulate', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, description = '', scenarioType = 'what_if', assumptions = [] } = req.body as any

    if (!name?.trim()) return reply.status(400).send({ success: false, error: 'Scenario name required' })

    const ctx = await buildExecutiveContext(tenantId)
    const contextText = formatExecutiveContextForPrompt(ctx, 'analyst')

    const providerCfg = await prisma.brainProviderConfig.findFirst({ where: { tenantId, isActive: true, isDefault: true } })
    const aiConfig = { provider: (providerCfg?.provider as any) ?? 'mock', apiKey: providerCfg?.apiKey ?? undefined, baseUrl: providerCfg?.baseUrl ?? undefined, model: providerCfg?.model ?? 'claude-sonnet-4-6' }

    const prompt = `You are running a business scenario simulation for: "${name}"

${description ? `Scenario description: ${description}` : ''}

Assumptions:
${assumptions.length > 0 ? (assumptions as string[]).map((a, i) => `${i + 1}. ${a}`).join('\n') : 'None specified — infer from context'}

Current company baseline:
${contextText}

Simulate this scenario and provide detailed projections. Respond in JSON:
{
  "projections": {
    "revenue3m": number,
    "costs3m": number,
    "headcountChange": number,
    "summary": "3 sentence executive summary"
  },
  "riskFactors": ["risk 1", "risk 2", "risk 3"],
  "narrative": "Full 3-5 paragraph analysis of this scenario",
  "confidence": 0.0-1.0,
  "keyActions": ["action 1", "action 2", "action 3"]
}`

    let projections: any = {}
    let riskFactors: string[] = []
    let narrative = 'Simulation unavailable — configure AI provider.'
    let confidence = 0.7

    try {
      const res = await callAI(
        [{ role: 'user', content: prompt }],
        { systemPrompt: EXECUTIVE_PERSONAS['analyst']!.systemPromptPrefix, maxTokens: 1500, temperature: 0.2 },
        aiConfig
      )
      const parsed = JSON.parse(res.content.replace(/```json\n?|\n?```/g, '').trim())
      projections = parsed.projections ?? {}
      riskFactors = parsed.riskFactors ?? []
      narrative = parsed.narrative ?? narrative
      confidence = parsed.confidence ?? 0.7
    } catch {}

    const scenario = await prisma.aiScenario.create({
      data: {
        tenantId,
        name,
        description,
        scenarioType,
        baselineData: ctx as any,
        assumptions: assumptions as any,
        projections: projections as any,
        riskFactors: riskFactors as any,
        narrative,
        confidence,
        status: 'completed',
        createdBy: userId,
        updatedBy: userId,
      },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'simulate_scenario', module: 'ai_executive', entityType: 'scenario', entityId: scenario.id, metadata: { name } as any },
    })

    return reply.status(201).send({ success: true, data: scenario })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    await prisma.aiScenario.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } })
    return reply.send({ success: true })
  })
}
