// Phase 66 — LLMOps Orchestration Engine

export interface ProviderProfile {
  id: string; name: string; providerType: string
  isEnabled: boolean; status: string
  requestCount: number; successCount: number; avgLatencyMs: number; totalCostUsd: number
}

const PROVIDER_SIM: Record<string, { latencyMs: number; costPer1kTokens: number; accuracyBase: number }> = {
  reno_brain:   { latencyMs: 850,  costPer1kTokens: 0,      accuracyBase: 0.88 },
  claude:       { latencyMs: 1250, costPer1kTokens: 0.012,  accuracyBase: 0.97 },
  openai:       { latencyMs: 980,  costPer1kTokens: 0.010,  accuracyBase: 0.95 },
  gemini:       { latencyMs: 920,  costPer1kTokens: 0.004,  accuracyBase: 0.93 },
  azure_openai: { latencyMs: 1050, costPer1kTokens: 0.011,  accuracyBase: 0.94 },
  ollama:       { latencyMs: 2200, costPer1kTokens: 0,      accuracyBase: 0.80 },
  custom:       { latencyMs: 1500, costPer1kTokens: 0.008,  accuracyBase: 0.84 },
}

export function computeProviderScore(p: ProviderProfile): number {
  const successRate = p.requestCount > 0 ? p.successCount / p.requestCount : 0.9
  const latencyScore = Math.max(0, 1 - p.avgLatencyMs / 10000)
  const costBonus = p.providerType === 'reno_brain' ? 0.15 : 0
  return successRate * 0.5 + latencyScore * 0.3 + costBonus + 0.05
}

export function selectBestProvider(
  providers: ProviderProfile[],
  policy: { allowedProviders: unknown; preferredProvider: string | null; fallbackOrder: unknown } | null,
): { provider: ProviderProfile | null; reason: string } {
  const available = providers.filter(p => p.isEnabled && p.status !== 'down')
  if (available.length === 0) return { provider: null, reason: 'No available providers' }

  // 1. Policy preferred
  if (policy?.preferredProvider) {
    const pref = available.find(p => p.providerType === policy.preferredProvider)
    if (pref) return { provider: pref, reason: `Policy: preferred provider for this module` }
  }

  // 2. Filter by allowed list
  const allowed = Array.isArray(policy?.allowedProviders) && (policy?.allowedProviders as string[]).length > 0
    ? available.filter(p => (policy!.allowedProviders as string[]).includes(p.providerType))
    : available

  if (allowed.length === 0) return { provider: null, reason: 'No providers match policy allowed list' }

  // 3. Reno Brain is PRIMARY (golden rule)
  const renoBrain = allowed.find(p => p.providerType === 'reno_brain')
  if (renoBrain) return { provider: renoBrain, reason: 'Reno Brain is primary (golden rule)' }

  // 4. Score-based selection
  const scored = allowed.map(p => ({ p, score: computeProviderScore(p) })).sort((a, b) => b.score - a.score)
  return { provider: scored[0].p, reason: `AI-scored best provider: ${scored[0].p.name}` }
}

export function simulateExperimentRun(providerTypes: string[], sampleCount: number, avgTokens = 500) {
  return providerTypes.map(provType => {
    const sim = PROVIDER_SIM[provType] ?? PROVIDER_SIM.custom
    const variance = (Math.random() - 0.5) * 0.15
    return {
      provider: provType,
      avgLatencyMs: Math.max(100, Math.round(sim.latencyMs * (1 + variance))),
      avgCostUsd: Math.round(sim.costPer1kTokens * (avgTokens / 1000) * sampleCount * (1 + variance) * 10000) / 10000,
      successRate: Math.min(0.99, Math.max(0.70, 0.95 + variance)),
      accuracyScore: Math.min(0.99, Math.max(0.65, sim.accuracyBase + variance * 0.5)),
      totalRuns: sampleCount,
    }
  })
}

export function rankResults(raw: ReturnType<typeof simulateExperimentRun>) {
  const maxLatency = Math.max(...raw.map(r => r.avgLatencyMs), 1)
  const maxCost = Math.max(...raw.map(r => r.avgCostUsd), 0.0001)

  const scored = raw.map(r => ({
    ...r,
    _score: r.accuracyScore * 0.5 + (1 - r.avgLatencyMs / maxLatency) * 0.3 + (1 - r.avgCostUsd / maxCost) * 0.2,
  })).sort((a, b) => b._score - a._score)

  return scored.map((r, i) => {
    const { _score, ...rest } = r
    return {
      ...rest,
      rank: i + 1,
      aiRecommendation: i === 0
        ? `${r.provider} recommended — accuracy ${(r.accuracyScore * 100).toFixed(0)}%, latency ${r.avgLatencyMs}ms, cost $${r.avgCostUsd.toFixed(4)}/run`
        : null,
    }
  })
}

export function healthCheckProvider(providerType: string): { status: string; latencyMs: number; message: string } {
  const sim = PROVIDER_SIM[providerType] ?? PROVIDER_SIM.custom
  const latencyMs = Math.round(sim.latencyMs * (0.8 + Math.random() * 0.4))

  if (providerType === 'reno_brain') {
    return { status: 'healthy', latencyMs, message: 'Reno Brain internal — responding normally' }
  }

  const isHealthy = Math.random() > 0.05
  return {
    status: isHealthy ? 'healthy' : 'degraded',
    latencyMs: isHealthy ? latencyMs : latencyMs * 3,
    message: isHealthy
      ? `${providerType} API responding normally`
      : `${providerType} API showing elevated latency — consider switching to Reno Brain`,
  }
}

export function getCostPerProvider(
  requests: Array<{ providerType?: string; provider?: { providerType: string }; costUsd: number; requestedAt: Date }>,
  period: string,
) {
  const now = new Date()
  const fromDate = period === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : period === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth(), 1)

  const filtered = requests.filter(r => new Date(r.requestedAt) >= fromDate)
  const byProvider: Record<string, { count: number; costUsd: number }> = {}

  for (const r of filtered) {
    const pt = r.providerType ?? r.provider?.providerType ?? 'unknown'
    if (!byProvider[pt]) byProvider[pt] = { count: 0, costUsd: 0 }
    byProvider[pt].count++
    byProvider[pt].costUsd += r.costUsd
  }

  return Object.entries(byProvider).map(([provider, v]) => ({
    provider,
    count: v.count,
    costUsd: Math.round(v.costUsd * 10000) / 10000,
  }))
}
