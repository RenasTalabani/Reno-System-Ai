import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finJournalEntryRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, type, periodId, search, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (type) where.type = type
    if (periodId) where.periodId = periodId
    if (search) where.OR = [{ number: { contains: search, mode: 'insensitive' } }, { reference: { contains: search, mode: 'insensitive' } }]
    const [entries, total] = await Promise.all([
      prisma.finJournalEntry.findMany({ where, include: { _count: { select: { lines: true } } }, orderBy: { date: 'desc' }, take, skip }),
      prisma.finJournalEntry.count({ where }),
    ])
    return reply.send({ success: true, data: entries, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const lines = body.lines ?? []

    // Validate: debits must equal credits
    const totalDebit = lines.reduce((s: number, l: any) => s + Number(l.debit ?? 0), 0)
    const totalCredit = lines.reduce((s: number, l: any) => s + Number(l.credit ?? 0), 0)
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return reply.code(400).send({ success: false, error: `Journal entry is not balanced. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}` })
    }

    const count = await prisma.finJournalEntry.count({ where: { tenantId } })
    const number = `JE-${String(count + 1).padStart(5, '0')}`

    // Resolve period from date if not provided
    let periodId = body.periodId
    if (!periodId && body.date) {
      const dt = new Date(body.date)
      const period = await prisma.finPeriod.findFirst({
        where: { tenantId, startDate: { lte: dt }, endDate: { gte: dt }, status: 'open' },
      })
      periodId = period?.id
    }

    const entry = await prisma.finJournalEntry.create({
      data: {
        tenantId, number, type: body.type ?? 'general',
        status: 'draft', date: new Date(body.date),
        periodId, currency: body.currency ?? 'USD',
        exchangeRate: body.exchangeRate ?? 1,
        reference: body.reference, description: body.description, notes: body.notes,
        sourceType: body.sourceType, sourceId: body.sourceId,
        createdBy: userId, updatedBy: userId,
      },
    })

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      const rate = Number(l.exchangeRate ?? body.exchangeRate ?? 1)
      await prisma.finJournalLine.create({
        data: {
          tenantId, journalId: entry.id, accountId: l.accountId,
          costCenterId: l.costCenterId, description: l.description,
          debit: l.debit ?? 0, credit: l.credit ?? 0,
          currency: l.currency ?? body.currency ?? 'USD',
          exchangeRate: rate,
          debitBase: Number(l.debit ?? 0) * rate,
          creditBase: Number(l.credit ?? 0) * rate,
          taxId: l.taxId, taxAmount: l.taxAmount ?? 0,
          sortOrder: i, sourceType: l.sourceType, sourceId: l.sourceId,
          createdBy: userId, updatedBy: userId,
        },
      })
    }

    await logAudit(tenantId, userId, 'JOURNAL_CREATED', 'fin_journal_entries', entry.id, { number })
    const full = await prisma.finJournalEntry.findUnique({ where: { id: entry.id }, include: { lines: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } } })
    return reply.code(201).send({ success: true, data: full })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const entry = await prisma.finJournalEntry.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        lines: {
          where: { deletedAt: null },
          include: { account: { select: { id: true, code: true, name: true } }, costCenter: { select: { id: true, name: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        period: { select: { id: true, name: true, status: true } },
      },
    })
    if (!entry) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: entry })
  })

  // POST - post a journal entry (draft → posted, immutable after this)
  app.patch('/:id/post', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const entry = await prisma.finJournalEntry.findFirst({ where: { id, tenantId, status: 'draft', deletedAt: null } })
    if (!entry) return reply.code(404).send({ success: false, error: 'Not found or not in draft status' })

    // Verify period is open
    if (entry.periodId) {
      const period = await prisma.finPeriod.findFirst({ where: { id: entry.periodId } })
      if (period && period.status !== 'open') {
        return reply.code(400).send({ success: false, error: `Cannot post to ${period.status} period: ${period.name}` })
      }
    }

    await prisma.finJournalEntry.updateMany({ where: { id, tenantId }, data: { status: 'posted', postedBy: userId, postedAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'JOURNAL_POSTED', 'fin_journal_entries', id, { number: entry.number })
    return reply.send({ success: true })
  })

  // PATCH - void a posted journal entry (creates a reversing entry)
  app.patch('/:id/void', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any
    const entry = await prisma.finJournalEntry.findFirst({
      where: { id, tenantId, status: 'posted', deletedAt: null },
      include: { lines: { where: { deletedAt: null } } },
    })
    if (!entry) return reply.code(404).send({ success: false, error: 'Not found or not posted' })

    await prisma.finJournalEntry.updateMany({ where: { id, tenantId }, data: { status: 'void', voidedBy: userId, voidedAt: new Date(), voidReason: reason, updatedBy: userId } })

    // Create reversing entry
    const revCount = await prisma.finJournalEntry.count({ where: { tenantId } })
    const revNumber = `JE-${String(revCount + 1).padStart(5, '0')}`
    const reversing = await prisma.finJournalEntry.create({
      data: {
        tenantId, number: revNumber, type: 'adjustment',
        status: 'posted', date: new Date(), periodId: entry.periodId,
        currency: entry.currency, exchangeRate: entry.exchangeRate,
        reference: `Reversal of ${entry.number}`,
        description: `Reversing entry for voided journal ${entry.number}`,
        sourceType: 'journal_reversal', sourceId: entry.id,
        postedBy: userId, postedAt: new Date(),
        createdBy: userId, updatedBy: userId,
      },
    })

    // Reverse all lines (swap debit/credit)
    for (let i = 0; i < entry.lines.length; i++) {
      const l = entry.lines[i]!
      await prisma.finJournalLine.create({
        data: {
          tenantId, journalId: reversing.id, accountId: l.accountId,
          costCenterId: l.costCenterId, description: l.description,
          debit: l.credit, credit: l.debit,
          currency: l.currency, exchangeRate: l.exchangeRate,
          debitBase: Number(l.creditBase), creditBase: Number(l.debitBase),
          sortOrder: i, createdBy: userId, updatedBy: userId,
        },
      })
    }

    await logAudit(tenantId, userId, 'JOURNAL_VOIDED', 'fin_journal_entries', id, { reason, reversingJournal: revNumber })
    return reply.send({ success: true, data: { reversingJournalNumber: revNumber } })
  })

  // DELETE only drafts
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const entry = await prisma.finJournalEntry.findFirst({ where: { id, tenantId } })
    if (!entry) return reply.code(404).send({ success: false, error: 'Not found' })
    if (entry.status !== 'draft') return reply.code(400).send({ success: false, error: 'Only draft journal entries can be deleted' })
    await prisma.finJournalEntry.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'finance', entityType, entityId, newValues: meta } }).catch(() => {})
}
