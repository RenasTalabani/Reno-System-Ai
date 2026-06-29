import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function csRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Accounts ───────────────────────────────────────────────────────────────

  app.get('/accounts', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.stage) where.stage = q.stage
    if (q.churnRisk) where.churnRisk = q.churnRisk
    if (q.csmId) where.csmId = q.csmId
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' }
    const accounts = await prisma.csAccount.findMany({ where, orderBy: [{ healthScore: 'asc' }, { renewalDate: 'asc' }], include: { _count: { select: { touchpoints: true, successPlans: true } } } })
    return reply.send(buildSuccessResponse(accounts))
  })

  app.get('/accounts/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const account = await prisma.csAccount.findFirst({ where: { id, tenantId }, include: { touchpoints: { orderBy: { occurredAt: 'desc' }, take: 10 }, successPlans: { orderBy: { createdAt: 'desc' } } } })
    if (!account) throw new RenoError(ErrorCode.NOT_FOUND, 'Account not found', 404)
    return reply.send(buildSuccessResponse(account))
  })

  app.post('/accounts', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const account = await prisma.csAccount.create({
      data: { tenantId, name: body.name, plan: body.plan, mrr: body.mrr ?? 0, arr: body.arr ?? body.mrr ? Number(body.mrr) * 12 : 0, healthScore: body.healthScore ?? 50, stage: body.stage ?? 'onboarding', csmId: body.csmId, renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined, churnRisk: body.churnRisk ?? 'low', npsScore: body.npsScore, contacts: body.contacts ?? [], tags: body.tags ?? [] },
    })
    return reply.status(201).send(buildSuccessResponse(account))
  })

  app.put('/accounts/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.csAccount.updateMany({ where: { id, tenantId }, data: { name: body.name, plan: body.plan, mrr: body.mrr, arr: body.arr, healthScore: body.healthScore, stage: body.stage, csmId: body.csmId, renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined, churnRisk: body.churnRisk, npsScore: body.npsScore } })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Account not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // PATCH /accounts/:id/health — update health score + churn risk
  app.patch('/accounts/:id/health', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const { healthScore, churnRisk } = request.body as any
    await prisma.csAccount.updateMany({ where: { id, tenantId }, data: { healthScore, churnRisk } })
    return reply.send(buildSuccessResponse({ healthScore, churnRisk }))
  })

  // ── Touchpoints ────────────────────────────────────────────────────────────

  app.post('/accounts/:id/touchpoints', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const tp = await prisma.csTouchpoint.create({
      data: { tenantId, accountId: id, createdBy: userId, type: body.type ?? 'call', subject: body.subject, notes: body.notes, outcome: body.outcome, sentiment: body.sentiment ?? 'neutral', occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined },
    })
    // Update health score based on sentiment
    const delta = body.sentiment === 'positive' ? 5 : body.sentiment === 'negative' ? -5 : 0
    if (delta) await prisma.csAccount.updateMany({ where: { id, tenantId }, data: { healthScore: { increment: delta } } })
    return reply.status(201).send(buildSuccessResponse(tp))
  })

  // ── Success Plans ──────────────────────────────────────────────────────────

  app.get('/accounts/:id/plans', async (request, reply) => {
    const { id } = request.params as any
    const plans = await prisma.csSuccessPlan.findMany({ where: { accountId: id }, orderBy: { createdAt: 'desc' } })
    return reply.send(buildSuccessResponse(plans))
  })

  app.post('/accounts/:id/plans', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const plan = await prisma.csSuccessPlan.create({ data: { tenantId, accountId: id, title: body.title, goals: body.goals ?? [], milestones: body.milestones ?? [], dueDate: body.dueDate ? new Date(body.dueDate) : undefined } })
    return reply.status(201).send(buildSuccessResponse(plan))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const [totalAccounts, byChurnRisk, byStage, totalMrr, atRisk] = await Promise.all([
      prisma.csAccount.count({ where: { tenantId } }),
      prisma.csAccount.groupBy({ by: ['churnRisk'], where: { tenantId }, _count: { churnRisk: true } }),
      prisma.csAccount.groupBy({ by: ['stage'], where: { tenantId }, _count: { stage: true } }),
      prisma.csAccount.aggregate({ where: { tenantId }, _sum: { mrr: true } }),
      prisma.csAccount.count({ where: { tenantId, healthScore: { lt: 30 } } }),
    ])
    const thirtyDays = new Date(Date.now() + 30 * 24 * 3600 * 1000)
    const renewalsDue = await prisma.csAccount.count({ where: { tenantId, renewalDate: { lte: thirtyDays } } })
    return reply.send(buildSuccessResponse({
      totalAccounts,
      totalMrr: totalMrr._sum.mrr ?? 0,
      atRisk,
      renewalsDue,
      byChurnRisk: Object.fromEntries(byChurnRisk.map(r => [r.churnRisk, r._count.churnRisk])),
      byStage: Object.fromEntries(byStage.map(s => [s.stage, s._count.stage])),
    }))
  })
}
