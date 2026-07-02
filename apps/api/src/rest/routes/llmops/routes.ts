import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  selectBestProvider, simulateExperimentRun, rankResults,
  healthCheckProvider, computeProviderScore,
} from './orchestrator.js'

export async function llmopsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ────────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [providers, allRequests, policies, experiments] = await Promise.all([
      prisma.llmProvider.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      prisma.llmRequest.findMany({ where: { tenantId, requestedAt: { gte: monthStart } }, include: { provider: true } }),
      prisma.llmPolicy.count({ where: { tenantId, isActive: true } }),
      prisma.llmExperiment.count({ where: { tenantId } }),
    ])

    const todayRequests = allRequests.filter(r => r.requestedAt >= dayStart)
    const totalCostMonth = allRequests.reduce((s, r) => s + r.costUsd, 0)
    const byProvider = providers.map(p => ({
      id: p.id, name: p.name, providerType: p.providerType, status: p.status,
      requestCount: p.requestCount, successRate: p.requestCount > 0 ? Math.round((p.successCount / p.requestCount) * 100) : 100,
      totalCostUsd: Math.round(p.totalCostUsd * 10000) / 10000,
      avgLatencyMs: Math.round(p.avgLatencyMs),
      score: Math.round(computeProviderScore(p) * 100) / 100,
    }))

    const recentRequests = await prisma.llmRequest.findMany({
      where: { tenantId }, include: { provider: true },
      orderBy: { requestedAt: 'desc' }, take: 10,
    })

    return {
      summary: {
        totalProviders: providers.length, healthyProviders: providers.filter(p => p.status === 'healthy').length,
        requestsToday: todayRequests.length, requestsThisMonth: allRequests.length,
        totalCostMonth: Math.round(totalCostMonth * 10000) / 10000,
        activePolicies: policies, totalExperiments: experiments,
        savingsFromRenoBrain: Math.round(allRequests.filter(r => r.provider.providerType === 'reno_brain').length * 0.01 * 100) / 100,
      },
      byProvider,
      recentRequests: recentRequests.map(r => ({
        id: r.id, module: r.module, taskType: r.taskType,
        provider: r.provider.name, providerType: r.provider.providerType,
        latencyMs: r.latencyMs, costUsd: r.costUsd, success: r.success, requestedAt: r.requestedAt,
      })),
    }
  })

  // ── Providers ────────────────────────────────────────────────────────────────
  app.get('/providers', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.llmProvider.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
  })

  app.post('/providers', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      name: string; providerType: string; baseUrl?: string; defaultModel?: string
      isEnabled?: boolean; isPrimary?: boolean; metadata?: Record<string, unknown>
    }

    const provider = await prisma.llmProvider.create({
      data: {
        tenantId, name: body.name, providerType: body.providerType,
        baseUrl: body.baseUrl ?? null, defaultModel: body.defaultModel ?? null,
        isEnabled: body.isEnabled ?? true, isPrimary: body.isPrimary ?? false,
        status: body.providerType === 'reno_brain' ? 'healthy' : 'unknown',
        metadata: body.metadata as never ?? {} as never,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'LLMOPS', entityType: 'LlmProvider', entityId: provider.id, newValues: provider as never },
    }).catch(() => null)

    return reply.status(201).send(provider)
  })

  app.get('/providers/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const provider = await prisma.llmProvider.findFirst({ where: { id, tenantId } })
    if (!provider) return reply.status(404).send({ error: 'Not found' })
    return provider
  })

  app.patch('/providers/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.llmProvider.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Record<string, unknown>
    const updated = await prisma.llmProvider.update({ where: { id }, data: body as never })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPDATE', module: 'LLMOPS', entityType: 'LlmProvider', entityId: id, newValues: updated as never },
    }).catch(() => null)
    return updated
  })

  app.delete('/providers/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.llmProvider.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    await prisma.llmProvider.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE', module: 'LLMOPS', entityType: 'LlmProvider', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return reply.status(204).send()
  })

  app.post('/providers/:id/health-check', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const provider = await prisma.llmProvider.findFirst({ where: { id, tenantId } })
    if (!provider) return reply.status(404).send({ error: 'Not found' })

    const result = healthCheckProvider(provider.providerType)
    const updated = await prisma.llmProvider.update({
      where: { id },
      data: { status: result.status, lastCheck: new Date(), lastError: result.status !== 'healthy' ? result.message : null },
    })
    return { ...result, provider: updated }
  })

  // ── Requests (Observability) ─────────────────────────────────────────────────
  app.get('/requests', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { module?: string; taskType?: string; provider?: string; limit?: string }
    const limit = Math.min(100, parseInt(q.limit ?? '50', 10))

    const where: Record<string, unknown> = { tenantId }
    if (q.module) where.module = q.module
    if (q.taskType) where.taskType = q.taskType

    const requests = await prisma.llmRequest.findMany({
      where: where as never,
      include: { provider: { select: { name: true, providerType: true } } },
      orderBy: { requestedAt: 'desc' },
      take: limit,
    })

    return requests
  })

  app.post('/requests', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as {
      providerId: string; module: string; taskType?: string; model?: string
      promptTokens?: number; completionTokens?: number; costUsd?: number
      latencyMs?: number; success?: boolean; errorCode?: string; fallbackFrom?: string
    }

    const provider = await prisma.llmProvider.findFirst({ where: { id: body.providerId, tenantId } })
    if (!provider) return reply.status(404).send({ error: 'Provider not found' })

    const totalTokens = (body.promptTokens ?? 0) + (body.completionTokens ?? 0)
    const request = await prisma.llmRequest.create({
      data: {
        tenantId, providerId: body.providerId, module: body.module,
        taskType: body.taskType ?? 'generate', model: body.model ?? provider.defaultModel,
        promptTokens: body.promptTokens ?? 0, completionTokens: body.completionTokens ?? 0,
        totalTokens, costUsd: body.costUsd ?? 0, latencyMs: body.latencyMs ?? 0,
        success: body.success ?? true, errorCode: body.errorCode ?? null,
        fallbackFrom: body.fallbackFrom ?? null,
      },
    })

    // Update provider aggregate stats
    const successDelta = (body.success ?? true) ? 1 : 0
    const newAvgLatency = provider.requestCount > 0
      ? (provider.avgLatencyMs * provider.requestCount + (body.latencyMs ?? 0)) / (provider.requestCount + 1)
      : body.latencyMs ?? 0

    await prisma.llmProvider.update({
      where: { id: body.providerId },
      data: {
        requestCount: { increment: 1 },
        successCount: { increment: successDelta },
        totalTokens: { increment: totalTokens },
        totalCostUsd: { increment: body.costUsd ?? 0 },
        avgLatencyMs: newAvgLatency,
      },
    })

    return reply.status(201).send(request)
  })

  app.get('/requests/stats', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const requests = await prisma.llmRequest.findMany({
      where: { tenantId, requestedAt: { gte: monthStart } },
      include: { provider: { select: { name: true, providerType: true } } },
    })

    const byProvider: Record<string, { count: number; cost: number; tokens: number; successCount: number }> = {}
    const byModule: Record<string, { count: number; cost: number }> = {}
    const byDay: Record<string, number> = {}

    for (const r of requests) {
      const pt = r.provider.providerType
      if (!byProvider[pt]) byProvider[pt] = { count: 0, cost: 0, tokens: 0, successCount: 0 }
      byProvider[pt].count++
      byProvider[pt].cost += r.costUsd
      byProvider[pt].tokens += r.totalTokens
      if (r.success) byProvider[pt].successCount++

      if (!byModule[r.module]) byModule[r.module] = { count: 0, cost: 0 }
      byModule[r.module].count++
      byModule[r.module].cost += r.costUsd

      const day = r.requestedAt.toISOString().slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + 1
    }

    return {
      totalRequests: requests.length,
      totalCost: Math.round(requests.reduce((s, r) => s + r.costUsd, 0) * 10000) / 10000,
      totalTokens: requests.reduce((s, r) => s + r.totalTokens, 0),
      successRate: requests.length > 0 ? Math.round((requests.filter(r => r.success).length / requests.length) * 100) / 100 : 1,
      byProvider: Object.entries(byProvider).map(([p, v]) => ({
        provider: p, count: v.count, costUsd: Math.round(v.cost * 10000) / 10000,
        tokens: v.tokens, successRate: v.count > 0 ? Math.round((v.successCount / v.count) * 100) / 100 : 1,
      })),
      byModule: Object.entries(byModule).map(([m, v]) => ({
        module: m, count: v.count, costUsd: Math.round(v.cost * 10000) / 10000,
      })),
      byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    }
  })

  // ── Cost Dashboard ────────────────────────────────────────────────────────────
  app.get('/cost', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { period?: string }
    const period = q.period ?? 'month'
    const now = new Date()
    const fromDate = period === 'today'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : period === 'week'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getFullYear(), now.getMonth(), 1)

    const requests = await prisma.llmRequest.findMany({
      where: { tenantId, requestedAt: { gte: fromDate } },
      include: { provider: { select: { name: true, providerType: true } } },
    })

    const byCost: Record<string, { count: number; costUsd: number; savedVsGpt4: number }> = {}
    const GPT4_COST_PER_REQ = 0.02
    for (const r of requests) {
      const k = r.provider.providerType
      if (!byCost[k]) byCost[k] = { count: 0, costUsd: 0, savedVsGpt4: 0 }
      byCost[k].count++
      byCost[k].costUsd += r.costUsd
      byCost[k].savedVsGpt4 += Math.max(0, GPT4_COST_PER_REQ - r.costUsd)
    }

    const totalCost = requests.reduce((s, r) => s + r.costUsd, 0)
    const totalSaved = requests.reduce((s, r) => s + Math.max(0, GPT4_COST_PER_REQ - r.costUsd), 0)

    return {
      period, totalCost: Math.round(totalCost * 10000) / 10000,
      totalSaved: Math.round(totalSaved * 10000) / 10000,
      breakdown: Object.entries(byCost).map(([provider, v]) => ({
        provider, count: v.count,
        costUsd: Math.round(v.costUsd * 10000) / 10000,
        savedVsGpt4: Math.round(v.savedVsGpt4 * 10000) / 10000,
      })).sort((a, b) => b.costUsd - a.costUsd),
    }
  })

  // ── AI Router ────────────────────────────────────────────────────────────────
  app.post('/router/select', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { module: string; taskType?: string }

    const [providers, policy] = await Promise.all([
      prisma.llmProvider.findMany({ where: { tenantId, isEnabled: true } }),
      prisma.llmPolicy.findFirst({ where: { tenantId, module: body.module, isActive: true } }),
    ])

    const result = selectBestProvider(providers, policy)
    return reply.status(200).send({
      module: body.module, taskType: body.taskType ?? 'generate',
      selected: result.provider
        ? { id: result.provider.id, name: result.provider.name, providerType: result.provider.providerType }
        : null,
      reason: result.reason,
      fallback: policy ? (policy.fallbackOrder as string[]) : [],
      policyApplied: !!policy,
    })
  })

  // ── Policies ─────────────────────────────────────────────────────────────────
  app.get('/policies', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.llmPolicy.findMany({ where: { tenantId }, orderBy: { module: 'asc' } })
  })

  app.post('/policies', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      module: string; allowedProviders?: string[]; preferredProvider?: string
      fallbackOrder?: string[]; maxCostPerRequest?: number; requiresApproval?: boolean
    }

    const policy = await prisma.llmPolicy.upsert({
      where: { tenantId_module: { tenantId, module: body.module } },
      create: {
        tenantId, module: body.module,
        allowedProviders: body.allowedProviders as never ?? [] as never,
        preferredProvider: body.preferredProvider ?? null,
        fallbackOrder: body.fallbackOrder as never ?? [] as never,
        maxCostPerRequest: body.maxCostPerRequest ?? null,
        requiresApproval: body.requiresApproval ?? false,
      },
      update: {
        allowedProviders: body.allowedProviders as never,
        preferredProvider: body.preferredProvider ?? null,
        fallbackOrder: body.fallbackOrder as never,
        maxCostPerRequest: body.maxCostPerRequest ?? null,
        requiresApproval: body.requiresApproval ?? false,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPSERT', module: 'LLMOPS', entityType: 'LlmPolicy', entityId: policy.id, newValues: policy as never },
    }).catch(() => null)

    return reply.status(201).send(policy)
  })

  app.patch('/policies/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.llmPolicy.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Record<string, unknown>
    const updated = await prisma.llmPolicy.update({ where: { id }, data: body as never })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPDATE', module: 'LLMOPS', entityType: 'LlmPolicy', entityId: id, newValues: updated as never },
    }).catch(() => null)
    return updated
  })

  // ── Prompt Versioning ─────────────────────────────────────────────────────────
  app.get('/prompts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    // Return only active (latest) versions per promptKey
    const all = await prisma.llmPromptVersion.findMany({ where: { tenantId }, orderBy: [{ promptKey: 'asc' }, { version: 'desc' }] })
    const latest: Record<string, typeof all[0]> = {}
    for (const p of all) {
      if (!latest[p.promptKey] || p.version > latest[p.promptKey].version) latest[p.promptKey] = p
    }
    return Object.values(latest)
  })

  app.get('/prompts/history/:key', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { key } = req.params as { key: string }
    return prisma.llmPromptVersion.findMany({
      where: { tenantId, promptKey: key },
      orderBy: { version: 'desc' },
    })
  })

  app.post('/prompts', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      promptKey: string; title: string; content: string
      variables?: string[]; changelog?: string
    }

    // Auto-increment version
    const latest = await prisma.llmPromptVersion.findFirst({
      where: { tenantId, promptKey: body.promptKey }, orderBy: { version: 'desc' },
    })
    const version = (latest?.version ?? 0) + 1

    // Deactivate previous versions
    if (latest) {
      await prisma.llmPromptVersion.updateMany({
        where: { tenantId, promptKey: body.promptKey }, data: { isActive: false },
      })
    }

    const prompt = await prisma.llmPromptVersion.create({
      data: {
        tenantId, promptKey: body.promptKey, version, title: body.title,
        content: body.content, variables: body.variables as never ?? [] as never,
        isActive: true, createdBy: userId, changelog: body.changelog ?? null,
      },
    })

    return reply.status(201).send(prompt)
  })

  app.post('/prompts/:key/activate/:version', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { key, version } = req.params as { key: string; version: string }
    const target = await prisma.llmPromptVersion.findFirst({
      where: { tenantId, promptKey: key, version: parseInt(version, 10) },
    })
    if (!target) return reply.status(404).send({ error: 'Prompt version not found' })

    await prisma.llmPromptVersion.updateMany({ where: { tenantId, promptKey: key }, data: { isActive: false } })
    const activated = await prisma.llmPromptVersion.update({ where: { id: target.id }, data: { isActive: true } })
    return activated
  })

  // ── Experiment Lab ────────────────────────────────────────────────────────────
  app.get('/experiments', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.llmExperiment.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { results: { orderBy: { rank: 'asc' } } },
    })
  })

  app.post('/experiments', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      name: string; description?: string; taskType: string
      samplePrompt: string; sampleCount?: number; providers: string[]
    }

    const experiment = await prisma.llmExperiment.create({
      data: {
        tenantId, name: body.name, description: body.description ?? null,
        taskType: body.taskType, samplePrompt: body.samplePrompt,
        sampleCount: body.sampleCount ?? 10,
        providers: body.providers as never, status: 'pending',
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'LLMOPS', entityType: 'LlmExperiment', entityId: experiment.id, newValues: experiment as never },
    }).catch(() => null)

    return reply.status(201).send(experiment)
  })

  app.get('/experiments/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const exp = await prisma.llmExperiment.findFirst({
      where: { id, tenantId },
      include: { results: { orderBy: { rank: 'asc' } } },
    })
    if (!exp) return reply.status(404).send({ error: 'Not found' })
    return exp
  })

  app.post('/experiments/:id/run', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const exp = await prisma.llmExperiment.findFirst({ where: { id, tenantId } })
    if (!exp) return reply.status(404).send({ error: 'Not found' })

    await prisma.llmExperiment.update({ where: { id }, data: { status: 'running', startedAt: new Date() } })

    const providers = exp.providers as string[]
    const rawResults = simulateExperimentRun(providers, exp.sampleCount)
    const ranked = rankResults(rawResults)

    // Delete old results and insert new
    await prisma.llmExperimentResult.deleteMany({ where: { experimentId: id } })
    await Promise.all(ranked.map(r =>
      prisma.llmExperimentResult.create({
        data: {
          experimentId: id, provider: r.provider,
          avgLatencyMs: r.avgLatencyMs, avgCostUsd: r.avgCostUsd,
          successRate: r.successRate, accuracyScore: r.accuracyScore ?? null,
          totalRuns: r.totalRuns, rank: r.rank,
          aiRecommendation: r.aiRecommendation ?? null,
        },
      }),
    ))

    const winner = ranked[0]
    const updated = await prisma.llmExperiment.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date(), recommendation: winner.aiRecommendation ?? null },
      include: { results: { orderBy: { rank: 'asc' } } },
    })

    return updated
  })

  // ── Benchmarks ────────────────────────────────────────────────────────────────
  app.get('/benchmarks', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const providers = await prisma.llmProvider.findMany({ where: { tenantId } })
    const allResults = await prisma.llmExperimentResult.findMany({
      where: { experiment: { tenantId } } as never,
    })

    const byProvider: Record<string, { wins: number; avgAccuracy: number; avgLatency: number; avgCost: number; appearances: number }> = {}
    for (const r of allResults) {
      if (!byProvider[r.provider]) byProvider[r.provider] = { wins: 0, avgAccuracy: 0, avgLatency: 0, avgCost: 0, appearances: 0 }
      byProvider[r.provider].appearances++
      if (r.rank === 1) byProvider[r.provider].wins++
      byProvider[r.provider].avgAccuracy += r.accuracyScore ?? 0
      byProvider[r.provider].avgLatency += r.avgLatencyMs
      byProvider[r.provider].avgCost += r.avgCostUsd
    }

    const benchmarks = providers.map(p => {
      const bench = byProvider[p.providerType]
      return {
        provider: p.name, providerType: p.providerType, status: p.status,
        requestCount: p.requestCount, successRate: p.requestCount > 0 ? Math.round((p.successCount / p.requestCount) * 100) / 100 : null,
        avgLatencyMs: Math.round(p.avgLatencyMs), totalCostUsd: Math.round(p.totalCostUsd * 10000) / 10000,
        experimentWins: bench?.wins ?? 0,
        experimentAppearances: bench?.appearances ?? 0,
        avgExperimentAccuracy: bench && bench.appearances > 0 ? Math.round((bench.avgAccuracy / bench.appearances) * 100) / 100 : null,
        score: Math.round(computeProviderScore(p) * 100) / 100,
      }
    })

    return benchmarks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  })
}
