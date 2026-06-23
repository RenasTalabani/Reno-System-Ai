import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

function calcTotals(items: any[], discountCode?: string, discountPct: number = 0) {
  let subtotal = 0, taxTotal = 0, discountTotal = 0
  for (const item of items) {
    const lineSubtotal = Number(item.quantity) * Number(item.unitPrice)
    const lineDiscount = lineSubtotal * (Number(item.discount ?? 0) / 100)
    const lineAfterDiscount = lineSubtotal - lineDiscount
    const lineTax = lineAfterDiscount * (Number(item.taxRate ?? 0) / 100)
    subtotal += lineSubtotal
    discountTotal += lineDiscount
    taxTotal += lineTax
  }
  if (discountPct > 0) {
    const extra = subtotal * (discountPct / 100)
    discountTotal += extra
    taxTotal = 0
    for (const item of items) {
      const lineSubtotal = Number(item.quantity) * Number(item.unitPrice)
      const lineDiscount = lineSubtotal * ((Number(item.discount ?? 0) + discountPct) / 100)
      const lineAfterDiscount = lineSubtotal - lineDiscount
      taxTotal += lineAfterDiscount * (Number(item.taxRate ?? 0) / 100)
    }
  }
  return { subtotal: +subtotal.toFixed(2), discountTotal: +discountTotal.toFixed(2), taxTotal: +taxTotal.toFixed(2), total: +(subtotal - discountTotal + taxTotal).toFixed(2) }
}

export async function salesQuotationRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, contactId, companyId, ownerId, search, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (contactId) where.contactId = contactId
    if (companyId) where.companyId = companyId
    if (ownerId) where.ownerId = ownerId
    if (search) where.OR = [{ number: { contains: search, mode: 'insensitive' } }]
    const [quotations, total] = await Promise.all([
      prisma.salesQuotation.findMany({
        where,
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.salesQuotation.count({ where }),
    ])
    return reply.send({ success: true, data: quotations, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.salesQuotation.count({ where: { tenantId } })
    const number = `QT-${String(count + 1).padStart(4, '0')}`

    // Resolve discount from code
    let discountPct = 0
    if (body.discountCode) {
      const disc = await prisma.salesDiscount.findFirst({ where: { tenantId, code: body.discountCode, deletedAt: null, isActive: true } })
      if (disc && disc.discountType === 'percentage') discountPct = Number(disc.value)
    }

    const items = body.items ?? []
    const totals = calcTotals(items, body.discountCode, discountPct)

    const quotation = await prisma.salesQuotation.create({
      data: {
        tenantId, number, status: 'draft',
        contactId: body.contactId, companyId: body.companyId,
        opportunityId: body.opportunityId, ownerId: body.ownerId ?? userId,
        currency: body.currency ?? 'USD', exchangeRate: body.exchangeRate ?? 1,
        ...totals,
        discountCode: body.discountCode,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        notes: body.notes, terms: body.terms,
        billingAddress: body.billingAddress,
        createdBy: userId, updatedBy: userId,
      },
    })

    // Create items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const lineSubtotal = Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0)
      const lineDiscount = lineSubtotal * (Number(item.discount ?? 0) / 100)
      const lineAfterDiscount = lineSubtotal - lineDiscount
      const lineTax = lineAfterDiscount * (Number(item.taxRate ?? 0) / 100)
      await prisma.salesQuotationItem.create({
        data: {
          tenantId, quotationId: quotation.id,
          productId: item.productId,
          name: item.name, description: item.description,
          quantity: item.quantity ?? 1, unitPrice: item.unitPrice ?? 0,
          discount: item.discount ?? 0, taxRate: item.taxRate ?? 0,
          subtotal: +lineSubtotal.toFixed(2),
          taxAmount: +lineTax.toFixed(2),
          total: +(lineAfterDiscount + lineTax).toFixed(2),
          sortOrder: i, unit: item.unit ?? 'unit',
        },
      })
    }

    await logAudit(tenantId, userId, 'QUOTATION_CREATED', 'sales_quotations', quotation.id, { number })
    const full = await prisma.salesQuotation.findUnique({ where: { id: quotation.id }, include: { items: { where: { deletedAt: null } } } })
    return reply.code(201).send({ success: true, data: full })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const quotation = await prisma.salesQuotation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: { where: { deletedAt: null }, include: { product: { select: { id: true, name: true, sku: true } } }, orderBy: { sortOrder: 'asc' } },
        orders: { where: { deletedAt: null }, select: { id: true, number: true, status: true } },
      },
    })
    if (!quotation) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: quotation })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['contactId','companyId','ownerId','currency','exchangeRate','validUntil','notes','terms','billingAddress','discountCode']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = k === 'validUntil' && body[k] ? new Date(body[k]) : body[k]
    await prisma.salesQuotation.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  // PATCH /quotations/:id/send
  app.patch('/:id/send', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesQuotation.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'sent', sentAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'QUOTATION_SENT', 'sales_quotations', id, {})
    return reply.send({ success: true })
  })

  // PATCH /quotations/:id/accept
  app.patch('/:id/accept', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesQuotation.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'accepted', acceptedAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'QUOTATION_ACCEPTED', 'sales_quotations', id, {})
    return reply.send({ success: true })
  })

  // PATCH /quotations/:id/reject
  app.patch('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any
    await prisma.salesQuotation.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'rejected', rejectedAt: new Date(), rejectionReason: reason, updatedBy: userId } })
    return reply.send({ success: true })
  })

  // POST /quotations/:id/convert — Convert quote to sales order
  app.post('/:id/convert', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const quotation = await prisma.salesQuotation.findFirst({ where: { id, tenantId, deletedAt: null }, include: { items: { where: { deletedAt: null } } } })
    if (!quotation) return reply.code(404).send({ success: false, error: 'Not found' })

    const count = await prisma.salesOrder.count({ where: { tenantId } })
    const number = `SO-${String(count + 1).padStart(4, '0')}`

    const order = await prisma.salesOrder.create({
      data: {
        tenantId, number, quotationId: id, status: 'draft',
        contactId: quotation.contactId, companyId: quotation.companyId,
        ownerId: quotation.ownerId, currency: quotation.currency,
        exchangeRate: quotation.exchangeRate, subtotal: quotation.subtotal,
        discountTotal: quotation.discountTotal, taxTotal: quotation.taxTotal,
        total: quotation.total, discountCode: quotation.discountCode,
        billingAddress: quotation.billingAddress as any,
        notes: quotation.notes, terms: quotation.terms,
        createdBy: userId, updatedBy: userId,
      },
    })

    for (const item of quotation.items) {
      await prisma.salesOrderItem.create({
        data: {
          tenantId, orderId: order.id, productId: item.productId,
          name: item.name, description: item.description,
          quantity: item.quantity, unitPrice: item.unitPrice,
          discount: item.discount, taxRate: item.taxRate,
          subtotal: item.subtotal, taxAmount: item.taxAmount, total: item.total,
          sortOrder: item.sortOrder, unit: item.unit,
        },
      })
    }

    await prisma.salesQuotation.update({ where: { id }, data: { convertedToOrderId: order.id, updatedBy: userId } })
    await logAudit(tenantId, userId, 'QUOTATION_CONVERTED', 'sales_quotations', id, { orderId: order.id })
    return reply.code(201).send({ success: true, data: { orderId: order.id, orderNumber: number } })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesQuotation.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'sales', entityType, entityId, newValues: meta } }).catch(() => {})
}
