import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI } from '../../../brain/provider.js'
import { buildExecutiveContext, formatExecutiveContextForPrompt, EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'
import { checkQuota, logUsage, estimateCost } from '../../../brain/quota.js'

export async function aiExecExecutivesRoutes(app: FastifyInstance) {
  // List all executives
  app.get('/', async (req, reply) => {
    const executives = Object.entries(EXECUTIVE_PERSONAS).map(([role, persona]) => ({
      role,
      name: persona.name,
      title: persona.role,
    }))
    return reply.send({ success: true, data: executives })
  })

  // Chat with a specific executive
  app.post('/:role/chat', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { role } = req.params as any
    const { message, conversationId } = req.body as any

    const persona = EXECUTIVE_PERSONAS[role]
    if (!persona) return reply.status(404).send({ success: false, error: `Executive role '${role}' not found` })

    if (!message?.trim()) return reply.status(400).send({ success: false, error: 'Message required' })

    // Check quota
    const quota = await checkQuota(tenantId)
    if (!quota.allowed) return reply.status(429).send({ success: false, error: 'AI quota exceeded' })

    // Build executive context (full company data)
    const ctx = await buildExecutiveContext(tenantId)
    const contextText = formatExecutiveContextForPrompt(ctx, role)

    const systemPrompt = `${persona.systemPromptPrefix}

You have access to live company data:
${contextText}

CRITICAL RULES:
1. Never take autonomous actions — only PROPOSE actions requiring human approval.
2. Always cite data when making recommendations.
3. Be concise but comprehensive.
4. If you propose a workflow or task, clearly label it as [PROPOSAL - REQUIRES APPROVAL].
5. Maintain explainability — explain your reasoning.
6. Tenant isolation: only discuss data for this company.`

    // Load conversation history
    let convId = conversationId
    const historyKey = `exec_conv:${role}:${convId ?? 'new'}`

    const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (convId) {
      const mem = await prisma.brainMemory.findFirst({
        where: { tenantId, userId, key: historyKey, scope: 'session', type: 'conversation' },
      })
      if (mem) {
        try { history.push(...JSON.parse(mem.value).slice(-10)) } catch {}
      }
    } else {
      convId = `exec_${role}_${Date.now()}`
    }

    history.push({ role: 'user', content: message })

    // Get provider config
    const providerCfg = await prisma.brainProviderConfig.findFirst({
      where: { tenantId, isActive: true, isDefault: true },
    })
    const config = {
      provider: (providerCfg?.provider as any) ?? 'mock' as const,
      apiKey: providerCfg?.apiKey ?? undefined,
      baseUrl: providerCfg?.baseUrl ?? undefined,
      model: providerCfg?.model ?? 'claude-sonnet-4-6',
    }

    const start = Date.now()
    let aiResponse: any
    try {
      aiResponse = await callAI(history, { systemPrompt, maxTokens: 2048, temperature: 0.3 }, config)
    } catch (err: any) {
      aiResponse = {
        content: `I'm currently unable to process your request. Please check the AI provider configuration.\n\nError: ${err.message}`,
        promptTokens: 0, completionTokens: 0, totalTokens: 0, model: 'unknown', provider: 'error', latencyMs: 0,
      }
    }

    history.push({ role: 'assistant', content: aiResponse.content })

    // Persist conversation to BrainMemory
    await prisma.brainMemory.upsert({
      where: { id: (await prisma.brainMemory.findFirst({ where: { tenantId, userId, key: `exec_conv:${role}:${convId}`, scope: 'session' } }))?.id ?? 'none' },
      update: { value: JSON.stringify(history.slice(-20)) },
      create: {
        tenantId, userId, type: 'conversation', scope: 'session',
        key: `exec_conv:${role}:${convId}`,
        value: JSON.stringify(history.slice(-20)),
      },
    })

    // Log usage
    const cost = estimateCost(aiResponse.model, aiResponse.promptTokens, aiResponse.completionTokens)
    await logUsage({
      tenantId, userId, module: 'ai_executive', feature: 'executive_chat',
      provider: aiResponse.provider, model: aiResponse.model,
      promptTokens: aiResponse.promptTokens, completionTokens: aiResponse.completionTokens,
      totalTokens: aiResponse.totalTokens, estimatedCostUsd: cost,
      requestDurationMs: Date.now() - start, status: 'success',
    })

    // Audit
    await prisma.brainAuditLog.create({
      data: {
        tenantId, userId,
        action: 'executive_chat',
        module: 'ai_executive',
        entityType: 'executive',
        entityId: tenantId,
        metadata: { role, conversationId: convId, messageLength: message.length } as any,
      },
    })

    return reply.send({
      success: true,
      data: {
        role,
        executiveName: persona.name,
        reply: aiResponse.content,
        conversationId: convId,
        tokens: aiResponse.totalTokens,
        latencyMs: aiResponse.latencyMs,
        context: {
          healthScore: ctx.digitalTwin?.healthScore ?? null,
          revenueThisMonth: ctx.financials.revenueThisMonth,
        },
      },
    })
  })

  // Get conversation history
  app.get('/:role/conversations', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { role } = req.params as any

    const conversations = await prisma.brainMemory.findMany({
      where: { tenantId, userId, type: 'conversation', key: { startsWith: `exec_conv:${role}:` } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    return reply.send({ success: true, data: conversations })
  })

  // Executive briefing — auto-generated summary for a role
  app.get('/:role/briefing', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { role } = req.params as any

    const persona = EXECUTIVE_PERSONAS[role]
    if (!persona) return reply.status(404).send({ success: false, error: 'Executive not found' })

    const ctx = await buildExecutiveContext(tenantId)
    const contextText = formatExecutiveContextForPrompt(ctx, role)

    const systemPrompt = `${persona.systemPromptPrefix}\n\nCompany data:\n${contextText}`

    const briefingMessage = `Generate a concise executive briefing for today. Include:
1. Top 3 metrics that need my attention right now
2. One critical risk I should be aware of
3. One immediate opportunity
4. My recommended top priority for today
Keep it under 300 words.`

    const providerCfg = await prisma.brainProviderConfig.findFirst({ where: { tenantId, isActive: true, isDefault: true } })
    const config = { provider: (providerCfg?.provider as any) ?? 'mock' as const, apiKey: providerCfg?.apiKey ?? undefined, baseUrl: providerCfg?.baseUrl ?? undefined, model: providerCfg?.model ?? 'claude-sonnet-4-6' }

    let response: any
    try {
      response = await callAI([{ role: 'user', content: briefingMessage }], { systemPrompt, maxTokens: 512, temperature: 0.2 }, config)
    } catch {
      response = { content: 'Briefing unavailable — configure AI provider to enable.', totalTokens: 0, latencyMs: 0 }
    }

    return reply.send({
      success: true,
      data: {
        role,
        executiveName: persona.name,
        briefing: response.content,
        context: ctx,
        generatedAt: new Date().toISOString(),
      },
    })
  })
}
