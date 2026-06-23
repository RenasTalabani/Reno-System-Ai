import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesPaymentRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { invoiceId, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (invoiceId) where.invoiceId = invoiceId
    const [payments, total] = await Promise.all([
      prisma.salesPayment.findMany({ where, orderBy: { paidAt: 'desc' }, take, skip }),
      prisma.salesPayment.count({ where }),
    ])
    return reply.send({ success: true, data: payments, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const invoice = await prisma.salesInvoice.findFirst({ where: { id: body.invoiceId, tenantId, deletedAt: null } })
    if (!invoice) return reply.code(404).send({ success: false, error: 'Invoice not found' })

    const payment = await prisma.salesPayment.create({
      data: {
        tenantId, invoiceId: body.invoiceId,
        amount: body.amount, currency: body.currency ?? invoice.currency,
        exchangeRate: body.exchangeRate ?? 1,
        amountInBase: body.amount * (body.exchangeRate ?? 1),
        method: body.method ?? 'bank_transfer',
        reference: body.reference, notes: body.notes,
        gatewayId: body.gatewayId, gatewayResponse: body.gatewayResponse,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        createdBy: userId, updatedBy: userId,
      },
    })

    // Recalculate invoice amountPaid and amountDue
    const allPayments = await prisma.salesPayment.aggregate({
      where: { invoiceId: body.invoiceId, tenantId, deletedAt: null },
      _sum: { amount: true },
    })
    const totalPaid = Number(allPayments._sum.amount ?? 0)
    const amountDue = Math.max(0, Number(invoice.total) - totalPaid)
    const newStatus = amountDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : invoice.status
    await prisma.salesInvoice.updateMany({
      where: { id: body.invoiceId, tenantId },
      data: { amountPaid: totalPaid, amountDue, status: newStatus, paidAt: amountDue <= 0 ? new Date() : undefined, updatedBy: userId },
    })

    await logAudit(tenantId, userId, 'PAYMENT_RECORDED', 'sales_payments', payment.id, { invoiceId: body.invoiceId, amount: body.amount })
    return reply.code(201).send({ success: true, data: payment })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const payment = await prisma.salesPayment.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!payment) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: payment })
  })

  // POST /payments/:id/refund — soft-cancel payment, reverse invoice amounts
  app.post('/:id/refund', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const payment = await prisma.salesPayment.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!payment) return reply.code(404).send({ success: false, error: 'Not found' })

    await prisma.salesPayment.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date(), updatedBy: userId } })

    // Recalculate invoice
    const allPayments = await prisma.salesPayment.aggregate({
      where: { invoiceId: payment.invoiceId, tenantId, deletedAt: null },
      _sum: { amount: true },
    })
    const totalPaid = Number(allPayments._sum.amount ?? 0)
    const invoice = await prisma.salesInvoice.findFirst({ where: { id: payment.invoiceId, tenantId } })
    if (invoice) {
      const amountDue = Math.max(0, Number(invoice.total) - totalPaid)
      const newStatus = amountDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'sent'
      await prisma.salesInvoice.updateMany({
        where: { id: payment.invoiceId, tenantId },
        data: { amountPaid: totalPaid, amountDue, status: newStatus, paidAt: amountDue <= 0 ? invoice.paidAt : null, updatedBy: userId },
      })
    }

    await logAudit(tenantId, userId, 'PAYMENT_REFUNDED', 'sales_payments', id, { invoiceId: payment.invoiceId })
    return reply.send({ success: true })
  })

  // Payment methods
  app.get('/methods', async (req, reply) => {
    const { tenantId } = req as any
    const methods = await prisma.salesPaymentMethod.findMany({ where: { tenantId, deletedAt: null }, orderBy: { sortOrder: 'asc' } })
    return reply.send({ success: true, data: methods })
  })

  app.post('/methods', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const method = await prisma.salesPaymentMethod.create({
      data: { tenantId, name: body.name, methodType: body.methodType, config: body.config ?? {}, isDefault: body.isDefault ?? false, sortOrder: body.sortOrder ?? 0, createdBy: userId, updatedBy: userId },
    })
    return reply.code(201).send({ success: true, data: method })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'sales', entityType, entityId, newValues: meta } }).catch(() => {})
}
