import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  analyseProgress, estimateSuccessProb, detectRisks,
  generateMentorInsight, generateRoadmap, assessDecisionImpact,
  buildGoalTree, computeTrend,
} from './ai-engine.js'
import type { GoalWithKpis } from './ai-engine.js'

export async function goalsEngineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [total, active, completed, atRisk, kpiCount, milestoneCount] = await Promise.all([
      prisma.ageGoal.count({ where: { tenantId, userId } }),
      prisma.ageGoal.count({ where: { tenantId, userId, status: 'active' } }),
      prisma.ageGoal.count({ where: { tenantId, userId, status: 'completed' } }),
      prisma.ageGoal.count({ where: { tenantId, userId, status: 'at_risk' } }),
      prisma.ageKpi.count({ where: { tenantId } }),
      prisma.ageMilestone.count({ where: { tenantId, status: 'pending' } }),
    ])
    const avgProgress = await prisma.ageGoal.aggregate({
      where: { tenantId, userId, status: 'active' },
      _avg: { progress: true },
    })
    return {
      success: true,
      data: {
        goals: { total, active, completed, atRisk },
        kpis: kpiCount,
        pendingMilestones: milestoneCount,
        avgProgress: Math.round((avgProgress._avg.progress ?? 0) * 100),
      },
    }
  })

  // ── Goals CRUD ────────────────────────────────────────────────────────────

  app.get('/goals', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const q = req.query as Record<string, string>
    const goals = await prisma.ageGoal.findMany({
      where: {
        tenantId, userId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.type ? { type: q.type } : {}),
        ...(q.category ? { category: q.category } : {}),
        ...(q.tree === 'true' ? { parentId: null } : {}),
      },
      include: { kpis: true, milestones: { orderBy: { dueDate: 'asc' } }, _count: { select: { children: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    })

    // Annotate with AI analysis
    const annotated = goals.map(g => {
      const gw = g as unknown as GoalWithKpis
      return {
        ...g,
        analysis: analyseProgress(gw),
        successProb: Math.round((estimateSuccessProb(gw)) * 100),
        riskCount: detectRisks(gw).length,
      }
    })

    return { success: true, data: annotated }
  })

  app.get('/goals/tree', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const goals = await prisma.ageGoal.findMany({
      where: { tenantId, userId, status: { not: 'cancelled' } },
      include: { kpis: true, milestones: true },
      orderBy: { createdAt: 'asc' },
    })
    const tree = buildGoalTree(goals as unknown as GoalWithKpis[])
    return { success: true, data: tree }
  })

  app.get('/goals/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const goal = await prisma.ageGoal.findFirst({
      where: { id, tenantId },
      include: { kpis: true, milestones: { orderBy: { dueDate: 'asc' } }, children: { include: { kpis: true } } },
    })
    if (!goal) return reply.code(404).send({ success: false, error: 'Goal not found' })
    const gw = goal as unknown as GoalWithKpis
    const allGoals = await prisma.ageGoal.findMany({ where: { tenantId, status: 'active' }, include: { kpis: true, milestones: true } })

    return {
      success: true,
      data: {
        ...goal,
        analysis: analyseProgress(gw),
        successProb: estimateSuccessProb(gw),
        risks: detectRisks(gw),
        mentorInsight: generateMentorInsight(gw, allGoals as unknown as GoalWithKpis[]),
      },
    }
  })

  app.post('/goals', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      title: string; description?: string; type: string; category: string
      targetDate?: string; priority?: string; parentId?: string
      kpis?: { name: string; unit: string; baseline: number; target: number; frequency?: string }[]
      milestones?: { title: string; dueDate?: string }[]
    }

    const goal = await prisma.ageGoal.create({
      data: {
        tenantId, userId,
        title: body.title,
        description: body.description ?? null,
        type: body.type,
        category: body.category,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        priority: body.priority ?? 'medium',
        parentId: body.parentId ?? null,
        status: 'active',
      },
    })

    if (body.kpis?.length) {
      await prisma.ageKpi.createMany({
        data: body.kpis.map(k => ({ tenantId, goalId: goal.id, ...k })),
      })
    }

    if (body.milestones?.length) {
      await prisma.ageMilestone.createMany({
        data: body.milestones.map(m => ({
          tenantId, goalId: goal.id,
          title: m.title,
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
        })),
      })
    }

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AGE_GOAL_CREATED', module: 'goals-engine',
        entityType: 'AgeGoal', entityId: goal.id,
        newValues: { title: body.title, type: body.type, category: body.category } as never,
      },
    }).catch(() => null)

    const full = await prisma.ageGoal.findUnique({ where: { id: goal.id }, include: { kpis: true, milestones: true } })
    return { success: true, data: full }
  })

  app.put('/goals/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const goal = await prisma.ageGoal.findFirst({ where: { id, tenantId } })
    if (!goal) return reply.code(404).send({ success: false, error: 'Goal not found' })

    const updateData: Record<string, unknown> = {}
    const allowed = ['title', 'description', 'status', 'progress', 'priority', 'targetDate', 'aiInsight']
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }
    if (body.targetDate) updateData.targetDate = new Date(body.targetDate as string)

    // Recompute success probability
    const updated = await prisma.ageGoal.update({
      where: { id },
      data: updateData,
      include: { kpis: true, milestones: true },
    })
    const sp = estimateSuccessProb(updated as unknown as GoalWithKpis)
    const final = await prisma.ageGoal.update({ where: { id }, data: { successProb: sp } })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AGE_GOAL_UPDATED', module: 'goals-engine',
        entityType: 'AgeGoal', entityId: id, newValues: updateData as never,
      },
    }).catch(() => null)

    return { success: true, data: final }
  })

  app.delete('/goals/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const goal = await prisma.ageGoal.findFirst({ where: { id, tenantId } })
    if (!goal) return reply.code(404).send({ success: false, error: 'Goal not found' })
    await prisma.ageGoal.update({ where: { id }, data: { status: 'cancelled' } })
    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AGE_GOAL_CANCELLED', module: 'goals-engine',
        entityType: 'AgeGoal', entityId: id, newValues: {} as never,
      },
    }).catch(() => null)
    return { success: true, data: { cancelled: true } }
  })

  // ── KPIs ──────────────────────────────────────────────────────────────────

  app.get('/goals/:id/kpis', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const kpis = await prisma.ageKpi.findMany({ where: { goalId: id, tenantId }, orderBy: { createdAt: 'asc' } })
    return { success: true, data: kpis }
  })

  app.post('/goals/:id/kpis', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { name: string; unit: string; baseline: number; target: number; frequency?: string }
    const kpi = await prisma.ageKpi.create({ data: { tenantId, goalId: id, ...body } })
    return { success: true, data: kpi }
  })

  // Update KPI current value (used to record progress)
  app.patch('/goals/:id/kpis/:kpiId', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { kpiId } = req.params as { id: string; kpiId: string }
    const body = req.body as { current: number }
    const kpi = await prisma.ageKpi.findFirst({ where: { id: kpiId, tenantId } })
    if (!kpi) return reply.code(404).send({ success: false, error: 'KPI not found' })
    const trend = computeTrend(kpi.current, body.current, kpi.target)
    const updated = await prisma.ageKpi.update({ where: { id: kpiId }, data: { current: body.current, trend } })
    return { success: true, data: updated }
  })

  // ── Milestones ─────────────────────────────────────────────────────────────

  app.get('/goals/:id/milestones', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const ms = await prisma.ageMilestone.findMany({ where: { goalId: id, tenantId }, orderBy: { dueDate: 'asc' } })
    return { success: true, data: ms }
  })

  app.post('/goals/:id/milestones', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { title: string; dueDate?: string }
    const ms = await prisma.ageMilestone.create({
      data: { tenantId, goalId: id, title: body.title, dueDate: body.dueDate ? new Date(body.dueDate) : null },
    })
    return { success: true, data: ms }
  })

  app.patch('/goals/:id/milestones/:msId', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { msId } = req.params as { id: string; msId: string }
    const body = req.body as { status: string }
    const ms = await prisma.ageMilestone.findFirst({ where: { id: msId, tenantId } })
    if (!ms) return reply.code(404).send({ success: false, error: 'Milestone not found' })
    const updated = await prisma.ageMilestone.update({
      where: { id: msId },
      data: { status: body.status, completedAt: body.status === 'completed' ? new Date() : null },
    })
    return { success: true, data: updated }
  })

  // ── AI Analysis endpoints ─────────────────────────────────────────────────

  app.get('/goals/:id/analysis', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const goal = await prisma.ageGoal.findFirst({
      where: { id, tenantId }, include: { kpis: true, milestones: true, children: { include: { kpis: true } } },
    })
    if (!goal) return reply.code(404).send({ success: false, error: 'Goal not found' })
    const allGoals = await prisma.ageGoal.findMany({ where: { tenantId, status: 'active' }, include: { kpis: true, milestones: true } })
    const gw = goal as unknown as GoalWithKpis

    return {
      success: true,
      data: {
        progress: analyseProgress(gw),
        successProbability: estimateSuccessProb(gw),
        risks: detectRisks(gw),
        mentorInsight: generateMentorInsight(gw, allGoals as unknown as GoalWithKpis[]),
      },
    }
  })

  // ── Roadmap ────────────────────────────────────────────────────────────────

  app.post('/roadmap', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { horizon: '30d' | '90d' | '1y' | '5y' }
    const goals = await prisma.ageGoal.findMany({
      where: { tenantId, userId, status: { in: ['active', 'at_risk'] } },
      include: { kpis: true, milestones: true },
      orderBy: { priority: 'asc' },
    })

    const roadmap = generateRoadmap(goals as unknown as GoalWithKpis[], body.horizon ?? '90d')

    const saved = await prisma.ageRoadmap.create({
      data: { tenantId, userId, title: roadmap.title, horizon: body.horizon ?? '90d', plan: roadmap as never },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AGE_ROADMAP_GENERATED', module: 'goals-engine',
        entityType: 'AgeRoadmap', entityId: saved.id,
        newValues: { horizon: body.horizon, goals: goals.length } as never,
      },
    }).catch(() => null)

    return { success: true, data: { ...saved, roadmap } }
  })

  app.get('/roadmaps', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const roadmaps = await prisma.ageRoadmap.findMany({
      where: { tenantId, userId },
      orderBy: { generatedAt: 'desc' },
      take: 20,
    })
    return { success: true, data: roadmaps }
  })

  // ── Decision Impact ────────────────────────────────────────────────────────

  app.post('/decision-impact', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { decision: string }
    const goals = await prisma.ageGoal.findMany({
      where: { tenantId, userId, status: 'active' },
      include: { kpis: true, milestones: true },
    })
    const impact = assessDecisionImpact(body.decision, goals as unknown as GoalWithKpis[])

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AGE_DECISION_ASSESSED', module: 'goals-engine',
        entityType: 'AgeGoal', entityId: 'impact-check',
        newValues: { decision: body.decision, risk: impact.overallRisk } as never,
      },
    }).catch(() => null)

    return { success: true, data: impact }
  })

  // ── AI Mentor ─────────────────────────────────────────────────────────────

  app.get('/mentor', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const goals = await prisma.ageGoal.findMany({
      where: { tenantId, userId, status: 'active' },
      include: { kpis: true, milestones: true },
      orderBy: { priority: 'asc' },
      take: 10,
    })

    const insights = goals.map(g => ({
      goalId: g.id,
      goalTitle: g.title,
      insight: generateMentorInsight(g as unknown as GoalWithKpis, goals as unknown as GoalWithKpis[]),
      risks: detectRisks(g as unknown as GoalWithKpis).slice(0, 2),
      successProb: Math.round(estimateSuccessProb(g as unknown as GoalWithKpis) * 100),
    }))

    const strategicAdvice = buildStrategicAdvice(goals as unknown as GoalWithKpis[])

    return { success: true, data: { insights, strategicAdvice, totalActiveGoals: goals.length } }
  })
}

function buildStrategicAdvice(goals: GoalWithKpis[]): string[] {
  const advice: string[] = []
  const atRisk = goals.filter(g => (estimateSuccessProb(g)) < 0.5)
  const overwhelmed = goals.length > 5
  const noDeadlines = goals.filter(g => !g.targetDate)

  if (overwhelmed) {
    advice.push(`You have ${goals.length} active goals. Research shows focus on 3-5 goals maximises success rate. Consider pausing lower-priority goals.`)
  }
  if (atRisk.length > 0) {
    advice.push(`${atRisk.length} goal${atRisk.length > 1 ? 's have' : ' has'} below 50% success probability. Address these before starting new initiatives.`)
  }
  if (noDeadlines.length > 0) {
    advice.push(`${noDeadlines.length} goal${noDeadlines.length > 1 ? 's have' : ' has'} no target date. Goals without deadlines have 40% lower completion rates. Set deadlines now.`)
  }
  if (advice.length === 0) {
    advice.push('Your goal portfolio looks healthy. Keep executing consistently and review weekly progress.')
  }
  return advice
}
