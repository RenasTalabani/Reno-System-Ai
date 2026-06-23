import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { createMovement } from './movement.helper.js'

export async function invTransferRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    const [total, items] = await Promise.all([
      prisma.invTransfer.count({ where }),
      prisma.invTransfer.findMany({
        where, skip, take: Number(limit),
        include: {
          fromWarehouse: { select: { name: true, code: true } },
          toWarehouse: { select: { name: true, code: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { transferDate: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.invTransfer.count({ where: { tenantId } })
    const number = `TRF-${String(count + 1).padStart(5, '0')}`
    const transfer = await prisma.invTransfer.create({
      data: {
        tenantId, number,
        fromWarehouseId: body.fromWarehouseId,
        toWarehouseId: body.toWarehouseId,
        fromZoneId: body.fromZoneId,
        toZoneId: body.toZoneId,
        fromBinId: body.fromBinId,
        toBinId: body.toBinId,
        transferDate: body.transferDate ? new Date(body.transferDate) : new Date(),
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: (body.lines ?? []).map((l: any) => ({
            tenantId, productId: l.productId, quantity: l.quantity, lotId: l.lotId, serialId: l.serialId, notes: l.notes,
          })),
        },
      },
      include: { lines: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvTransfer', entityId: transfer.id, newValues: { number } } })
    return reply.code(201).send({ success: true, data: transfer })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.invTransfer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        lines: { include: { product: { select: { name: true, code: true, unit: { select: { symbol: true } } } } } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Transfer not found' })
    return reply.send({ success: true, data: item })
  })

  // Confirm → in_transit (reserves stock at source)
  app.post('/:id/confirm', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const transfer = await prisma.invTransfer.findFirst({ where: { id, tenantId, deletedAt: null }, include: { lines: true } })
    if (!transfer) return reply.code(404).send({ success: false, error: 'Not found' })
    if (transfer.status !== 'draft') return reply.code(400).send({ success: false, error: `Transfer is already ${transfer.status}` })
    if (transfer.lines.length === 0) return reply.code(400).send({ success: false, error: 'Transfer has no lines' })

    const updated = await prisma.invTransfer.update({ where: { id }, data: { status: 'in_transit', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CONFIRM', module: 'inventory', entityType: 'InvTransfer', entityId: id, newValues: { status: 'in_transit' } } })
    return reply.send({ success: true, data: updated })
  })

  // Receive → 'received' (creates movements, updates stock)
  app.post('/:id/receive', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const transfer = await prisma.invTransfer.findFirst({ where: { id, tenantId, deletedAt: null }, include: { lines: true } })
    if (!transfer) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['confirmed', 'in_transit'].includes(transfer.status)) {
      return reply.code(400).send({ success: false, error: `Transfer cannot be received in status: ${transfer.status}` })
    }

    for (const line of transfer.lines) {
      const qty = Number(line.quantity)
      if (qty <= 0) continue
      // Single movement: from_warehouse stock decrease, to_warehouse stock increase
      await createMovement({
        tenantId, userId,
        type: 'transfer_out',
        productId: line.productId,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        fromZoneId: transfer.fromZoneId,
        toZoneId: transfer.toZoneId,
        fromBinId: transfer.fromBinId,
        toBinId: transfer.toBinId,
        lotId: line.lotId,
        serialId: line.serialId,
        quantity: qty,
        referenceType: 'transfer',
        referenceId: transfer.id,
        reference: transfer.number,
        date: transfer.transferDate,
      })
    }

    const updated = await prisma.invTransfer.update({ where: { id }, data: { status: 'received', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'RECEIVE', module: 'inventory', entityType: 'InvTransfer', entityId: id, newValues: { status: 'received' } } })
    return reply.send({ success: true, data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.invTransfer.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (['received'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot cancel a completed transfer' })
    await prisma.invTransfer.update({ where: { id }, data: { status: 'cancelled', deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })
}
