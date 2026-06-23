import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesInvoiceRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, contactId, companyId, search, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (contactId) where.contactId = contactId
    if (companyId) where.companyId = companyId
    if (search) where.number = { contains: search, mode: 'insensitive' }
    const [invoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        include: { _count: { select: { items: true, payments: true } } },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.salesInvoice.count({ where }),
    ])
    return reply.send({ success: true, data: invoices, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.salesInvoice.count({ where: { tenantId } })
    const number = `INV-${String(count + 1).padStart(4, '0')}`
    const items = body.items ?? []

    let subtotal = 0, discountTotal = 0, taxTotal = 0
    for (const item of items) {
      const ls = Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0)
      const ld = ls * (Number(item.discount ?? 0) / 100)
      const lt = (ls - ld) * (Number(item.taxRate ?? 0) / 100)
      subtotal += ls; discountTotal += ld; taxTotal += lt
    }
    const total = subtotal - discountTotal + taxTotal
    const dueDate = body.dueDate ? new Date(body.dueDate) : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d })()

    const invoice = await prisma.salesInvoice.create({
      data: {
        tenantId, number, status: 'draft',
        orderId: body.orderId, contactId: body.contactId, companyId: body.companyId,
        ownerId: body.ownerId ?? userId, currency: body.currency ?? 'USD',
        exchangeRate: body.exchangeRate ?? 1,
        subtotal: +subtotal.toFixed(2), discountTotal: +discountTotal.toFixed(2),
        taxTotal: +taxTotal.toFixed(2), total: +total.toFixed(2), amountDue: +total.toFixed(2),
        dueDate, billingAddress: body.billingAddress, notes: body.notes, terms: body.terms,
        createdBy: userId, updatedBy: userId,
      },
    })

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const ls = Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0)
      const ld = ls * (Number(item.discount ?? 0) / 100)
      const lt = (ls - ld) * (Number(item.taxRate ?? 0) / 100)
      await prisma.salesInvoiceItem.create({
        data: {
          tenantId, invoiceId: invoice.id, productId: item.productId,
          name: item.name, description: item.description,
          quantity: item.quantity ?? 1, unitPrice: item.unitPrice ?? 0,
          discount: item.discount ?? 0, taxRate: item.taxRate ?? 0,
          subtotal: +ls.toFixed(2), taxAmount: +lt.toFixed(2),
          total: +(ls - ld + lt).toFixed(2), sortOrder: i, unit: item.unit ?? 'unit',
        },
      })
    }

    await logAudit(tenantId, userId, 'INVOICE_CREATED', 'sales_invoices', invoice.id, { number })
    const full = await prisma.salesInvoice.findUnique({ where: { id: invoice.id }, include: { items: { where: { deletedAt: null } } } })
    return reply.code(201).send({ success: true, data: full })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: { where: { deletedAt: null }, include: { product: { select: { id: true, name: true, sku: true } } }, orderBy: { sortOrder: 'asc' } },
        payments: { where: { deletedAt: null }, orderBy: { paidAt: 'desc' } },
        order: { select: { id: true, number: true, status: true } },
      },
    })
    if (!invoice) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: invoice })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['contactId','companyId','ownerId','currency','exchangeRate','dueDate','notes','terms','billingAddress']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = k === 'dueDate' && body[k] ? new Date(body[k]) : body[k]
    await prisma.salesInvoice.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.patch('/:id/send', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesInvoice.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'sent', sentAt: new Date(), issuedAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'INVOICE_SENT', 'sales_invoices', id, {})
    return reply.send({ success: true })
  })

  app.patch('/:id/mark-paid', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const invoice = await prisma.salesInvoice.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!invoice) return reply.code(404).send({ success: false, error: 'Not found' })
    await prisma.salesInvoice.updateMany({ where: { id, tenantId }, data: { status: 'paid', amountPaid: invoice.total, amountDue: 0, paidAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'INVOICE_PAID', 'sales_invoices', id, { total: invoice.total })
    return reply.send({ success: true })
  })

  app.patch('/:id/void', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesInvoice.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'void', voidedAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'INVOICE_VOIDED', 'sales_invoices', id, {})
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesInvoice.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'sales', entityType, entityId, newValues: meta } }).catch(() => {})
}
