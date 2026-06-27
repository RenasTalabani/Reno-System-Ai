import { prisma } from '@reno/database'
import { decryptApiKey } from './crypto.service.js'
import { callAI, type ChatMessage, type ChatOptions, type AIResponse } from './provider.js'
import { checkQuota, logUsage, estimateCost } from './quota.js'
import { logProviderAudit } from './ai-provider.service.js'

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
}

// Full Claude call pipeline: consent → quota → decrypt → call Anthropic → log → fallback
export async function callClaudeForChat(params: {
  tenantId: string
  userId: string
  messages: ChatMessage[]
  options: ChatOptions
  module?: string
  agentName: string
}): Promise<ClaudeCallResult> {
  const { tenantId, userId, messages, options, module: mod, agentName } = params

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

  // 4. Check quota (Claude usage counts against the same tenant quota)
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

  // 5. Call Claude
  const start = Date.now()
  let aiResponse: AIResponse
  let callStatus: 'success' | 'error' = 'success'
  let errorMessage: string | undefined

  try {
    aiResponse = await callAI(messages, options, {
      provider: 'anthropic',
      apiKey,
      baseUrl: config.baseUrl ?? undefined,
      model: config.model,
    })
  } catch (err: any) {
    callStatus = 'error'
    errorMessage = err.message

    await logProviderAudit({
      tenantId, userId, providerSlug: 'claude',
      action: 'call', status: 'error', module: mod,
      errorMessage,
      latencyMs: Date.now() - start,
    })

    // Fallback to Reno Brain if Claude fails and fallback is enabled
    const fallbackEnabled = config.fallbackEnabled ?? true
    if (fallbackEnabled) {
      return fallbackToRenoBrain(messages, options, {
        slug: 'claude', name: 'Claude', model: config.model,
        isFallback: true, fallbackReason: `Claude error: ${err.message}`,
      })
    }
    throw err
  }

  // 6. Log usage (Claude usage tracked to AiUsageLog under provider='anthropic')
  const cost = estimateCost(aiResponse.model, aiResponse.promptTokens, aiResponse.completionTokens)
  await logUsage({
    tenantId,
    userId,
    module: mod ?? 'brain',
    feature: `claude:${agentName}`,
    provider: 'anthropic',
    model: aiResponse.model,
    promptTokens: aiResponse.promptTokens,
    completionTokens: aiResponse.completionTokens,
    totalTokens: aiResponse.totalTokens,
    estimatedCostUsd: cost,
    requestDurationMs: aiResponse.latencyMs,
    status: callStatus,
    errorCode: errorMessage ? 'CLAUDE_ERROR' : undefined,
    metadata: { agentName, consentVerified: true },
  })

  // 7. Audit log
  await logProviderAudit({
    tenantId, userId, providerSlug: 'claude',
    action: 'call', status: callStatus,
    module: mod,
    tokensUsed: aiResponse.totalTokens,
    latencyMs: aiResponse.latencyMs,
    errorMessage,
  })

  return {
    ...aiResponse,
    providerBadge: { slug: 'claude', name: 'Claude', model: aiResponse.model, isFallback: false },
    isFallback: false,
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
  }
}
