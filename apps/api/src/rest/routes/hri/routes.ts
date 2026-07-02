// Phase 59 — AI HR Intelligence & Workforce Analytics: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { profileEmployee, evaluatePerformance, computeWorkforceAnalytics, generateSuccessionPlan, generateWorkforceInsights } from './ai-engine.js'

export async function hriRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [employees, recentPerformances, successionPlans, insights] = await Promise.all([
      prisma.hriEmployee.findMany({ where: { tenantId } }),
      prisma.hriPerformance.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.hriSuccessionPlan.findMany({ where: { tenantId } }),
      prisma.hriWorkforceInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 5 }),
    ])
    const analytics = computeWorkforceAnalytics(employees)
    return { analytics, recentPerformances, successionPlans, insights, employeeCount: employees.length }
  })

  // ── Employees ──────────────────────────────────────────────────────────────
  app.get('/employees', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { dept?: string; level?: string; risk?: string }
    const employees = await prisma.hriEmployee.findMany({
      where: { tenantId, ...(q.dept && { department: q.dept }), ...(q.level && { level: q.level }), ...(q.risk && { retentionRisk: q.risk }) },
      orderBy: { fullName: 'asc' },
    })
    return { employees }
  })

  app.post('/employees', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { fullName: string; email?: string; department?: string; role?: string; level?: string; hireDate?: string; salary?: number; location?: string; employeeId?: string }
    const emp = await prisma.hriEmployee.create({
      data: { tenantId, fullName: body.fullName, email: body.email, department: body.department, role: body.role, level: body.level ?? 'mid', hireDate: body.hireDate ? new Date(body.hireDate) : null, salary: body.salary, location: body.location, employeeId: body.employeeId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'hri', entityType: 'employee', entityId: emp.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(emp)
  })

  app.get('/employees/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.hriEmployee.findUniqueOrThrow({ where: { id }, include: { performances: { orderBy: { createdAt: 'desc' } } } })
  })

  app.patch('/employees/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.hriEmployee.update({ where: { id }, data: req.body as never })
  })

  app.delete('/employees/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.hriEmployee.delete({ where: { id } })
    return { success: true }
  })

  // AI Profile
  app.post('/employees/:id/profile', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const emp = await prisma.hriEmployee.findUniqueOrThrow({ where: { id } })
    const result = profileEmployee(emp)

    await prisma.hriEmployee.update({
      where: { id },
      data: { aiProfileScore: result.aiProfileScore, retentionRisk: result.retentionRisk, potentialLevel: result.potentialLevel, aiInsights: result.insights as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ai_profile', module: 'hri', entityType: 'employee', entityId: id, newValues: { retentionRisk: result.retentionRisk, potentialLevel: result.potentialLevel } as never } }).catch(() => null)
    return { result, employee: { ...emp, ...result } }
  })

  // Bulk profile all
  app.post('/employees/profile-all', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const employees = await prisma.hriEmployee.findMany({ where: { tenantId } })
    let profiled = 0
    for (const emp of employees) {
      const result = profileEmployee(emp)
      await prisma.hriEmployee.update({ where: { id: emp.id }, data: { aiProfileScore: result.aiProfileScore, retentionRisk: result.retentionRisk, potentialLevel: result.potentialLevel, aiInsights: result.insights as never } })
      profiled++
    }
    return { profiled }
  })

  // ── Performance ────────────────────────────────────────────────────────────
  app.get('/performance', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const performances = await prisma.hriPerformance.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { performances }
  })

  app.post('/performance', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { employeeId: string; period: string; performanceScore?: number; goalsScore?: number; skillsScore?: number; cultureScore?: number; managerNotes?: string }
    const scores = { performanceScore: body.performanceScore ?? 70, goalsScore: body.goalsScore ?? 70, skillsScore: body.skillsScore ?? 70, cultureScore: body.cultureScore ?? 70 }
    const evaluation = evaluatePerformance(scores)

    const perf = await prisma.hriPerformance.upsert({
      where: { tenantId_employeeId_period: { tenantId, employeeId: body.employeeId, period: body.period } },
      create: { tenantId, employeeId: body.employeeId, period: body.period, ...scores, overallRating: evaluation.overallRating, aiPrediction: evaluation.aiPrediction, managerNotes: body.managerNotes },
      update: { ...scores, overallRating: evaluation.overallRating, aiPrediction: evaluation.aiPrediction, managerNotes: body.managerNotes },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'hri', entityType: 'performance', entityId: perf.id, newValues: { period: body.period, rating: evaluation.overallRating } as never } }).catch(() => null)
    return reply.code(201).send({ performance: perf, evaluation })
  })

  // ── Succession Planning ────────────────────────────────────────────────────
  app.get('/succession', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return { plans: await prisma.hriSuccessionPlan.findMany({ where: { tenantId }, orderBy: { criticality: 'desc' } }) }
  })

  app.post('/succession', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { roleTitle: string; department?: string; criticality?: string; candidateIds?: string[] }
    const candidates = body.candidateIds?.length
      ? await prisma.hriEmployee.findMany({ where: { id: { in: body.candidateIds }, tenantId } })
      : []
    const result = generateSuccessionPlan({ roleTitle: body.roleTitle, department: body.department, criticality: body.criticality }, candidates)

    const plan = await prisma.hriSuccessionPlan.create({
      data: { tenantId, roleTitle: body.roleTitle, department: body.department, criticality: body.criticality ?? 'medium', readinessGap: result.readinessGap, candidateIds: (body.candidateIds ?? []) as never, aiRecommended: result.aiRecommended as never, timeline: result.timeline, aiSummary: result.aiSummary },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'hri', entityType: 'succession', entityId: plan.id, newValues: { roleTitle: body.roleTitle } as never } }).catch(() => null)
    return reply.code(201).send({ plan, result })
  })

  app.delete('/succession/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.hriSuccessionPlan.delete({ where: { id } })
    return { success: true }
  })

  // ── Workforce Insights ─────────────────────────────────────────────────────
  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return { insights: await prisma.hriWorkforceInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' } }) }
  })

  app.post('/insights/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const employees = await prisma.hriEmployee.findMany({ where: { tenantId } })
    const analytics = computeWorkforceAnalytics(employees)
    const insightDefs = generateWorkforceInsights(analytics)

    const created = await Promise.all(insightDefs.map(ins =>
      prisma.hriWorkforceInsight.create({
        data: { tenantId, type: ins.type, title: ins.title, summary: ins.summary, data: analytics as never, severity: ins.severity, actionItems: ins.actionItems as never },
      })
    ))
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'generate_insights', module: 'hri', entityType: 'workforce_insight', entityId: tenantId, newValues: { count: created.length } as never } }).catch(() => null)
    return reply.code(201).send({ insights: created, analytics })
  })

  // ── Analytics ──────────────────────────────────────────────────────────────
  app.get('/analytics', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const employees = await prisma.hriEmployee.findMany({ where: { tenantId } })
    return { analytics: computeWorkforceAnalytics(employees), employeeCount: employees.length }
  })
}
