import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function procOrderRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status, supplierId, search } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (supplierId) where.supplierId = supplierId
    if (search) where.number = { contains: search, mode: 'insensitive' }
    const [total, items] = await Promise.all([
      prisma.procOrder.count({ where }),
      prisma.procOrder.findMany({
        where, skip, take: Number(limit),
        include: {
          supplier: { select: { name: true, code: true } },
          _count: { select: { lines: true, approvals: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const lines = body.lines ?? []
    const subtotal = lines.reduce((sum: number, l: any) => sum + Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0), 0)
    const taxAmount = Number(body.taxAmount ?? 0)
    const discountAmount = Number(body.discountAmount ?? 0)
    const totalAmount = subtotal + taxAmount - discountAmount

    const count = await prisma.procOrder.count({ where: { tenantId } })
    const number = `PO-${String(count + 1).padStart(5, '0')}`

    const order = await prisma.procOrder.create({
      data: {
        tenantId, number, supplierId: body.supplierId,
        requisitionId: body.requisitionId, quotationId: body.quotationId,
        warehouseId: body.warehouseId,
        currency: body.currency ?? 'USD',
        subtotal, taxAmount, discountAmount, totalAmount,
        paymentTerms: body.paymentTerms ? Number(body.paymentTerms) : undefined,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
        shippingAddress: body.shippingAddress,
        notes: body.notes, terms: body.terms, internalNotes: body.internalNotes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: lines.map((l: any) => ({
            tenantId, productId: l.productId, productCode: l.productCode,
            description: l.description ?? '',
            quantity: l.quantity, unitId: l.unitId, unitPrice: l.unitPrice,
            totalPrice: Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0),
            taxRate: l.taxRate, discountRate: l.discountRate,
            accountId: l.accountId, notes: l.notes,
            currency: body.currency ?? 'USD',
          })),
        },
      },
      include: { lines: true },
    })

    // Update requisition status if linked
    if (body.requisitionId) {
      await prisma.procRequisition.update({
        where: { id: body.requisitionId },
        data: { status: 'ordered', updatedBy: userId },
      })
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'procurement', entityType: 'ProcOrder', entityId: order.id, newValues: { number, totalAmount } } })
    return reply.code(201).send({ success: true, data: order })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.procOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        supplier: { select: { name: true, code: true, email: true, phone: true } },
        quotation: { select: { number: true } },
        lines: true,
        approvals: { orderBy: { level: 'asc' } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Purchase order not found' })

    // Fetch linked receipt if exists
    let invReceipt = null
    if (item.invReceiptId) {
      invReceipt = await prisma.invReceipt.findFirst({
        where: { id: item.invReceiptId },
        select: { id: true, number: true, status: true },
      })
    }

    return reply.send({ success: true, data: { ...item, invReceipt } })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Only draft orders can be edited' })
    const body = req.body as any
    const allowed = ['paymentTerms', 'expectedDate', 'shippingAddress', 'notes', 'terms', 'internalNotes', 'discountAmount', 'taxAmount']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    if (data.expectedDate) data.expectedDate = new Date(data.expectedDate)
    if (data.paymentTerms) data.paymentTerms = Number(data.paymentTerms)
    const item = await prisma.procOrder.update({ where: { id }, data })
    return reply.send({ success: true, data: item })
  })

  app.post('/:id/submit', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procOrder.findFirst({ where: { id, tenantId }, include: { lines: true } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'draft') return reply.code(400).send({ success: false, error: `Order is already ${existing.status}` })
    if (existing.lines.length === 0) return reply.code(400).send({ success: false, error: 'Order has no lines' })
    const updated = await prisma.procOrder.update({ where: { id }, data: { status: 'pending_approval', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SUBMIT', module: 'procurement', entityType: 'ProcOrder', entityId: id, newValues: { status: 'pending_approval' } } })
    return reply.send({ success: true, data: updated })
  })

  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { level = 1, comment } = req.body as any ?? {}
    const existing = await prisma.procOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['pending_approval', 'draft'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Order cannot be approved in current status' })
    const approval = await prisma.procOrderApproval.create({
      data: {
        tenantId, orderId: id, approverId: userId,
        level, status: 'approved', comment, actionAt: new Date(),
      },
    })
    const updated = await prisma.procOrder.update({
      where: { id },
      data: { status: 'approved', updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'APPROVE', module: 'procurement', entityType: 'ProcOrder', entityId: id, newValues: { status: 'approved', level } } })
    return reply.send({ success: true, data: { order: updated, approval } })
  })

  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { comment, level = 1 } = req.body as any ?? {}
    const existing = await prisma.procOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['pending_approval'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Order is not pending approval' })
    await prisma.procOrderApproval.create({
      data: { tenantId, orderId: id, approverId: userId, level, status: 'rejected', comment, actionAt: new Date() },
    })
    const updated = await prisma.procOrder.update({ where: { id }, data: { status: 'rejected', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'REJECT', module: 'procurement', entityType: 'ProcOrder', entityId: id, newValues: { status: 'rejected', comment } } })
    return reply.send({ success: true, data: updated })
  })

  app.post('/:id/send', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'approved') return reply.code(400).send({ success: false, error: 'Order must be approved before sending' })
    const updated = await prisma.procOrder.update({ where: { id }, data: { status: 'sent', sentAt: new Date(), updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SEND', module: 'procurement', entityType: 'ProcOrder', entityId: id, newValues: { status: 'sent' } } })
    return reply.send({ success: true, data: updated })
  })

  // Receive PO → creates InvReceipt in inventory module
  app.post('/:id/receive', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true, supplier: { select: { name: true } } },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['approved', 'sent', 'partially_received'].includes(existing.status)) {
      return reply.code(400).send({ success: false, error: 'Order is not in a receivable status' })
    }
    if (!existing.warehouseId) return reply.code(400).send({ success: false, error: 'Order must have a destination warehouse' })

    const receiptCount = await prisma.invReceipt.count({ where: { tenantId } })
    const receiptNumber = `GRN-${String(receiptCount + 1).padStart(5, '0')}`

    // Only lines with a productId can be received into inventory
    const receivableLines = existing.lines.filter(l => l.productId != null)

    const receipt = await prisma.invReceipt.create({
      data: {
        tenantId, number: receiptNumber,
        warehouseId: existing.warehouseId,
        supplierId: existing.supplierId,
        supplierName: existing.supplier.name,
        reference: existing.number,
        notes: `Auto-created from PO ${existing.number}`,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: receivableLines.map(l => ({
            tenantId, productId: l.productId as string,
            expectedQty: Number(l.quantity),
            receivedQty: Number(l.quantity),
            unitCost: l.unitPrice,
            totalCost: l.totalPrice,
          })),
        },
      },
      include: { lines: true },
    })

    // Link receipt to order and mark received
    await prisma.procOrder.update({
      where: { id },
      data: { status: 'received', receivedAt: new Date(), invReceiptId: receipt.id, updatedBy: userId },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'RECEIVE', module: 'procurement',
        entityType: 'ProcOrder', entityId: id,
        newValues: { receiptId: receipt.id, receiptNumber },
      },
    })

    return reply.send({ success: true, data: { orderId: id, receipt } })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft', 'rejected'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot delete this order' })
    await prisma.procOrder.update({ where: { id }, data: { status: 'cancelled', deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })
}
