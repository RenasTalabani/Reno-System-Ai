import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finBankAccountRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const accounts = await prisma.finBankAccount.findMany({
      where: { tenantId, deletedAt: null },
      include: { account: { select: { id: true, code: true, name: true } }, _count: { select: { transactions: true } } },
      orderBy: { name: 'asc' },
    })
    return reply.send({ success: true, data: accounts })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const bank = await prisma.finBankAccount.create({
      data: {
        tenantId, accountId: body.accountId, name: body.name,
        bankName: body.bankName, accountNumber: body.accountNumber,
        iban: body.iban, swift: body.swift,
        currency: body.currency ?? 'USD',
        openingBalance: body.openingBalance ?? 0,
        currentBalance: body.openingBalance ?? 0,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: bank })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const bank = await prisma.finBankAccount.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        account: true,
        transactions: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 20 },
      },
    })
    if (!bank) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: bank })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const data: any = { updatedBy: userId }
    for (const k of ['name','bankName','accountNumber','iban','swift','currentBalance']) if (body[k] !== undefined) data[k] = body[k]
    await prisma.finBankAccount.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  // POST /:id/transactions — Import bank statement lines
  app.post('/:id/transactions', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const transactions = body.transactions ?? []
    const created = []
    for (const t of transactions) {
      const tx = await prisma.finBankTransaction.create({
        data: {
          tenantId, bankAccountId: id,
          date: new Date(t.date),
          valueDate: t.valueDate ? new Date(t.valueDate) : undefined,
          description: t.description, reference: t.reference,
          amount: t.amount, runningBalance: t.runningBalance ?? 0,
          currency: t.currency ?? 'USD',
          createdBy: userId, updatedBy: userId,
        },
      })
      created.push(tx)
    }
    return reply.code(201).send({ success: true, data: created, count: created.length })
  })

  // GET /:id/transactions
  app.get('/:id/transactions', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { isReconciled, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, bankAccountId: id, deletedAt: null }
    if (isReconciled !== undefined) where.isReconciled = isReconciled === 'true'
    const [txs, total] = await Promise.all([
      prisma.finBankTransaction.findMany({ where, orderBy: { date: 'desc' }, take, skip }),
      prisma.finBankTransaction.count({ where }),
    ])
    return reply.send({ success: true, data: txs, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  // PATCH /transactions/:txId/reconcile — Mark transaction reconciled
  app.patch('/transactions/:txId/reconcile', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { txId } = req.params as any
    const body = req.body as any
    await prisma.finBankTransaction.updateMany({
      where: { id: txId, tenantId },
      data: { isReconciled: true, reconciledAt: new Date(), journalLineId: body.journalLineId, updatedBy: userId },
    })
    return reply.send({ success: true })
  })
}
