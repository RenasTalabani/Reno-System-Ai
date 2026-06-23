import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI, type ProviderConfig } from '../../../brain/provider.js'
import { buildContext, formatContextForPrompt } from '../../../brain/context.js'
import { checkQuota, logUsage, estimateCost } from '../../../brain/quota.js'

export async function brainChatRoutes(app: FastifyInstance) {
  // POST /brain/chat — main NL query endpoint
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const { message, agentSlug = 'reno-ceo', conversationId } = body

    if (!message?.trim()) {
      return reply.code(400).send({ success: false, error: 'Message is required' })
    }

    // 1. Check quota
    const quota = await checkQuota(tenantId)
    if (!quota.allowed) {
      return reply.code(429).send({
        success: false,
        error: 'Monthly AI token quota exceeded',
        data: { used: quota.used, quota: quota.quota },
      })
    }

    // 2. Load agent
    const agent = await prisma.brainAgent.findFirst({
      where: { slug: agentSlug, OR: [{ tenantId }, { isSystem: true }], isActive: true },
      include: { permissions: true },
    })
    if (!agent) return reply.code(404).send({ success: false, error: 'Agent not found' })

    // 3. Load or create conversation
    let conversation = conversationId
      ? await prisma.brainConversation.findFirst({ where: { id: conversationId, tenantId } })
      : null

    if (!conversation) {
      conversation = await prisma.brainConversation.create({
        data: {
          tenantId,
          userId,
          agentId: agent.id,
          title: message.substring(0, 80),
          status: 'active',
        },
      })
    }

    // 4. Load recent message history (last 10)
    const history = await prisma.brainMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    // 5. Build cross-module context
    const modules = Array.isArray(agent.modules) ? agent.modules as string[] : []
    const ctx = await buildContext(tenantId, modules)
    const contextText = formatContextForPrompt(ctx)

    // 6. Load tenant's AI provider config
    const providerCfg = await prisma.brainProviderConfig.findFirst({
      where: { tenantId, isActive: true, isDefault: true },
    })

    const config: ProviderConfig = {
      provider: (providerCfg?.provider as any) ?? 'mock',
      apiKey: providerCfg?.apiKey ?? undefined,
      baseUrl: providerCfg?.baseUrl ?? undefined,
      model: providerCfg?.model ?? agent.model,
    }

    // 7. Build system prompt
    const systemPrompt = buildSystemPrompt(agent, contextText)

    // 8. Build messages array
    const messages = [
      ...history.map(m => ({ role: m.role as any, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    // 9. Save user message
    await prisma.brainMessage.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    // 10. Call AI
    let aiResponse: any
    let status = 'success'
    let errorCode: string | undefined

    try {
      aiResponse = await callAI(messages, {
        model: config.model,
        maxTokens: agent.maxTokens,
        temperature: Number(agent.temperature),
        systemPrompt,
      }, config)
    } catch (err: any) {
      status = 'error'
      errorCode = err.code ?? 'AI_CALL_FAILED'
      aiResponse = {
        content: `I encountered an error processing your request. Please check the AI provider configuration.\n\nError: ${err.message}`,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        model: config.model,
        provider: config.provider,
        latencyMs: 0,
      }
    }

    // 11. Save assistant message
    const assistantMessage = await prisma.brainMessage.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        promptTokens: aiResponse.promptTokens,
        completionTokens: aiResponse.completionTokens,
        totalTokens: aiResponse.totalTokens,
        model: aiResponse.model,
        provider: aiResponse.provider,
        latencyMs: aiResponse.latencyMs,
      },
    })

    // 12. Log usage
    const cost = estimateCost(aiResponse.model, aiResponse.promptTokens, aiResponse.completionTokens)
    await logUsage({
      tenantId,
      userId,
      module: 'brain',
      feature: `agent:${agentSlug}`,
      provider: aiResponse.provider,
      model: aiResponse.model,
      promptTokens: aiResponse.promptTokens,
      completionTokens: aiResponse.completionTokens,
      totalTokens: aiResponse.totalTokens,
      estimatedCostUsd: cost,
      requestDurationMs: aiResponse.latencyMs,
      status,
      errorCode,
      metadata: { agentSlug, conversationId: conversation.id },
    })

    // 13. Update conversation stats
    await prisma.brainConversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: 2 },
        totalTokens: { increment: aiResponse.totalTokens },
        lastMessageAt: new Date(),
      },
    })

    // 14. Brain audit log
    await prisma.brainAuditLog.create({
      data: {
        tenantId,
        userId,
        conversationId: conversation.id,
        agentId: agent.id,
        action: 'chat_message',
        module: 'brain',
        description: `User query to ${agent.name}: "${message.substring(0, 100)}"`,
      },
    })

    return reply.send({
      success: true,
      data: {
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        content: aiResponse.content,
        model: aiResponse.model,
        provider: aiResponse.provider,
        tokens: {
          prompt: aiResponse.promptTokens,
          completion: aiResponse.completionTokens,
          total: aiResponse.totalTokens,
        },
        quota: {
          used: (quota.used ?? 0) + aiResponse.totalTokens,
          quota: quota.quota,
          remainingPercent: quota.remainingPercent,
        },
      },
    })
  })

  // GET /brain/chat/conversations — list conversations
  app.get('/conversations', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { agentSlug, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, userId, status: { not: 'deleted' } }
    if (agentSlug) {
      const agent = await prisma.brainAgent.findFirst({ where: { slug: agentSlug } })
      if (agent) where.agentId = agent.id
    }

    const [items, total] = await Promise.all([
      prisma.brainConversation.findMany({
        where,
        include: { agent: { select: { name: true, slug: true, iconName: true, color: true } } },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.brainConversation.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /brain/chat/conversations/:id/messages
  app.get('/conversations/:id/messages', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const conversation = await prisma.brainConversation.findFirst({ where: { id, tenantId } })
    if (!conversation) return reply.code(404).send({ success: false, error: 'Conversation not found' })

    const messages = await prisma.brainMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    })

    return reply.send({ success: true, data: { conversation, messages } })
  })

  // DELETE /brain/chat/conversations/:id
  app.delete('/conversations/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    await prisma.brainConversation.updateMany({
      where: { id, tenantId },
      data: { status: 'deleted' },
    })

    return reply.send({ success: true })
  })
}

function buildSystemPrompt(agent: any, contextText: string): string {
  return `${agent.persona ?? `You are ${agent.name}, an AI assistant for Reno System.`}

You have access to the following real-time business data from the company's ERP system:

${contextText}

IMPORTANT GUIDELINES:
- Always base your responses on the actual data provided above.
- Be specific and reference actual numbers when relevant.
- If you're suggesting an action that would change data (create/update/delete), clearly flag it as a "Proposed Action" and explain the impact.
- High-risk actions (financial transactions, payroll changes, inventory adjustments) require human approval.
- Maintain strict data privacy — never reference other companies' data.
- If you don't have enough information from the context, say so rather than guessing.
- Respond in a professional, concise manner appropriate for a business executive tool.
- Format your responses with clear sections when covering multiple topics.`
}
