import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@reno/database'
import { decryptApiKey } from './crypto.service.js'
import { callAI, type ChatMessage, type ChatOptions, type AIResponse } from './provider.js'
import { checkQuota, logUsage, estimateCost } from './quota.js'
import { logProviderAudit } from './ai-provider.service.js'
import { getAnthropicToolDefinitions } from './tools/definitions.js'
import { executeTool, logToolCall } from './tools/executor.js'

export interface ProviderBadge {
  slug: string
  name: string
  model: string
  isFallback: boolean
  fallbackReason?: string
}

export interface ClaudeCallResult extends AIResponse {
  providerBadge: ProviderBadge
  isFallback: boolean
  toolCallCount?: number
}

// Full Claude call pipeline: consent → quota → decrypt → call Anthropic (with tools) → log → fallback
export async function callClaudeForChat(params: {
  tenantId: string
  userId: string
  conversationId?: string
  messages: ChatMessage[]
  options: ChatOptions
  module?: string
  agentName: string
}): Promise<ClaudeCallResult> {
  const { tenantId, userId, conversationId, messages, options, module: mod, agentName } = params

  // 1. Verify consent
  const consent = await prisma.tenantAiConsent.findUnique({
    where: { tenantId_providerSlug: { tenantId, providerSlug: 'claude' } },
  })
  if (!consent?.consentGiven || consent.revokedAt) {
    return fallbackToRenoBrain(messages, options, {
      slug: 'claude', name: 'Claude', model: 'claude-sonnet-4-6',
      isFallback: true, fallbackReason: 'Consent not given for Claude',
    })
  }

  // 2. Load Claude provider config
  const config = await prisma.brainProviderConfig.findFirst({
    where: { tenantId, provider: 'anthropic', isActive: true },
  })
  if (!config) {
    return fallbackToRenoBrain(messages, options, {
      slug: 'claude', name: 'Claude', model: 'claude-sonnet-4-6',
      isFallback: true, fallbackReason: 'Claude is not configured for this tenant',
    })
  }

  // 3. Decrypt API key
  let apiKey: string
  try {
    if (config.encryptedApiKey) {
      apiKey = decryptApiKey(config.encryptedApiKey)
    } else if (config.apiKey) {
      apiKey = config.apiKey
    } else {
      throw new Error('No API key')
    }
  } catch {
    await logProviderAudit({
      tenantId, userId, providerSlug: 'claude',
      action: 'call', status: 'error', module: mod,
      errorMessage: 'Failed to decrypt Claude API key',
    })
    return fallbackToRenoBrain(messages, options, {
      slug: 'claude', name: 'Claude', model: config.model,
      isFallback: true, fallbackReason: 'API key decryption failed',
    })
  }

  // 4. Check quota
  const quota = await checkQuota(tenantId)
  if (!quota.allowed) {
    await logProviderAudit({
      tenantId, userId, providerSlug: 'claude',
      action: 'call', status: 'blocked', module: mod,
      errorMessage: 'Monthly token quota exceeded',
    })
    return fallbackToRenoBrain(messages, options, {
      slug: 'claude', name: 'Claude', model: config.model,
      isFallback: true, fallbackReason: 'Monthly AI token quota exceeded',
    })
  }

  // 5. Call Claude with tool use loop
  const start = Date.now()
  let callStatus: 'success' | 'error' = 'success'
  let errorMessage: string | undefined
  let toolCallCount = 0

  try {
    const result = await callClaudeWithTools({
      apiKey, model: config.model, messages, options,
      tenantId, userId, conversationId,
    })
    toolCallCount = result.toolCallCount

    // 6. Log usage
    const cost = estimateCost(config.model, result.promptTokens, result.completionTokens)
    await logUsage({
      tenantId, userId,
      module: mod ?? 'brain',
      feature: `claude:${agentName}`,
      provider: 'anthropic',
      model: config.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: cost,
      requestDurationMs: result.latencyMs,
      status: callStatus,
      metadata: { agentName, consentVerified: true, toolCallCount },
    })

    // 7. Audit log
    await logProviderAudit({
      tenantId, userId, providerSlug: 'claude',
      action: 'call', status: callStatus,
      module: mod,
      tokensUsed: result.totalTokens,
      latencyMs: result.latencyMs,
    })

    return {
      content: result.content,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      model: config.model,
      provider: 'anthropic',
      latencyMs: result.latencyMs,
      providerBadge: { slug: 'claude', name: 'Claude', model: config.model, isFallback: false },
      isFallback: false,
      toolCallCount,
    }
  } catch (err: any) {
    callStatus = 'error'
    errorMessage = err.message

    await logProviderAudit({
      tenantId, userId, providerSlug: 'claude',
      action: 'call', status: 'error', module: mod,
      errorMessage,
      latencyMs: Date.now() - start,
    })

    const fallbackEnabled = config.fallbackEnabled ?? true
    if (fallbackEnabled) {
      return fallbackToRenoBrain(messages, options, {
        slug: 'claude', name: 'Claude', model: config.model,
        isFallback: true, fallbackReason: `Claude error: ${err.message}`,
      })
    }
    throw err
  }
}

