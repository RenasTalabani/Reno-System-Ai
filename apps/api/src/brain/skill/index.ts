import { prisma } from '@reno/database'
import type { ChatMessage, ChatOptions } from '../provider.js'
import type { ClaudeCallResult } from '../claude.service.js'
import { compressContext, estimateTokens, formatCompressedContextForPrompt } from './context-compressor.js'
import { checkTokenBudget } from './token-budget.js'
import { planSkills } from './skill-planner.js'

export interface SkillEngineParams {
  tenantId: string
  userId: string
  conversationId?: string
  userMessage: string
  messages: ChatMessage[]
  options: ChatOptions
  contextData?: unknown
  agentName: string
  module?: string
}

export interface SkillEngineResult extends ClaudeCallResult {
  skillPlan: ReturnType<typeof planSkills>
  budgetAction: string
  estimatedTokens: number
  estimatedCostUsd: number
  compressionRatio: number
  skillExecutionId?: string
}

// Pre-process a Claude request through the Skill Engine pipeline:
// plan → compress context → check token budget → return enriched params for Claude
export async function prepareSkillExecution(params: SkillEngineParams): Promise<{
  skillPlan: ReturnType<typeof planSkills>
  processedMessages: ChatMessage[]
  budgetAction: string
  estimatedTokens: number
  estimatedCostUsd: number
  compressionRatio: number
  contextSizeBefore: number
  contextSizeAfter: number
}> {
  const { tenantId, userMessage, messages, options, contextData } = params

  // 1. Plan: select relevant tools based on the user request
  const skillPlan = planSkills(userMessage)

  // 2. Compress context data if provided (business data injected into system prompt)
  let compressionRatio = 0
  let contextSizeBefore = 0
  let contextSizeAfter = 0
  let processedMessages = messages

  if (contextData !== undefined) {
    const compressed = compressContext(contextData, 'business_context')
    compressionRatio = compressed.compressionRatio
    contextSizeBefore = compressed.originalChars
    contextSizeAfter = compressed.compressedChars

    if (compressed.compressionRatio > 0) {
      const compressedText = formatCompressedContextForPrompt(compressed)
      processedMessages = messages.map(m => {
        if (m.role === 'system' && compressed.originalChars > 0) {
          return { ...m, content: m.content.replace(JSON.stringify(contextData), compressedText) }
        }
        return m
      })
    }
  }

  // 3. Check token budget
  const budget = await checkTokenBudget({
    tenantId,
    messages: processedMessages,
    model: options.model,
    maxOutputTokens: options.maxTokens,
  })

  return {
    skillPlan,
    processedMessages,
    budgetAction: budget.action,
    estimatedTokens: budget.estimatedTotalTokens,
    estimatedCostUsd: budget.estimatedCostUsd,
    compressionRatio,
    contextSizeBefore,
    contextSizeAfter,
  }
}

// Persist a completed skill execution to the audit table
export async function logSkillExecution(params: {
  tenantId: string
  userId: string
  conversationId?: string
  provider: string
  userRequest: string
  skillPlan: ReturnType<typeof planSkills>
  executionGraph: Record<string, unknown>
  toolsUsed: string[]
  proposalsCreated: string[]
  contextSizeBefore: number
  contextSizeAfter: number
  compressionRatio: number
  estimatedTokens: number
  actualTokens: number
  estimatedCostUsd: number
  actualCostUsd: number
  budgetAction: string
  status: 'success' | 'error' | 'fallback'
  errorMessage?: string
  durationMs: number
}): Promise<string | undefined> {
  try {
    const record = await prisma.aiSkillExecution.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        conversationId: params.conversationId,
        provider: params.provider,
        userRequest: params.userRequest.slice(0, 2000),
        skillPlan: params.skillPlan as any,
        executionGraph: params.executionGraph as any,
        toolsUsed: params.toolsUsed as any,
        proposalsCreated: params.proposalsCreated as any,
        contextSizeBefore: params.contextSizeBefore,
        contextSizeAfter: params.contextSizeAfter,
        compressionRatio: params.compressionRatio,
        estimatedTokens: params.estimatedTokens,
        actualTokens: params.actualTokens,
        estimatedCostUsd: params.estimatedCostUsd,
        actualCostUsd: params.actualCostUsd,
        budgetAction: params.budgetAction,
        status: params.status,
        errorMessage: params.errorMessage,
        durationMs: params.durationMs,
      },
    })
    return record.id
  } catch {
    // Never crash on audit failure
    return undefined
  }
}

export async function getSkillExecutionStats(tenantId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000)

  try {
    const [total, byProvider, byStatus, toolUsage] = await Promise.all([
      prisma.aiSkillExecution.aggregate({
        where: { tenantId, occurredAt: { gte: since } },
        _count: { id: true },
        _sum: { actualTokens: true, actualCostUsd: true, durationMs: true },
        _avg: { compressionRatio: true, durationMs: true },
      }),
      prisma.aiSkillExecution.groupBy({
        by: ['provider'],
        where: { tenantId, occurredAt: { gte: since } },
        _count: { id: true },
      }),
      prisma.aiSkillExecution.groupBy({
        by: ['status'],
        where: { tenantId, occurredAt: { gte: since } },
        _count: { id: true },
      }),
      prisma.aiSkillExecution.findMany({
        where: { tenantId, occurredAt: { gte: since } },
        select: { toolsUsed: true },
        take: 200,
      }),
    ])

    // Count tool usage frequency
    const toolCounts: Record<string, number> = {}
    for (const row of toolUsage) {
      const tools = row.toolsUsed as string[]
      for (const tool of tools) {
        toolCounts[tool] = (toolCounts[tool] ?? 0) + 1
      }
    }
    const topTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([toolId, count]) => ({ toolId, count }))

    return {
      period: { days, since: since.toISOString() },
      totals: {
        executions: total._count.id,
        totalTokens: total._sum.actualTokens ?? 0,
        totalCostUsd: Number(total._sum.actualCostUsd ?? 0),
        avgCompressionRatio: Math.round((total._avg.compressionRatio ?? 0) * 100),
        avgDurationMs: Math.round(total._avg.durationMs ?? 0),
      },
      byProvider: byProvider.map(r => ({ provider: r.provider, count: r._count.id })),
      byStatus: byStatus.map(r => ({ status: r.status, count: r._count.id })),
      topTools,
    }
  } catch {
    return { period: { days, since: since.toISOString() }, totals: null, byProvider: [], byStatus: [], topTools: [] }
  }
}
