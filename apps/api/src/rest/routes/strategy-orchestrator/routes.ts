import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  scorePortfolio, detectConflicts, generateInitiativesFromContext,
  cascadeKPIs, buildExecutiveCalendar, generateStrategyReview, buildDecisionBoard,
} from './ai-engine.js'
import type { Initiative, Goal, Signal } from './ai-engine.js'

export async function strategyOrchestratorRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [total, active, atRisk, completed, conflicts, reviews] = await Promise.all([
      prisma.asoInitiative.count({ where: { tenantId } }),
      prisma.asoInitiative.count({ where: { tenantId, status: 'active' } }),
      prisma.asoInitiative.count({ where: { tenantId, status: 'active', riskScore: { gte: 60 } } }),
      prisma.asoInitiative.count({ where: { tenantId, status: 'completed' } }),
      prisma.asoConflict.count({ where: { tenantId, resolved: false } }),
      prisma.asoStrategyReview.count({ where: { tenantId } }),
    ])
    const byDept = await prisma.asoInitiative.groupBy({
      by: ['department'], where: { tenantId, status: 'active' }, _count: true,
    })
    return { success: true, data: { total, active, atRisk, completed, activeConflicts: conflicts, reviews, byDepartment: byDept } }
  })

  // ── Initiatives CRUD ───────────────────────────────────────────────────────

  app.get('/initiatives', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const initiatives = await prisma.asoInitiative.findMany({
      where: {
        tenantId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.department ? { department: q.department } : {}),
        ...(q.type ? { type: q.type } : {}),
      },
      include: { portfolioItems: { orderBy: { scoredAt: 'desc' }, take: 1 } },
      orderBy: [{ portfolioScore: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    })
    return { success: true, data: initiatives }
  })

  app.get('/initiatives/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const initiative = await prisma.asoInitiative.findFirst({
      where: { id, tenantId },
      include: {
        portfolioItems: { orderBy: { scoredAt: 'desc' }, take: 1 },
        conflictsA: { include: { initiativeB: { select: { id: true, title: true } } } },
        conflictsB: { include: { initiativeA: { select: { id: true, title: true } } } },
      },
    })
    if (!initiative) return reply.code(404).send({ success: false, error: 'Initiative not found' })
    return { success: true, data: initiative }
  })

  app.post('/initiatives', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      title: string; description?: string; type: string; department: string
      priority?: string; estimatedBudget?: number; estimatedRoi?: number
      riskScore?: number; timeHorizon?: string; linkedGoalIds?: string[]
      startDate?: string; endDate?: string
    }

    const initiative = await prisma.asoInitiative.create({
      data: {
        tenantId, userId,
        title: body.title,
        description: body.description ?? null,
        type: body.type,
        department: body.department,
        priority: body.priority ?? 'medium',
        estimatedBudget: body.estimatedBudget ?? null,
        estimatedRoi: body.estimatedRoi ?? null,
        riskScore: body.riskScore ?? null,
        timeHorizon: body.timeHorizon ?? '90d',
        linkedGoalIds: body.linkedGoalIds ?? [],
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_INITIATIVE_CREATED', module: 'strategy-orchestrator', entityType: 'AsoInitiative', entityId: initiative.id, newValues: { title: body.title, type: body.type } as never },
    }).catch(() => null)

    return { success: true, data: initiative }
  })

  app.put('/initiatives/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const ini = await prisma.asoInitiative.findFirst({ where: { id, tenantId } })
    if (!ini) return reply.code(404).send({ success: false, error: 'Initiative not found' })

    const allowed = ['title', 'description', 'status', 'priority', 'estimatedBudget', 'estimatedRoi', 'riskScore', 'urgencyScore', 'timeHorizon', 'aiPlan', 'kpiCascade']
    const data: Record<string, unknown> = {}
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key]

    const updated = await prisma.asoInitiative.update({ where: { id }, data })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_INITIATIVE_UPDATED', module: 'strategy-orchestrator', entityType: 'AsoInitiative', entityId: id, newValues: data as never },
    }).catch(() => null)
    return { success: true, data: updated }
  })

  app.delete('/initiatives/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const ini = await prisma.asoInitiative.findFirst({ where: { id, tenantId } })
    if (!ini) return reply.code(404).send({ success: false, error: 'Initiative not found' })
    await prisma.asoInitiative.update({ where: { id }, data: { status: 'cancelled' } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_INITIATIVE_CANCELLED', module: 'strategy-orchestrator', entityType: 'AsoInitiative', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return { success: true, data: { cancelled: true } }
  })

  // AI-generate initiatives from existing goals + signals
  app.post('/initiatives/generate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [goals, signals] = await Promise.all([
      prisma.ageGoal.findMany({ where: { tenantId, status: 'active' }, take: 10 }),
      prisma.eieSignal.findMany({ where: { tenantId, sentiment: 'negative' }, orderBy: { signalDate: 'desc' }, take: 5 }),
    ])

    const generated = generateInitiativesFromContext(goals as unknown as Goal[], signals as unknown as Signal[])
    const created = []
    for (const g of generated) {
      const ini = await prisma.asoInitiative.create({
        data: {
          tenantId, userId,
          title: g.title, type: g.type, department: g.department,
          status: g.status, priority: g.priority,
          estimatedBudget: g.estimatedBudget ?? null,
          estimatedRoi: g.estimatedRoi ?? null,
          riskScore: g.riskScore ?? null,
          urgencyScore: g.urgencyScore ?? null,
          strategicScore: g.strategicScore ?? null,
          linkedGoalIds: g.linkedGoalIds,
          linkedSignalIds: g.linkedSignalIds,
          timeHorizon: g.timeHorizon,
          aiPlan: g.aiPlan as never,
        },
      })
      created.push(ini)
    }

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_INITIATIVES_GENERATED', module: 'strategy-orchestrator', entityType: 'AsoInitiative', entityId: tenantId, newValues: { count: created.length } as never },
    }).catch(() => null)

    return { success: true, data: { generated: created.length, initiatives: created } }
  })

  // ── Portfolio ──────────────────────────────────────────────────────────────

  app.get('/portfolio', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const items = await prisma.asoPortfolioItem.findMany({
      where: { tenantId },
      include: { initiative: true },
      orderBy: { rank: 'asc' },
      take: 50,
    })
    return { success: true, data: items }
  })

  app.post('/portfolio/prioritize', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const initiatives = await prisma.asoInitiative.findMany({
      where: { tenantId, status: { in: ['active', 'draft'] } },
    })
    if (initiatives.length === 0) return { success: true, data: { ranked: 0, items: [] } }

    const scores = scorePortfolio(initiatives as unknown as Initiative[])

    // Clear old portfolio items and write new
    await prisma.asoPortfolioItem.deleteMany({ where: { tenantId } })
    const items = await prisma.asoPortfolioItem.createMany({
      data: scores.map(s => ({
        tenantId, initiativeId: s.initiativeId,
        rank: s.rank, roiScore: s.roiScore, riskScore: s.riskScore,
        urgencyScore: s.urgencyScore, strategicScore: s.strategicScore,
        totalScore: s.totalScore, rationale: s.rationale,
      })),
    })

    // Update portfolio score on each initiative
    for (const s of scores) {
      await prisma.asoInitiative.update({ where: { id: s.initiativeId }, data: { portfolioScore: s.totalScore } })
    }

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_PORTFOLIO_PRIORITIZED', module: 'strategy-orchestrator', entityType: 'AsoPortfolioItem', entityId: tenantId, newValues: { count: scores.length } as never },
    }).catch(() => null)

    return { success: true, data: { ranked: scores.length, scores } }
  })

  // ── Conflicts ──────────────────────────────────────────────────────────────

  app.get('/conflicts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const conflicts = await prisma.asoConflict.findMany({
      where: { tenantId, resolved: false },
      include: {
        initiativeA: { select: { id: true, title: true, department: true } },
        initiativeB: { select: { id: true, title: true, department: true } },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    })
    return { success: true, data: conflicts }
  })

  app.post('/conflicts/detect', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const initiatives = await prisma.asoInitiative.findMany({
      where: { tenantId, status: { in: ['active', 'draft'] } },
    })

    const detected = detectConflicts(initiatives as unknown as Initiative[])

    // Remove old unresolved conflicts and write new ones
    await prisma.asoConflict.deleteMany({ where: { tenantId, resolved: false } })
    const created = []
    for (const c of detected) {
      const conflict = await prisma.asoConflict.create({
        data: { tenantId, initiativeAId: c.initiativeAId, initiativeBId: c.initiativeBId, type: c.type, description: c.description, severity: c.severity },
      })
      created.push(conflict)
    }

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_CONFLICTS_DETECTED', module: 'strategy-orchestrator', entityType: 'AsoConflict', entityId: tenantId, newValues: { detected: created.length } as never },
    }).catch(() => null)

    return { success: true, data: { detected: created.length, conflicts: created } }
  })

  app.patch('/conflicts/:id/resolve', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { resolution: string }
    const conflict = await prisma.asoConflict.findFirst({ where: { id, tenantId } })
    if (!conflict) return reply.code(404).send({ success: false, error: 'Conflict not found' })
    const updated = await prisma.asoConflict.update({
      where: { id }, data: { resolved: true, resolvedAt: new Date(), resolution: body.resolution },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_CONFLICT_RESOLVED', module: 'strategy-orchestrator', entityType: 'AsoConflict', entityId: id, newValues: { resolution: body.resolution } as never },
    }).catch(() => null)
    return { success: true, data: updated }
  })

  // ── KPI Cascade ────────────────────────────────────────────────────────────

  app.post('/kpi-cascade', async (req) => {
    const body = req.body as { initiativeType: string; initiativeId?: string }
    const cascade = cascadeKPIs(body.initiativeType)

    if (body.initiativeId) {
      const { tenantId } = req as unknown as { tenantId: string }
      await prisma.asoInitiative.updateMany({
        where: { id: body.initiativeId, tenantId },
        data: { kpiCascade: cascade as never },
      })
    }

    return { success: true, data: cascade }
  })

  // ── Executive Calendar ─────────────────────────────────────────────────────

  app.get('/calendar', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const initiatives = await prisma.asoInitiative.findMany({
      where: { tenantId, status: { not: 'cancelled' } },
    })
    const calendar = buildExecutiveCalendar(initiatives as unknown as Initiative[])
    return { success: true, data: calendar }
  })

  // ── Strategy Review ────────────────────────────────────────────────────────

  app.get('/strategy-reviews', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const reviews = await prisma.asoStrategyReview.findMany({
      where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 10,
    })
    return { success: true, data: reviews }
  })

  app.post('/strategy-review', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [initiatives, goals] = await Promise.all([
      prisma.asoInitiative.findMany({ where: { tenantId } }),
      prisma.ageGoal.findMany({ where: { tenantId, status: 'active' } }),
    ])

    const review = generateStrategyReview(initiatives as unknown as Initiative[], goals as unknown as Goal[])

    // Monday of this week
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)

    const saved = await prisma.asoStrategyReview.create({
      data: {
        tenantId, userId, weekOf: monday,
        summary: review.summary,
        onTrackCount: review.onTrackCount,
        atRiskCount: review.atRiskCount,
        completedCount: review.completedCount,
        recommendations: review.recommendations as never,
        initiativeUpdates: review.initiativeUpdates as never,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASO_STRATEGY_REVIEW', module: 'strategy-orchestrator', entityType: 'AsoStrategyReview', entityId: saved.id, newValues: { onTrack: review.onTrackCount, atRisk: review.atRiskCount } as never },
    }).catch(() => null)

    return { success: true, data: { review: saved, details: review } }
  })

  // ── Decision Board ─────────────────────────────────────────────────────────

  app.get('/decision-board', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [initiatives, goals, alerts] = await Promise.all([
      prisma.asoInitiative.findMany({ where: { tenantId, status: { in: ['active', 'draft'] } } }),
      prisma.ageGoal.findMany({ where: { tenantId, status: 'active' } }),
      prisma.eieAlert.findMany({ where: { tenantId, dismissed: false }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ])

    const board = buildDecisionBoard(
      initiatives as unknown as Initiative[],
      goals as unknown as Goal[],
      alerts.map(a => ({ id: a.id, title: a.title, severity: a.severity })),
    )

    return { success: true, data: { entries: board, totalDecisions: board.length } }
  })
}
