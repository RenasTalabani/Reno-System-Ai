import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesOrderRoutes(app: FastifyInstance) {
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
    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: { _count: { select: { items: true, invoices: true } } },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.salesOrder.count({ where }),
    ])
    return reply.send({ success: true, data: orders, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.salesOrder.count({ where: { tenantId } })
    const number = `SO-${String(count + 1).padStart(4, '0')}`
    const items = body.items ?? []

    let subtotal = 0, discountTotal = 0, taxTotal = 0
    for (const item of items) {
      const ls = Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0)
      const ld = ls * (Number(item.discount ?? 0) / 100)
      const lt = (ls - ld) * (Number(item.taxRate ?? 0) / 100)
      subtotal += ls; discountTotal += ld; taxTotal += lt
    }
    const total = subtotal - discountTotal + taxTotal

    const order = await prisma.salesOrder.create({
      data: {
        tenantId, number, status: 'draft',
        contactId: body.contactId, companyId: body.companyId,
        quotationId: body.quotationId, ownerId: body.ownerId ?? userId,
        currency: body.currency ?? 'USD', exchangeRate: body.exchangeRate ?? 1,
        subtotal: +subtotal.toFixed(2), discountTotal: +discountTotal.toFixed(2),
        taxTotal: +taxTotal.toFixed(2), total: +total.toFixed(2),
        discountCode: body.discountCode, billingAddress: body.billingAddress,
        shippingAddress: body.shippingAddress, notes: body.notes, terms: body.terms,
        createdBy: userId, updatedBy: userId,
      },
    })

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const ls = Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0)
      const ld = ls * (Number(item.discount ?? 0) / 100)
      const lt = (ls - ld) * (Number(item.taxRate ?? 0) / 100)
      await prisma.salesOrderItem.create({
        data: {
          tenantId, orderId: order.id, productId: item.productId,
          name: item.name, description: item.description,
          quantity: item.quantity ?? 1, unitPrice: item.unitPrice ?? 0,
          discount: item.discount ?? 0, taxRate: item.taxRate ?? 0,
          subtotal: +ls.toFixed(2), taxAmount: +lt.toFixed(2),
          total: +(ls - ld + lt).toFixed(2), sortOrder: i, unit: item.unit ?? 'unit',
        },
      })
    }

    await logAudit(tenantId, userId, 'ORDER_CREATED', 'sales_orders', order.id, { number })
    const full = await prisma.salesOrder.findUnique({ where: { id: order.id }, include: { items: { where: { deletedAt: null } } } })
    return reply.code(201).send({ success: true, data: full })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const order = await prisma.salesOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: { where: { deletedAt: null }, include: { product: { select: { id: true, name: true, sku: true } } }, orderBy: { sortOrder: 'asc' } },
        invoices: { where: { deletedAt: null }, select: { id: true, number: true, status: true, total: true, amountDue: true } },
        quotation: { select: { id: true, number: true } },
      },
    })
    if (!order) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: order })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['contactId','companyId','ownerId','currency','exchangeRate','notes','terms','billingAddress','shippingAddress']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    await prisma.salesOrder.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.patch('/:id/confirm', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesOrder.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'confirmed', confirmedAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'ORDER_CONFIRMED', 'sales_orders', id, {})
    return reply.send({ success: true })
  })

  app.patch('/:id/deliver', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesOrder.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'delivered', deliveredAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'ORDER_DELIVERED', 'sales_orders', id, {})
    return reply.send({ success: true })
  })

  app.patch('/:id/cancel', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any
    await prisma.salesOrder.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason, updatedBy: userId } })
    return reply.send({ success: true })
  })

  // POST /orders/:id/invoice — Generate invoice from order
  app.post('/:id/invoice', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const order = await prisma.salesOrder.findFirst({ where: { id, tenantId, deletedAt: null }, include: { items: { where: { deletedAt: null } } } })
    if (!order) return reply.code(404).send({ success: false, error: 'Not found' })

    const count = await prisma.salesInvoice.count({ where: { tenantId } })
    const number = `INV-${String(count + 1).padStart(4, '0')}`
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30)

    const invoice = await prisma.salesInvoice.create({
      data: {
        tenantId, number, orderId: id, status: 'draft',
        contactId: order.contactId, companyId: order.companyId,
        ownerId: order.ownerId, currency: order.currency, exchangeRate: order.exchangeRate,
        subtotal: order.subtotal, discountTotal: order.discountTotal,
        taxTotal: order.taxTotal, total: order.total, amountDue: order.total,
        dueDate, billingAddress: order.billingAddress as any,
        notes: order.notes, terms: order.terms,
        createdBy: userId, updatedBy: userId,
      },
    })

    for (const item of order.items) {
      await prisma.salesInvoiceItem.create({
        data: {
          tenantId, invoiceId: invoice.id, productId: item.productId,
          name: item.name, description: item.description,
          quantity: item.quantity, unitPrice: item.unitPrice,
          discount: item.discount, taxRate: item.taxRate,
          subtotal: item.subtotal, taxAmount: item.taxAmount, total: item.total,
          sortOrder: item.sortOrder, unit: item.unit,
        },
      })
    }

    await logAudit(tenantId, userId, 'INVOICE_CREATED_FROM_ORDER', 'sales_invoices', invoice.id, { invoiceNumber: number, orderId: id })
    return reply.code(201).send({ success: true, data: { invoiceId: invoice.id, invoiceNumber: number } })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesOrder.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'sales', entityType, entityId, newValues: meta } }).catch(() => {})
}
