import { checkQuota } from '../quota.js'
import { estimateTokens } from './context-compressor.js'
import type { ChatMessage } from '../provider.js'
import { estimateCost } from '../quota.js'

export type BudgetAction = 'proceed' | 'compress' | 'fallback' | 'reject'

export interface TokenBudgetResult {
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedTotalTokens: number
  estimatedCostUsd: number
  withinQuota: boolean
  withinBudget: boolean
  action: BudgetAction
  reason?: string
  quotaRemaining: number
}

const MAX_INPUT_TOKENS = 32000
const MAX_OUTPUT_TOKENS = 4096
const COMPRESS_THRESHOLD = 16000

export async function checkTokenBudget(params: {
  tenantId: string
  messages: ChatMessage[]
  model?: string
  maxOutputTokens?: number
}): Promise<TokenBudgetResult> {
  const { tenantId, messages, model = 'claude-sonnet-4-6', maxOutputTokens = MAX_OUTPUT_TOKENS } = params

  const inputText = messages.map(m => m.content).join('\n')
  const estimatedInputTokens = estimateTokens(inputText)
  const estimatedOutputTokens = maxOutputTokens
  const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens
  const estimatedCostUsd = estimateCost(model, estimatedInputTokens, estimatedOutputTokens)

  const quota = await checkQuota(tenantId)
  const quotaRemaining = Math.max(0, (quota.quota ?? 0) - (quota.used ?? 0))
  const withinQuota = quota.allowed && estimatedTotalTokens <= quotaRemaining

  if (!quota.allowed) {
    return {
      estimatedInputTokens, estimatedOutputTokens, estimatedTotalTokens,
      estimatedCostUsd, withinQuota: false, withinBudget: false,
      action: 'fallback',
      reason: 'Monthly token quota exceeded',
      quotaRemaining,
    }
  }

  if (estimatedInputTokens > MAX_INPUT_TOKENS) {
    return {
      estimatedInputTokens, estimatedOutputTokens, estimatedTotalTokens,
      estimatedCostUsd, withinQuota, withinBudget: false,
      action: 'reject',
      reason: `Input too large: estimated ${estimatedInputTokens} tokens (max ${MAX_INPUT_TOKENS})`,
      quotaRemaining,
    }
  }

  if (estimatedInputTokens > COMPRESS_THRESHOLD) {
    return {
      estimatedInputTokens, estimatedOutputTokens, estimatedTotalTokens,
      estimatedCostUsd, withinQuota, withinBudget: true,
      action: 'compress',
      reason: `Input large (${estimatedInputTokens} tokens) — context compression recommended`,
      quotaRemaining,
    }
  }

  return {
    estimatedInputTokens, estimatedOutputTokens, estimatedTotalTokens,
    estimatedCostUsd, withinQuota, withinBudget: true,
    action: 'proceed',
    quotaRemaining,
  }
}
