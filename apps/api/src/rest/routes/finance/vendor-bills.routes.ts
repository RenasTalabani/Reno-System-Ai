import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finVendorBillRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, vendorId, search, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (vendorId) where.vendorId = vendorId
    if (search) where.OR = [{ number: { contains: search, mode: 'insensitive' } }, { reference: { contains: search, mode: 'insensitive' } }]
    const [bills, total] = await Promise.all([
      prisma.finVendorBill.findMany({ where, include: { vendor: { select: { id: true, name: true } }, _count: { select: { lines: true } } }, orderBy: { date: 'desc' }, take, skip }),
      prisma.finVendorBill.count({ where }),
    ])
    return reply.send({ success: true, data: bills, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.finVendorBill.count({ where: { tenantId } })
    const number = `BILL-${String(count + 1).padStart(4, '0')}`
    const lines = body.lines ?? []

    let subtotal = 0, taxTotal = 0
    for (const l of lines) {
      const ls = Number(l.quantity ?? 1) * Number(l.unitPrice ?? 0)
      const lt = ls * (Number(l.taxRate ?? 0) / 100)
      subtotal += ls; taxTotal += lt
    }
    const total = subtotal + taxTotal
    const dueDate = body.dueDate ? new Date(body.dueDate) : (() => { const d = new Date(body.date ?? Date.now()); d.setDate(d.getDate() + (body.paymentTerms ?? 30)); return d })()

    const bill = await prisma.finVendorBill.create({
      data: {
        tenantId, vendorId: body.vendorId, number, reference: body.reference,
        status: 'draft', date: new Date(body.date ?? Date.now()), dueDate,
        currency: body.currency ?? 'USD', exchangeRate: body.exchangeRate ?? 1,
        subtotal: +subtotal.toFixed(2), taxTotal: +taxTotal.toFixed(2),
        total: +total.toFixed(2), amountDue: +total.toFixed(2),
        notes: body.notes, createdBy: userId, updatedBy: userId,
      },
    })

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      const ls = Number(l.quantity ?? 1) * Number(l.unitPrice ?? 0)
      const lt = ls * (Number(l.taxRate ?? 0) / 100)
      await prisma.finVendorBillLine.create({
        data: {
          tenantId, billId: bill.id, accountId: l.accountId,
          costCenterId: l.costCenterId, description: l.description,
          quantity: l.quantity ?? 1, unitPrice: l.unitPrice ?? 0,
          taxRate: l.taxRate ?? 0, taxAmount: +lt.toFixed(4),
          subtotal: +ls.toFixed(2), total: +(ls + lt).toFixed(2),
          sortOrder: i, createdBy: userId, updatedBy: userId,
        },
      })
    }

    await logAudit(tenantId, userId, 'VENDOR_BILL_CREATED', 'fin_vendor_bills', bill.id, { number })
    const full = await prisma.finVendorBill.findUnique({ where: { id: bill.id }, include: { lines: { where: { deletedAt: null } }, vendor: { select: { id: true, name: true } } } })
    return reply.code(201).send({ success: true, data: full })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const bill = await prisma.finVendorBill.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        vendor: true,
        lines: {
          where: { deletedAt: null },
          include: { account: { select: { id: true, code: true, name: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    })
    if (!bill) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: bill })
  })

  // POST /:id/post — Post bill + auto-create journal entry
  app.patch('/:id/post', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const bill = await prisma.finVendorBill.findFirst({
      where: { id, tenantId, status: 'draft', deletedAt: null },
      include: { lines: { where: { deletedAt: null } }, vendor: { select: { name: true, apAccountId: true } } },
    })
    if (!bill) return reply.code(404).send({ success: false, error: 'Not found or not draft' })

    // Find default AP account
    const apAccount = bill.vendor.apAccountId
      ? await prisma.finAccount.findFirst({ where: { id: bill.vendor.apAccountId, tenantId } })
      : await prisma.finAccount.findFirst({ where: { tenantId, code: '2000', deletedAt: null } })

    if (!apAccount) return reply.code(400).send({ success: false, error: 'No Accounts Payable account found. Please set up account code 2000.' })

    // Create journal entry: DR Expense accounts, CR Accounts Payable
    const jeCount = await prisma.finJournalEntry.count({ where: { tenantId } })
    const jeNumber = `JE-${String(jeCount + 1).padStart(5, '0')}`

    const period = await prisma.finPeriod.findFirst({ where: { tenantId, startDate: { lte: bill.date }, endDate: { gte: bill.date }, status: 'open' } })

    const je = await prisma.finJournalEntry.create({
      data: {
        tenantId, number: jeNumber, type: 'purchase', status: 'posted',
        date: bill.date, periodId: period?.id,
        currency: bill.currency, exchangeRate: bill.exchangeRate,
        reference: bill.number, description: `Vendor bill: ${bill.vendor.name}`,
        sourceType: 'vendor_bill', sourceId: bill.id,
        postedBy: userId, postedAt: new Date(),
        createdBy: userId, updatedBy: userId,
      },
    })

    const rate = Number(bill.exchangeRate)
    let sortOrder = 0
    // DR each expense line
    for (const l of bill.lines) {
      await prisma.finJournalLine.create({
        data: {
          tenantId, journalId: je.id, accountId: l.accountId,
          costCenterId: l.costCenterId, description: l.description,
          debit: Number(l.total), credit: 0,
          currency: bill.currency, exchangeRate: rate,
          debitBase: Number(l.total) * rate, creditBase: 0,
          sortOrder: sortOrder++, createdBy: userId, updatedBy: userId,
        },
      })
    }
    // CR Accounts Payable (total)
    await prisma.finJournalLine.create({
      data: {
        tenantId, journalId: je.id, accountId: apAccount.id,
        description: `AP: ${bill.vendor.name} - ${bill.number}`,
        debit: 0, credit: Number(bill.total),
        currency: bill.currency, exchangeRate: rate,
        debitBase: 0, creditBase: Number(bill.total) * rate,
        sortOrder: sortOrder, sourceType: 'vendor_bill', sourceId: bill.id,
        createdBy: userId, updatedBy: userId,
      },
    })

    await prisma.finVendorBill.updateMany({ where: { id, tenantId }, data: { status: 'posted', journalId: je.id, updatedBy: userId } })
    await logAudit(tenantId, userId, 'VENDOR_BILL_POSTED', 'fin_vendor_bills', id, { journalNumber: jeNumber })
    return reply.send({ success: true, data: { journalNumber: jeNumber } })
  })

  app.patch('/:id/void', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.finVendorBill.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'void', updatedBy: userId } })
    await logAudit(tenantId, userId, 'VENDOR_BILL_VOIDED', 'fin_vendor_bills', id, {})
    return reply.send({ success: true })
  })

  // POST /:id/payment — Record payment against bill
  app.post('/:id/payment', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const bill = await prisma.finVendorBill.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!bill) return reply.code(404).send({ success: false, error: 'Not found' })

    const count = await prisma.finVendorPayment.count({ where: { tenantId } })
    const number = `VPAY-${String(count + 1).padStart(4, '0')}`

    const payment = await prisma.finVendorPayment.create({
      data: {
        tenantId, vendorId: bill.vendorId, billId: id, number,
        date: new Date(body.date ?? Date.now()), amount: body.amount,
        currency: body.currency ?? bill.currency,
        exchangeRate: body.exchangeRate ?? 1,
        amountBase: Number(body.amount) * Number(body.exchangeRate ?? 1),
        method: body.method ?? 'bank_transfer', reference: body.reference,
        bankAccountId: body.bankAccountId, notes: body.notes,
        createdBy: userId, updatedBy: userId,
      },
    })

    // Update bill amountPaid / amountDue / status
    const allPayments = await prisma.finVendorPayment.aggregate({ where: { billId: id, tenantId, deletedAt: null }, _sum: { amount: true } })
    const totalPaid = Number(allPayments._sum.amount ?? 0)
    const amountDue = Math.max(0, Number(bill.total) - totalPaid)
    const newStatus = amountDue <= 0 ? 'paid' : 'partial'
    await prisma.finVendorBill.updateMany({ where: { id, tenantId }, data: { amountPaid: totalPaid, amountDue, status: newStatus, updatedBy: userId } })

    await logAudit(tenantId, userId, 'VENDOR_PAYMENT_RECORDED', 'fin_vendor_payments', payment.id, { billId: id, amount: body.amount })
    return reply.code(201).send({ success: true, data: payment })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const bill = await prisma.finVendorBill.findFirst({ where: { id, tenantId } })
    if (bill?.status !== 'draft') return reply.code(400).send({ success: false, error: 'Only draft bills can be deleted' })
    await prisma.finVendorBill.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'finance', entityType, entityId, newValues: meta } }).catch(() => {})
}
