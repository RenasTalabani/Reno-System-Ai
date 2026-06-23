import { prisma } from '@reno/database'

export interface QuotaCheck {
  allowed: boolean
  used: number
  quota: number | null
  remainingPercent: number | null
}

export async function checkQuota(tenantId: string): Promise<QuotaCheck> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [tenant, usageAgg] = await Promise.all([
    prisma.coreTenant.findUnique({ where: { id: tenantId }, select: { aiMonthlyTokenQuota: true } }),
    prisma.aiUsageLog.aggregate({
      where: { tenantId, occurredAt: { gte: monthStart }, status: 'success' },
      _sum: { totalTokens: true },
    }),
  ])

  const used = usageAgg._sum.totalTokens ?? 0
  const quota = tenant?.aiMonthlyTokenQuota ?? null

  if (!quota) return { allowed: true, used, quota: null, remainingPercent: null }

  const remainingPercent = Math.max(0, Math.round(((quota - used) / quota) * 100))
  return { allowed: used < quota, used, quota, remainingPercent }
}

export async function logUsage(params: {
  tenantId: string
  userId: string | null
  module: string
  feature: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  requestDurationMs: number
  status: string
  errorCode?: string
  metadata?: any
}) {
  return prisma.aiUsageLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? undefined,
      module: params.module,
      feature: params.feature,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      estimatedCostUsd: params.estimatedCostUsd,
      requestDurationMs: params.requestDurationMs,
      status: params.status,
      errorCode: params.errorCode,
      metadata: params.metadata,
    },
  })
}

// Cost estimates per 1M tokens (in USD)
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
  'claude-opus-4-8': { input: 15.0, output: 75.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'mock': { input: 0, output: 0 },
}

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_PER_MILLION[model] ?? { input: 3.0, output: 15.0 }
  return (promptTokens / 1_000_000) * rates.input + (completionTokens / 1_000_000) * rates.output
}