// Internal: Anthropic messages API with tool use loop
async function callClaudeWithTools(params: {
  apiKey: string
  model: string
  messages: ChatMessage[]
  options: ChatOptions
  tenantId: string
  userId: string
  conversationId?: string
}): Promise<{ content: string; promptTokens: number; completionTokens: number; totalTokens: number; latencyMs: number; toolCallCount: number }> {
  const { apiKey, model, messages, options, tenantId, userId, conversationId } = params
  const client = new Anthropic({ apiKey })
  const start = Date.now()

  const anthropicMessages: Anthropic.MessageParam[] = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const systemPrompt = options.systemPrompt ?? messages.find(m => m.role === 'system')?.content
  const toolDefs = getAnthropicToolDefinitions()

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let toolCallCount = 0
  const maxIterations = 8

  let response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 4096,
    system: systemPrompt,
    tools: toolDefs,
    messages: anthropicMessages,
  })

  totalInputTokens += response.usage.input_tokens
  totalOutputTokens += response.usage.output_tokens

  let iterations = 0
  while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      toolCallCount++
      const toolStart = Date.now()
      let toolResult: { success: boolean; data?: unknown; error?: string; proposalId?: string; proposalSummary?: string }

      try {
        toolResult = await executeTool(block.name, block.input as Record<string, unknown>, {
          tenantId, userId, conversationId,
        })
      } catch (err: any) {
        toolResult = { success: false, error: err.message ?? 'Tool execution failed' }
      }

      await logToolCall({
        tenantId, userId, conversationId,
        toolName: block.name,
        toolCallId: block.id,
        toolInput: block.input as Record<string, unknown>,
        toolOutput: toolResult,
        status: toolResult.success ? (toolResult.proposalId ? 'proposed' : 'success') : 'error',
        durationMs: Date.now() - toolStart,
        errorMessage: toolResult.error,
        proposalId: toolResult.proposalId,
      })

      const resultContent = toolResult.success
        ? JSON.stringify(toolResult.data ?? { proposalId: toolResult.proposalId, summary: toolResult.proposalSummary })
        : JSON.stringify({ error: toolResult.error })

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: resultContent,
        is_error: !toolResult.success,
      })
    }

    anthropicMessages.push({ role: 'assistant', content: response.content })
    anthropicMessages.push({ role: 'user', content: toolResults })

    response = await client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemPrompt,
      tools: toolDefs,
      messages: anthropicMessages,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens
  }

  const content = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('\n')

  return {
    content,
    promptTokens: totalInputTokens,
    completionTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    latencyMs: Date.now() - start,
    toolCallCount,
  }
}

// Verify if Claude is available for a tenant (consent + configured + key present)
export async function getClaudeAvailability(tenantId: string): Promise<{
  available: boolean
  reason?: string
  model?: string
}> {
  const [consent, config] = await Promise.all([
    prisma.tenantAiConsent.findUnique({
      where: { tenantId_providerSlug: { tenantId, providerSlug: 'claude' } },
    }),
    prisma.brainProviderConfig.findFirst({
      where: { tenantId, provider: 'anthropic', isActive: true },
      select: { id: true, model: true, encryptedApiKey: true, apiKey: true },
    }),
  ])

  if (!consent?.consentGiven || consent.revokedAt) {
    return { available: false, reason: 'Consent not given' }
  }
  if (!config) {
    return { available: false, reason: 'Not configured' }
  }
  if (!config.encryptedApiKey && !config.apiKey) {
    return { available: false, reason: 'API key not set' }
  }

  return { available: true, model: config.model }
}

// Claude usage statistics for a tenant
export async function getClaudeUsageStats(tenantId: string, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [totalAgg, dailyStats, modelBreakdown] = await Promise.all([
    prisma.aiUsageLog.aggregate({
      where: { tenantId, provider: 'anthropic', occurredAt: { gte: since } },
      _sum: { totalTokens: true, promptTokens: true, completionTokens: true, estimatedCostUsd: true },
      _count: { id: true },
    }),
    prisma.aiUsageLog.groupBy({
      by: ['occurredAt'],
      where: { tenantId, provider: 'anthropic', occurredAt: { gte: since } },
      _sum: { totalTokens: true, estimatedCostUsd: true },
      _count: { id: true },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.aiUsageLog.groupBy({
      by: ['model'],
      where: { tenantId, provider: 'anthropic', occurredAt: { gte: since } },
      _sum: { totalTokens: true, estimatedCostUsd: true },
      _count: { id: true },
    }),
  ])

  return {
    period: { days, since: since.toISOString() },
    totals: {
      requests: totalAgg._count.id,
      promptTokens: totalAgg._sum.promptTokens ?? 0,
      completionTokens: totalAgg._sum.completionTokens ?? 0,
      totalTokens: totalAgg._sum.totalTokens ?? 0,
      estimatedCostUsd: Number(totalAgg._sum.estimatedCostUsd ?? 0),
    },
    dailyStats: dailyStats.map(d => ({
      date: d.occurredAt,
      requests: d._count.id,
      totalTokens: d._sum.totalTokens ?? 0,
      estimatedCostUsd: Number(d._sum.estimatedCostUsd ?? 0),
    })),
    byModel: modelBreakdown.map(m => ({
      model: m.model,
      requests: m._count.id,
      totalTokens: m._sum.totalTokens ?? 0,
      estimatedCostUsd: Number(m._sum.estimatedCostUsd ?? 0),
    })),
  }
}

async function fallbackToRenoBrain(
  messages: ChatMessage[],
  options: ChatOptions,
  badge: ProviderBadge
): Promise<ClaudeCallResult> {
  const aiResponse = await callAI(messages, options, { provider: 'mock', model: 'reno-brain-v1' })
  return {
    ...aiResponse,
    providerBadge: badge,
    isFallback: true,
    toolCallCount: 0,
  }
}
