import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  analyseSignalRelevance, adjustGoalSuccessProb, detectThreats,
  generateExternalBriefing, simulateSignals, scoreSignalRelevance,
} from './ai-engine.js'
import type { Signal, Goal } from './ai-engine.js'

export async function externalIntelligenceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [sourceCount, signalCount, activeAlerts, insightCount] = await Promise.all([
      prisma.eieSource.count({ where: { tenantId, enabled: true } }),
      prisma.eieSignal.count({ where: { tenantId } }),
      prisma.eieAlert.count({ where: { tenantId, dismissed: false } }),
      prisma.eieInsight.count({ where: { tenantId } }),
    ])
    const recentSignals = await prisma.eieSignal.findMany({
      where: { tenantId },
      orderBy: { signalDate: 'desc' },
      take: 50,
    })
    const positive = recentSignals.filter(s => s.sentiment === 'positive').length
    const negative = recentSignals.filter(s => s.sentiment === 'negative').length
    const marketSentiment = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral'

    return {
      success: true,
      data: {
        sources: sourceCount, signals: signalCount, activeAlerts, insights: insightCount,
        marketSentiment,
        signalBreakdown: { positive, negative, neutral: recentSignals.length - positive - negative },
      },
    }
  })

  // ── Sources ────────────────────────────────────────────────────────────────

  app.get('/sources', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const sources = await prisma.eieSource.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: sources }
  })

  app.post('/sources', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; type: string; category: string; url?: string; config?: Record<string, unknown> }
    const source = await prisma.eieSource.create({
      data: {
        tenantId, name: body.name, type: body.type, category: body.category,
        url: body.url ?? null, config: body.config ? (body.config as never) : undefined,
      },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EIE_SOURCE_CREATED', module: 'external-intelligence', entityType: 'EieSource', entityId: source.id, newValues: { name: body.name, type: body.type } as never },
    }).catch(() => null)
    return { success: true, data: source }
  })

  app.patch('/sources/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { enabled?: boolean; name?: string; url?: string }
    const src = await prisma.eieSource.findFirst({ where: { id, tenantId } })
    if (!src) return reply.code(404).send({ success: false, error: 'Source not found' })
    const updated = await prisma.eieSource.update({ where: { id }, data: body })
    return { success: true, data: updated }
  })

  app.delete('/sources/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const src = await prisma.eieSource.findFirst({ where: { id, tenantId } })
    if (!src) return reply.code(404).send({ success: false, error: 'Source not found' })
    await prisma.eieSource.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EIE_SOURCE_DELETED', module: 'external-intelligence', entityType: 'EieSource', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return { success: true, data: { deleted: true } }
  })

  // ── Signals ────────────────────────────────────────────────────────────────

  app.get('/signals', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const signals = await prisma.eieSignal.findMany({
      where: {
        tenantId,
        ...(q.type ? { type: q.type } : {}),
        ...(q.sentiment ? { sentiment: q.sentiment } : {}),
      },
      include: { source: { select: { name: true, type: true } } },
      orderBy: { signalDate: 'desc' },
      take: 100,
    })
    return { success: true, data: signals }
  })

  app.post('/signals', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      type: string; title: string; summary?: string; value?: number; unit?: string
      sentiment?: string; tags?: string[]; externalUrl?: string; signalDate?: string; sourceId?: string
    }

    const goals = await prisma.ageGoal.findMany({ where: { tenantId, status: 'active' } })
    const signalLike: Signal = {
      id: 'tmp', type: body.type, title: body.title, summary: body.summary ?? null,
      value: body.value ?? null, unit: body.unit ?? null, sentiment: body.sentiment ?? null,
      relevance: null, tags: body.tags ?? [], signalDate: new Date(body.signalDate ?? Date.now()),
    }
    const maxRelevance = (goals as unknown as Goal[]).reduce(
      (max, g) => Math.max(max, scoreSignalRelevance(signalLike, g)), 0,
    )

    const signal = await prisma.eieSignal.create({
      data: {
        tenantId,
        sourceId: body.sourceId ?? null,
        type: body.type,
        title: body.title,
        summary: body.summary ?? null,
        value: body.value ?? null,
        unit: body.unit ?? null,
        sentiment: body.sentiment ?? null,
        relevance: maxRelevance,
        tags: body.tags ?? [],
        externalUrl: body.externalUrl ?? null,
        signalDate: new Date(body.signalDate ?? Date.now()),
      },
    })

    // Auto-detect threats and create alerts
    const threats = detectThreats(signalLike, goals as unknown as Goal[])
    for (const threat of threats) {
      await prisma.eieAlert.create({
        data: { tenantId, signalId: signal.id, severity: threat.severity, title: threat.title, message: threat.message, goalIds: threat.goalIds },
      })
    }

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EIE_SIGNAL_ADDED', module: 'external-intelligence', entityType: 'EieSignal', entityId: signal.id, newValues: { type: body.type, sentiment: body.sentiment } as never },
    }).catch(() => null)

    return { success: true, data: { signal, threatsGenerated: threats.length } }
  })

  app.post('/signals/simulate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { type: string }
    const simulated = simulateSignals(body.type, tenantId)
    if (simulated.length === 0) return { success: false, error: `No simulation available for type: ${body.type}` }

    const created = []
    for (const s of simulated) {
      const signal = await prisma.eieSignal.create({ data: s as never })
      created.push(signal)
    }

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EIE_SIGNALS_SIMULATED', module: 'external-intelligence', entityType: 'EieSignal', entityId: tenantId, newValues: { type: body.type, count: created.length } as never },
    }).catch(() => null)

    return { success: true, data: { created: created.length, signals: created } }
  })

  app.get('/signals/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const signal = await prisma.eieSignal.findFirst({
      where: { id, tenantId },
      include: { source: true, alerts: true },
    })
    if (!signal) return reply.code(404).send({ success: false, error: 'Signal not found' })

    const goals = await prisma.ageGoal.findMany({ where: { tenantId, status: 'active' } })
    const relevances = analyseSignalRelevance(signal as unknown as Signal, goals as unknown as Goal[])

    return { success: true, data: { ...signal, goalRelevances: relevances } }
  })

  // ── Alerts ─────────────────────────────────────────────────────────────────

  app.get('/alerts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const alerts = await prisma.eieAlert.findMany({
      where: { tenantId, ...(q.dismissed === 'true' ? {} : { dismissed: false }) },
      include: { signal: { select: { type: true, title: true, signalDate: true } } },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    })
    return { success: true, data: alerts }
  })

  app.patch('/alerts/:id/dismiss', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const alert = await prisma.eieAlert.findFirst({ where: { id, tenantId } })
    if (!alert) return reply.code(404).send({ success: false, error: 'Alert not found' })
    const updated = await prisma.eieAlert.update({ where: { id }, data: { dismissed: true } })
    return { success: true, data: updated }
  })

  // ── AI Analysis ────────────────────────────────────────────────────────────

  app.get('/analysis', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [signals, goals] = await Promise.all([
      prisma.eieSignal.findMany({ where: { tenantId }, orderBy: { signalDate: 'desc' }, take: 30 }),
      prisma.ageGoal.findMany({ where: { tenantId, status: 'active' } }),
    ])
    const goalObjects = goals as unknown as Goal[]
    const signalObjects = signals as unknown as Signal[]

    const riskAdjustments = goalObjects.map(g => adjustGoalSuccessProb(g, signalObjects))
    const allRelevances = signalObjects.flatMap(s => analyseSignalRelevance(s, goalObjects))

    return {
      success: true,
      data: {
        riskAdjustments,
        topRelevances: allRelevances.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10),
      },
    }
  })

  app.get('/executive-briefing', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [signals, goals] = await Promise.all([
      prisma.eieSignal.findMany({ where: { tenantId }, orderBy: { signalDate: 'desc' }, take: 20 }),
      prisma.ageGoal.findMany({ where: { tenantId, status: 'active' } }),
    ])

    const briefing = generateExternalBriefing(signals as unknown as Signal[], goals as unknown as Goal[])

    const insight = await prisma.eieInsight.create({
      data: {
        tenantId,
        type: 'executive_briefing',
        title: `Executive Intelligence Briefing — ${new Date().toLocaleDateString()}`,
        content: briefing.executiveSummary,
        data: briefing as never,
        goalIds: goals.map(g => g.id),
        signalIds: signals.map(s => s.id),
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EIE_BRIEFING_GENERATED', module: 'external-intelligence', entityType: 'EieInsight', entityId: insight.id, newValues: { signals: signals.length, goals: goals.length } as never },
    }).catch(() => null)

    return { success: true, data: { ...briefing, insightId: insight.id } }
  })

  // ── Insights ───────────────────────────────────────────────────────────────

  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const insights = await prisma.eieInsight.findMany({
      where: { tenantId },
      orderBy: { generatedAt: 'desc' },
      take: 20,
    })
    return { success: true, data: insights }
  })

  app.post('/insights/goal-impact', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { goalId: string }
    const [goal, signals] = await Promise.all([
      prisma.ageGoal.findFirst({ where: { id: body.goalId, tenantId } }),
      prisma.eieSignal.findMany({ where: { tenantId }, orderBy: { signalDate: 'desc' }, take: 30 }),
    ])
    if (!goal) return reply.code(404).send({ success: false, error: 'Goal not found' })

    const goalObject = goal as unknown as Goal
    const signalObjects = signals as unknown as Signal[]
    const adjustment = adjustGoalSuccessProb(goalObject, signalObjects)
    const relevances = signalObjects
      .flatMap(s => analyseSignalRelevance(s, [goalObject]))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)

    const directionWord = adjustment.adjustment >= 0 ? 'increase' : 'decrease'
    const content = `Market signals affect "${goal.title}" with ${Math.abs(adjustment.adjustment)}% ${directionWord} in success probability. Key drivers: ${adjustment.drivers.slice(0, 3).join('; ')}.`

    const insight = await prisma.eieInsight.create({
      data: {
        tenantId,
        type: 'goal_impact',
        title: `External Impact: ${goal.title}`,
        content,
        data: { adjustment, relevances } as never,
        goalIds: [goal.id],
        signalIds: signals.map(s => s.id).slice(0, 10),
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EIE_GOAL_IMPACT_GENERATED', module: 'external-intelligence', entityType: 'EieInsight', entityId: insight.id, newValues: { goalId: goal.id, adjustment: adjustment.adjustment } as never },
    }).catch(() => null)

    return { success: true, data: { adjustment, relevances, insight } }
  })
}
