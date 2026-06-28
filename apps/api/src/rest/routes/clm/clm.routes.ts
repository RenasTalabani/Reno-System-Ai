import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

const STATUS_FLOW: Record<string, string[]> = {
  draft: ['review', 'cancelled'],
  review: ['approved', 'rejected', 'draft'],
  approved: ['active', 'cancelled'],
  active: ['expired', 'terminated'],
  rejected: ['draft'],
}

export async function clmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Contracts ──────────────────────────────────────────────────────────────

  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    if (q.type) where.type = q.type
    if (q.search) where.OR = [{ title: { contains: q.search, mode: 'insensitive' } }, { counterparty: { contains: q.search, mode: 'insensitive' } }]
    const contracts = await prisma.clmContract.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { clauses: true, approvals: true } } },
    })
    return reply.send(buildSuccessResponse(contracts))
  })

  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const contract = await prisma.clmContract.findFirst({ where: { id, tenantId }, include: { clauses: { orderBy: { orderIndex: 'asc' } }, approvals: { orderBy: { createdAt: 'asc' } } } })
    if (!contract) throw new RenoError(ErrorCode.NOT_FOUND, 'Contract not found', 404)
    return reply.send(buildSuccessResponse(contract))
  })

  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const contract = await prisma.clmContract.create({
      data: { tenantId, createdBy: userId, title: body.title, type: body.type ?? 'service', counterparty: body.counterparty, value: body.value, currency: body.currency ?? 'USD', startDate: body.startDate ? new Date(body.startDate) : undefined, endDate: body.endDate ? new Date(body.endDate) : undefined, autoRenew: body.autoRenew ?? false, noticeDays: body.noticeDays ?? 30, body: body.body, summary: body.summary, tags: body.tags ?? [] },
    })
    return reply.status(201).send(buildSuccessResponse(contract))
  })

  app.put('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const contract = await prisma.clmContract.findFirst({ where: { id, tenantId } })
    if (!contract) throw new RenoError(ErrorCode.NOT_FOUND, 'Contract not found', 404)
    if (!['draft', 'review'].includes(contract.status)) throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Contract cannot be edited in current status', 400)
    const updated = await prisma.clmContract.update({ where: { id }, data: { ...body, startDate: body.startDate ? new Date(body.startDate) : undefined, endDate: body.endDate ? new Date(body.endDate) : undefined } })
    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /clm/:id/status — advance status through workflow
  app.patch('/:id/status', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { status } = request.body as any
    const contract = await prisma.clmContract.findFirst({ where: { id, tenantId } })
    if (!contract) throw new RenoError(ErrorCode.NOT_FOUND, 'Contract not found', 404)
    const allowed = STATUS_FLOW[contract.status] ?? []
    if (!allowed.includes(status)) throw new RenoError(ErrorCode.VALIDATION_ERROR, `Cannot transition from ${contract.status} to ${status}`, 400)
    const data: any = { status }
    if (status === 'active') { data.signedAt = new Date(); data.signedBy = userId }
    await prisma.clmContract.update({ where: { id }, data })
    return reply.send(buildSuccessResponse({ status }))
  })

  // ── Clauses ────────────────────────────────────────────────────────────────

  app.post('/:id/clauses', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const maxOrder = await prisma.clmClause.count({ where: { contractId: id } })
    const clause = await prisma.clmClause.create({ data: { tenantId, contractId: id, title: body.title, body: body.body, clauseType: body.clauseType ?? 'standard', orderIndex: body.orderIndex ?? maxOrder } })
    return reply.status(201).send(buildSuccessResponse(clause))
  })

  app.delete('/:id/clauses/:clauseId', async (request, reply) => {
    const { id, clauseId } = request.params as any
    await prisma.clmClause.deleteMany({ where: { id: clauseId, contractId: id } })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // ── Approvals ──────────────────────────────────────────────────────────────

  app.post('/:id/approvals', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const { approverId } = request.body as any
    const approval = await prisma.clmApproval.create({ data: { tenantId, contractId: id, approverId } })
    return reply.status(201).send(buildSuccessResponse(approval))
  })

  app.patch('/approvals/:approvalId', async (request, reply) => {
    const { approvalId } = request.params as any
    const { status, comments } = request.body as any
    const approval = await prisma.clmApproval.update({ where: { id: approvalId }, data: { status, comments, decidedAt: new Date() } })
    return reply.send(buildSuccessResponse(approval))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 86400000)
    const [byStatus, expiringCount, totalValue, pendingApprovals] = await Promise.all([
      prisma.clmContract.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
      prisma.clmContract.count({ where: { tenantId, status: 'active', endDate: { lte: in30, gte: today } } }),
      prisma.clmContract.aggregate({ where: { tenantId, status: 'active' }, _sum: { value: true } }),
      prisma.clmApproval.count({ where: { tenantId, status: 'pending' } }),
    ])
    return reply.send(buildSuccessResponse({
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.status])),
      expiringIn30Days: expiringCount,
      activeContractValue: totalValue._sum.value ?? 0,
      pendingApprovals,
    }))
  })
}
