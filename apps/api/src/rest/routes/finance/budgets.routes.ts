import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finBudgetRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { fiscalYearId } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (fiscalYearId) where.fiscalYearId = fiscalYearId
    const budgets = await prisma.finBudget.findMany({ where, include: { _count: { select: { lines: true } } }, orderBy: { createdAt: 'desc' } })
    return reply.send({ success: true, data: budgets })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const budget = await prisma.finBudget.create({
      data: {
        tenantId, fiscalYearId: body.fiscalYearId, name: body.name,
        status: 'draft', description: body.description,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: budget })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const budget = await prisma.finBudget.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        lines: {
          where: { deletedAt: null },
          include: {
            account: { select: { id: true, code: true, name: true } },
            period: { select: { id: true, name: true, periodNumber: true } },
          },
          orderBy: [{ period: { periodNumber: 'asc' } }, { account: { code: 'asc' } }],
        },
      },
    })
    if (!budget) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: budget })
  })

  // PUT /:id/lines — Upsert budget lines (bulk)
  app.put('/:id/lines', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const lines = body.lines ?? []

    for (const l of lines) {
      const existing = await prisma.finBudgetLine.findFirst({
        where: { tenantId, budgetId: id, accountId: l.accountId, periodId: l.periodId, deletedAt: null },
      })
      if (existing) {
        await prisma.finBudgetLine.updateMany({ where: { id: existing.id }, data: { amount: l.amount, notes: l.notes, updatedBy: userId } })
      } else {
        await prisma.finBudgetLine.create({
          data: { tenantId, budgetId: id, accountId: l.accountId, costCenterId: l.costCenterId, periodId: l.periodId, amount: l.amount, notes: l.notes, createdBy: userId, updatedBy: userId },
        })
      }
    }
    return reply.send({ success: true })
  })

  app.patch('/:id/activate', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.finBudget.updateMany({ where: { id, tenantId }, data: { status: 'active', updatedBy: userId } })
    return reply.send({ success: true })
  })

  app.patch('/:id/close', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.finBudget.updateMany({ where: { id, tenantId }, data: { status: 'closed', updatedBy: userId } })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.finBudget.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
