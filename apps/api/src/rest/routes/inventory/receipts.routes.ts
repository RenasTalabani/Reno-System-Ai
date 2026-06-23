import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { createMovement } from './movement.helper.js'

export async function invReceiptRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status, warehouseId } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (warehouseId) where.warehouseId = warehouseId
    const [total, items] = await Promise.all([
      prisma.invReceipt.count({ where }),
      prisma.invReceipt.findMany({
        where, skip, take: Number(limit),
        include: {
          warehouse: { select: { name: true, code: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { receiptDate: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.invReceipt.count({ where: { tenantId } })
    const number = `GRN-${String(count + 1).padStart(5, '0')}`
    const receipt = await prisma.invReceipt.create({
      data: {
        tenantId, number,
        warehouseId: body.warehouseId,
        zoneId: body.zoneId,
        supplierId: body.supplierId,
        supplierName: body.supplierName,
        reference: body.reference,
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: (body.lines ?? []).map((l: any) => ({
            tenantId, productId: l.productId,
            expectedQty: l.expectedQty, receivedQty: 0,
            unitCost: l.unitCost, totalCost: l.totalCost, lotId: l.lotId, notes: l.notes,
          })),
        },
      },
      include: { lines: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvReceipt', entityId: receipt.id, newValues: { number } } })
    return reply.code(201).send({ success: true, data: receipt })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.invReceipt.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        warehouse: true,
        lines: { include: { product: { select: { name: true, code: true, unit: { select: { symbol: true } } } } } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Receipt not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.invReceipt.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'draft') return reply.code(400).send({ success: false, error: 'Only draft receipts can be edited' })
    const body = req.body as any
    const allowed = ['warehouseId', 'zoneId', 'supplierName', 'reference', 'receiptDate', 'notes']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    if (data.receiptDate) data.receiptDate = new Date(data.receiptDate)
    const item = await prisma.invReceipt.update({ where: { id }, data })
    return reply.send({ success: true, data: item })
  })

  // Confirm: changes status to 'received' and creates stock movements
  app.post('/:id/confirm', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const receipt = await prisma.invReceipt.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!receipt) return reply.code(404).send({ success: false, error: 'Receipt not found' })
    if (receipt.status !== 'draft') return reply.code(400).send({ success: false, error: `Receipt is already ${receipt.status}` })
    if (receipt.lines.length === 0) return reply.code(400).send({ success: false, error: 'Receipt has no lines' })

    // Create movement for each line
    for (const line of receipt.lines) {
      const qty = Number(line.expectedQty)
      if (qty <= 0) continue
      await createMovement({
        tenantId, userId,
        type: 'receipt',
        productId: line.productId,
        toWarehouseId: receipt.warehouseId,
        toZoneId: receipt.zoneId,
        lotId: line.lotId,
        quantity: qty,
        unitCost: line.unitCost ? Number(line.unitCost) : undefined,
        referenceType: 'receipt',
        referenceId: receipt.id,
        reference: receipt.number,
        notes: line.notes,
        date: receipt.receiptDate,
      })
      // Update received qty
      await prisma.invReceiptLine.update({
        where: { id: line.id },
        data: { receivedQty: qty, totalCost: line.unitCost ? qty * Number(line.unitCost) : null },
      })
    }

    const updated = await prisma.invReceipt.update({
      where: { id },
      data: { status: 'received', updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CONFIRM', module: 'inventory', entityType: 'InvReceipt', entityId: id, newValues: { status: 'received' } } })
    return reply.send({ success: true, data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.invReceipt.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status === 'received') return reply.code(400).send({ success: false, error: 'Cannot cancel a received receipt' })
    await prisma.invReceipt.update({ where: { id }, data: { status: 'cancelled', deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })

  // Lines management
  app.post('/:id/lines', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { productId, expectedQty, unitCost, lotId, notes } = req.body as any
    const receipt = await prisma.invReceipt.findFirst({ where: { id, tenantId } })
    if (!receipt || receipt.status !== 'draft') return reply.code(400).send({ success: false, error: 'Cannot add lines to non-draft receipt' })
    const line = await prisma.invReceiptLine.create({
      data: { tenantId, receiptId: id, productId, expectedQty, receivedQty: 0, unitCost, lotId, notes },
    })
    return reply.code(201).send({ success: true, data: line })
  })

  app.delete('/:id/lines/:lineId', async (req, reply) => {
    const { id, lineId } = req.params as any
    const { tenantId } = req as any
    const receipt = await prisma.invReceipt.findFirst({ where: { id, tenantId } })
    if (!receipt || receipt.status !== 'draft') return reply.code(400).send({ success: false, error: 'Cannot remove lines from non-draft receipt' })
    await prisma.invReceiptLine.delete({ where: { id: lineId } })
    return reply.send({ success: true })
  })
}
