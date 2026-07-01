// Phase 57 — AI Customer Success & Churn Prevention: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { PLAYBOOK_TEMPLATES, computeHealthScore, predictChurn, runPlaybookStep } from './ai-engine.js'

export async function cspRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [total, byRisk, byPlan, avgMrr, atRiskCustomers, recentRuns] = await Promise.all([
      prisma.cspCustomer.count({ where: { tenantId } }),
      prisma.cspCustomer.groupBy({ by: ['churnRisk'], where: { tenantId }, _count: true }),
      prisma.cspCustomer.groupBy({ by: ['plan'], where: { tenantId }, _count: true, _sum: { mrr: true } }),
      prisma.cspCustomer.aggregate({ where: { tenantId }, _avg: { mrr: true, healthScore: true } }),
      prisma.cspCustomer.findMany({ where: { tenantId, churnRisk: { in: ['high', 'critical'] } }, orderBy: { healthScore: 'asc' }, take: 5 }),
      prisma.cspPlaybookRun.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5, include: { playbook: true, customer: true } }),
    ])
    return {
      stats: {
        totalCustomers: total,
        atRiskCount: byRisk.filter(r => ['high', 'critical'].includes(r.churnRisk)).reduce((s, r) => s + r._count, 0),
        avgHealthScore: Math.round((avgMrr._avg.healthScore ?? 0) * 10) / 10,
        avgMrr: Math.round((avgMrr._avg.mrr ?? 0) * 100) / 100,
        riskDistribution: byRisk.reduce((a, r) => ({ ...a, [r.churnRisk]: r._count }), {} as Record<string, number>),
        planDistribution: byPlan.map(p => ({ plan: p.plan, count: p._count, mrr: p._sum.mrr ?? 0 })),
      },
      atRiskCustomers,
      recentRuns,
    }
  })

  // ── Customers ──────────────────────────────────────────────────────────────
  app.get('/customers', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { risk?: string; plan?: string; search?: string }
    const customers = await prisma.cspCustomer.findMany({
      where: {
        tenantId,
        ...(q.risk && { churnRisk: q.risk }),
        ...(q.plan && { plan: q.plan }),
        ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
      },
      orderBy: [{ churnRisk: 'desc' }, { healthScore: 'asc' }],
      include: { _count: { select: { healthScores: true, churnPredictions: true, playbookRuns: true } } },
    })
    return { customers }
  })

  app.post('/customers', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; email?: string; plan?: string; mrr?: number; ltv?: number; npsScore?: number; segment?: string; externalId?: string }
    const customer = await prisma.cspCustomer.create({
      data: { tenantId, name: body.name, email: body.email, plan: body.plan ?? 'starter', mrr: body.mrr ?? 0, ltv: body.ltv ?? 0, npsScore: body.npsScore, segment: body.segment ?? 'standard', externalId: body.externalId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'csp', entityType: 'customer', entityId: customer.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(customer)
  })

  app.get('/customers/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.cspCustomer.findUniqueOrThrow({
      where: { id },
      include: {
        healthScores: { orderBy: { scoredAt: 'desc' }, take: 10 },
        churnPredictions: { orderBy: { predictedAt: 'desc' }, take: 5 },
        playbookRuns: { orderBy: { createdAt: 'desc' }, take: 5, include: { playbook: true } },
      },
    })
  })

  app.patch('/customers/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    return prisma.cspCustomer.update({ where: { id }, data: body as never })
  })

  app.delete('/customers/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.cspCustomer.delete({ where: { id } })
    return { success: true }
  })

  // ── Health Score ───────────────────────────────────────────────────────────
  app.post('/customers/:id/score', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const customer = await prisma.cspCustomer.findUniqueOrThrow({ where: { id } })

    const result = computeHealthScore(customer)

    const healthScore = await prisma.cspHealthScore.create({
      data: {
        tenantId, customerId: id, overallScore: result.overallScore,
        engagementScore: result.engagementScore, adoptionScore: result.adoptionScore,
        supportScore: result.supportScore, paymentScore: result.paymentScore,
        npsScore: result.npsScoreFactor,
        signals: result.signals as never, aiInsights: result.aiInsights as never,
      },
    })

    await prisma.cspCustomer.update({ where: { id }, data: { healthScore: result.overallScore, churnRisk: result.churnRisk } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'score', module: 'csp', entityType: 'customer', entityId: id, newValues: { healthScore: result.overallScore, churnRisk: result.churnRisk } as never } }).catch(() => null)

    return { healthScore, result }
  })

  // Bulk score all customers
  app.post('/health/score-all', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const customers = await prisma.cspCustomer.findMany({ where: { tenantId } })
    const scored = await Promise.all(customers.map(async c => {
      const result = computeHealthScore(c)
      await prisma.cspHealthScore.create({ data: { tenantId, customerId: c.id, overallScore: result.overallScore, engagementScore: result.engagementScore, adoptionScore: result.adoptionScore, supportScore: result.supportScore, paymentScore: result.paymentScore, npsScore: result.npsScoreFactor, signals: result.signals as never, aiInsights: result.aiInsights as never } })
      await prisma.cspCustomer.update({ where: { id: c.id }, data: { healthScore: result.overallScore, churnRisk: result.churnRisk } })
      return { customerId: c.id, healthScore: result.overallScore, churnRisk: result.churnRisk }
    }))
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'score_all', module: 'csp', entityType: 'platform', entityId: tenantId, newValues: { scored: scored.length } as never } }).catch(() => null)
    return { scored: scored.length, results: scored }
  })

  // ── Churn Prediction ───────────────────────────────────────────────────────
  app.post('/customers/:id/predict-churn', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const customer = await prisma.cspCustomer.findUniqueOrThrow({ where: { id } })
    const daysSinceActivity = customer.lastActivityAt
      ? Math.floor((Date.now() - new Date(customer.lastActivityAt).getTime()) / 86400000) : 60
    const result = predictChurn(customer.healthScore, daysSinceActivity, customer.npsScore ?? undefined)

    const prediction = await prisma.cspChurnPrediction.create({
      data: { tenantId, customerId: id, churnProbability: result.probability, riskLevel: result.riskLevel, factors: result.factors as never, recommendation: result.recommendation },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'predict_churn', module: 'csp', entityType: 'customer', entityId: id, newValues: { probability: result.probability, risk: result.riskLevel } as never } }).catch(() => null)
    return { prediction, result }
  })

  app.get('/churn-predictions', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const predictions = await prisma.cspChurnPrediction.findMany({
      where: { tenantId }, orderBy: { churnProbability: 'desc' }, take: 50,
      include: { customer: true },
    })
    return { predictions }
  })

  // ── Playbooks ──────────────────────────────────────────────────────────────
  app.get('/playbook-templates', async () => ({ templates: PLAYBOOK_TEMPLATES }))

  app.post('/playbook-templates/install', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const created: unknown[] = []
    for (const t of PLAYBOOK_TEMPLATES) {
      const existing = await prisma.cspPlaybook.findUnique({ where: { tenantId_slug: { tenantId, slug: t.slug } } })
      if (!existing) {
        const p = await prisma.cspPlaybook.create({ data: { tenantId, name: t.name, slug: t.slug, description: t.description, trigger: t.trigger, steps: t.steps as never } })
        created.push(p)
      }
    }
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'install_templates', module: 'csp', entityType: 'playbook', entityId: tenantId, newValues: { count: created.length } as never } }).catch(() => null)
    return reply.code(201).send({ installed: created.length, playbooks: created })
  })

  app.get('/playbooks', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const playbooks = await prisma.cspPlaybook.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { runs: true } } } })
    return { playbooks }
  })

  app.post('/playbooks', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; description?: string; trigger?: string; steps?: unknown[] }
    const playbook = await prisma.cspPlaybook.create({ data: { tenantId, name: body.name, slug: body.slug, description: body.description, trigger: body.trigger ?? 'manual', steps: (body.steps ?? []) as never } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'csp', entityType: 'playbook', entityId: playbook.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(playbook)
  })

  app.post('/playbooks/:id/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { customerId: string }
    const playbook = await prisma.cspPlaybook.findUniqueOrThrow({ where: { id } })
    const steps = playbook.steps as { order: number; type: string; title: string; config: Record<string, unknown> }[]

    const stepResults = steps.map(s => ({
      order: s.order, type: s.type, title: s.title,
      ...runPlaybookStep(s.type, s.config),
    }))

    const allPassed = stepResults.every(s => s.success)
    const run = await prisma.cspPlaybookRun.create({
      data: {
        tenantId, playbookId: id, customerId: body.customerId,
        status: allPassed ? 'completed' : 'failed',
        stepsRun: stepResults.length, stepResults: stepResults as never,
        outcome: allPassed ? 'All steps completed successfully' : 'Some steps failed',
        completedAt: new Date(),
      },
    })

    const newCount = playbook.runCount + 1
    const passedRuns = Math.round(playbook.successRate * playbook.runCount / 100) + (allPassed ? 1 : 0)
    await prisma.cspPlaybook.update({ where: { id }, data: { runCount: newCount, successRate: Math.round((passedRuns / newCount) * 100) } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'run_playbook', module: 'csp', entityType: 'playbook', entityId: id, newValues: { customerId: body.customerId, success: allPassed } as never } }).catch(() => null)
    return { run, stepResults }
  })

  app.delete('/playbooks/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.cspPlaybook.delete({ where: { id } })
    return { success: true }
  })

  // ── Playbook Runs ──────────────────────────────────────────────────────────
  app.get('/playbook-runs', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const runs = await prisma.cspPlaybookRun.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50,
      include: { playbook: true, customer: true },
    })
    return { runs }
  })
}
