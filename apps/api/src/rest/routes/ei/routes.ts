import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  analyzeStrategicGoal,
  analyzeBoardMetric,
  processCompetitorSignal,
  generateExecutiveInsights,
  computeExecutiveSummary,
} from './ai-engine.js'

export async function eiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ────────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [goals, metrics, signals, insights] = await Promise.all([
      prisma.eiStrategicGoal.findMany({ where: { tenantId } }),
      prisma.eiBoardMetric.findMany({ where: { tenantId } }),
      prisma.eiCompetitorSignal.findMany({ where: { tenantId }, orderBy: { signalDate: 'desc' }, take: 10 }),
      prisma.eiExecutiveInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 5 }),
    ])
    return { summary: computeExecutiveSummary(goals, metrics), goals, metrics, signals, insights }
  })

  // ── Strategic Goals ──────────────────────────────────────────────────────────
  app.get('/strategic-goals', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.eiStrategicGoal.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/strategic-goals', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      title: string; category: string; owner?: string
      targetDate?: string; targetValue?: number; currentValue?: number; status?: string; keyResults?: unknown[]
    }

    const analysis = analyzeStrategicGoal({
      title: body.title,
      category: body.category,
      progress: 0,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      targetValue: body.targetValue ?? null,
      currentValue: body.currentValue ?? 0,
      status: body.status ?? 'not_started',
    })

    const goal = await prisma.eiStrategicGoal.create({
      data: {
        tenantId,
        title: body.title,
        category: body.category,
        owner: body.owner ?? null,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        targetValue: body.targetValue ?? null,
        currentValue: body.currentValue ?? 0,
        progress: 0,
        status: body.status ?? 'not_started',
        aiProbability: analysis.aiProbability,
        aiProjectedDate: analysis.aiProjectedDate,
        aiInsights: analysis.insights as never,
        keyResults: body.keyResults as never ?? analysis.keyResults as never,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'EI', entityType: 'EiStrategicGoal', entityId: goal.id, newValues: goal as never },
    }).catch(() => null)

    return reply.status(201).send(goal)
  })

  app.get('/strategic-goals/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const goal = await prisma.eiStrategicGoal.findFirst({ where: { id, tenantId } })
    if (!goal) return reply.status(404).send({ error: 'Not found' })
    return goal
  })

  app.patch('/strategic-goals/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as {
      title?: string; category?: string; owner?: string; progress?: number
      targetDate?: string; targetValue?: number; currentValue?: number; status?: string; keyResults?: unknown[]
    }

    const existing = await prisma.eiStrategicGoal.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })

    const analysis = analyzeStrategicGoal({
      title: body.title ?? existing.title,
      category: body.category ?? existing.category,
      progress: body.progress ?? existing.progress,
      targetDate: body.targetDate ? new Date(body.targetDate) : existing.targetDate,
      targetValue: body.targetValue ?? existing.targetValue,
      currentValue: body.currentValue ?? existing.currentValue,
      status: body.status ?? existing.status,
    })

    const goal = await prisma.eiStrategicGoal.update({
      where: { id },
      data: {
        ...body,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        keyResults: body.keyResults as never,
        aiProbability: analysis.aiProbability,
        aiProjectedDate: analysis.aiProjectedDate,
        aiInsights: analysis.insights as never,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPDATE', module: 'EI', entityType: 'EiStrategicGoal', entityId: id, newValues: goal as never },
    }).catch(() => null)

    return goal
  })

  app.delete('/strategic-goals/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.eiStrategicGoal.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    await prisma.eiStrategicGoal.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE', module: 'EI', entityType: 'EiStrategicGoal', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return reply.status(204).send()
  })

  app.post('/strategic-goals/:id/analyze', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const goal = await prisma.eiStrategicGoal.findFirst({ where: { id, tenantId } })
    if (!goal) return reply.status(404).send({ error: 'Not found' })

    const analysis = analyzeStrategicGoal({
      title: goal.title,
      category: goal.category,
      progress: goal.progress,
      targetDate: goal.targetDate,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      status: goal.status,
    })

    const updated = await prisma.eiStrategicGoal.update({
      where: { id },
      data: {
        aiProbability: analysis.aiProbability,
        aiProjectedDate: analysis.aiProjectedDate,
        aiInsights: analysis.insights as never,
        keyResults: analysis.keyResults as never,
      },
    })
    return updated
  })

  // ── Board Metrics ────────────────────────────────────────────────────────────
  app.get('/board-metrics', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.eiBoardMetric.findMany({ where: { tenantId }, orderBy: { period: 'desc' } })
  })

  app.post('/board-metrics', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      metricCode: string; metricName: string; period: string
      actual: number; target: number; benchmark?: number
    }

    const ai = analyzeBoardMetric({
      metricCode: body.metricCode,
      metricName: body.metricName,
      actual: body.actual,
      target: body.target,
      benchmark: body.benchmark,
    })

    const metric = await prisma.eiBoardMetric.create({
      data: {
        tenantId,
        metricCode: body.metricCode,
        metricName: body.metricName,
        period: body.period,
        actual: body.actual,
        target: body.target,
        benchmark: body.benchmark ?? null,
        aiPredicted: ai.aiPredicted,
        aiTrend: ai.aiTrend,
        aiComment: ai.aiComment,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'EI', entityType: 'EiBoardMetric', entityId: metric.id, newValues: metric as never },
    }).catch(() => null)

    return reply.status(201).send(metric)
  })

  app.post('/board-metrics/upsert', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      metricCode: string; metricName: string; period: string
      actual: number; target: number; benchmark?: number
    }

    const ai = analyzeBoardMetric({
      metricCode: body.metricCode,
      metricName: body.metricName,
      actual: body.actual,
      target: body.target,
      benchmark: body.benchmark,
    })

    const metric = await prisma.eiBoardMetric.upsert({
      where: { tenantId_metricCode_period: { tenantId, metricCode: body.metricCode, period: body.period } },
      create: {
        tenantId,
        metricCode: body.metricCode,
        metricName: body.metricName,
        period: body.period,
        actual: body.actual,
        target: body.target,
        benchmark: body.benchmark ?? null,
        aiPredicted: ai.aiPredicted,
        aiTrend: ai.aiTrend,
        aiComment: ai.aiComment,
      },
      update: {
        actual: body.actual,
        target: body.target,
        benchmark: body.benchmark ?? null,
        aiPredicted: ai.aiPredicted,
        aiTrend: ai.aiTrend,
        aiComment: ai.aiComment,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPSERT', module: 'EI', entityType: 'EiBoardMetric', entityId: metric.id, newValues: metric as never },
    }).catch(() => null)

    return reply.status(201).send(metric)
  })

  // ── Competitor Signals ───────────────────────────────────────────────────────
  app.get('/competitor-signals', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.eiCompetitorSignal.findMany({ where: { tenantId }, orderBy: { signalDate: 'desc' } })
  })

  app.post('/competitor-signals', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      competitor: string; signalType: string; summary: string
      impact: string; source?: string; signalDate?: string
    }

    const aiResponse = processCompetitorSignal({
      signalType: body.signalType,
      summary: body.summary,
      competitor: body.competitor,
      impact: body.impact,
    })

    const signal = await prisma.eiCompetitorSignal.create({
      data: {
        tenantId,
        competitor: body.competitor,
        signalType: body.signalType,
        summary: body.summary,
        impact: body.impact,
        aiResponse,
        source: body.source ?? null,
        signalDate: body.signalDate ? new Date(body.signalDate) : new Date(),
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'EI', entityType: 'EiCompetitorSignal', entityId: signal.id, newValues: signal as never },
    }).catch(() => null)

    return reply.status(201).send(signal)
  })

  app.delete('/competitor-signals/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.eiCompetitorSignal.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    await prisma.eiCompetitorSignal.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE', module: 'EI', entityType: 'EiCompetitorSignal', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return reply.status(204).send()
  })

  // ── Executive Insights ───────────────────────────────────────────────────────
  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.eiExecutiveInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' } })
  })

  app.post('/insights/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }

    const [goals, metrics, competitors] = await Promise.all([
      prisma.eiStrategicGoal.findMany({ where: { tenantId } }),
      prisma.eiBoardMetric.findMany({ where: { tenantId } }),
      prisma.eiCompetitorSignal.findMany({ where: { tenantId }, orderBy: { signalDate: 'desc' }, take: 20 }),
    ])

    const insightDefs = generateExecutiveInsights(
      goals.map(g => ({ title: g.title, status: g.status, aiProbability: g.aiProbability, category: g.category })),
      metrics.map(m => ({ metricName: m.metricName, actual: m.actual, target: m.target, aiTrend: m.aiTrend })),
      competitors.map(c => ({ competitor: c.competitor, signalType: c.signalType, impact: c.impact })),
    )

    const created = await Promise.all(
      insightDefs.map(ins =>
        prisma.eiExecutiveInsight.create({
          data: {
            tenantId,
            type: ins.type,
            title: ins.title,
            summary: ins.summary,
            urgency: ins.urgency,
            impact: ins.impact,
            confidence: ins.confidence,
            actionItems: ins.actionItems as never,
            data: {} as never,
          },
        }),
      ),
    )

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'GENERATE', module: 'EI', entityType: 'EiExecutiveInsight', entityId: 'bulk', newValues: { count: created.length } as never },
    }).catch(() => null)

    return reply.status(201).send(created)
  })
}
