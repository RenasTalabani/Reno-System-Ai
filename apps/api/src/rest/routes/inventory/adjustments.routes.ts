import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { createMovement } from './movement.helper.js'

export async function invAdjustmentRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status, warehouseId } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (warehouseId) where.warehouseId = warehouseId
    const [total, items] = await Promise.all([
      prisma.invAdjustment.count({ where }),
      prisma.invAdjustment.findMany({
        where, skip, take: Number(limit),
        include: {
          warehouse: { select: { name: true, code: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { adjustmentDate: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.invAdjustment.count({ where: { tenantId } })
    const number = `ADJ-${String(count + 1).padStart(5, '0')}`

    // For each line, auto-compute systemQty from current stock balance
    const enrichedLines = await Promise.all(
      (body.lines ?? []).map(async (l: any) => {
        const balance = await prisma.invStockBalance.findUnique({
          where: { tenantId_productId_warehouseId: { tenantId, productId: l.productId, warehouseId: body.warehouseId } },
        })
        const systemQty = balance ? Number(balance.onHand) : 0
        const countedQty = Number(l.countedQty ?? 0)
        return { ...l, systemQty, difference: countedQty - systemQty }
      })
    )

    const adjustment = await prisma.invAdjustment.create({
      data: {
        tenantId, number,
        warehouseId: body.warehouseId,
        type: body.type ?? 'correction',
        reason: body.reason,
        adjustmentDate: body.adjustmentDate ? new Date(body.adjustmentDate) : new Date(),
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: enrichedLines.map((l: any) => ({
            tenantId, productId: l.productId,
            systemQty: l.systemQty, countedQty: l.countedQty, difference: l.difference,
            zoneId: l.zoneId, binId: l.binId, lotId: l.lotId, serialId: l.serialId,
            unitCost: l.unitCost, notes: l.notes,
          })),
        },
      },
      include: { lines: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvAdjustment', entityId: adjustment.id, newValues: { number } } })
    return reply.code(201).send({ success: true, data: adjustment })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.invAdjustment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        warehouse: true,
        lines: { include: { product: { select: { name: true, code: true, unit: { select: { symbol: true } } } } } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Adjustment not found' })
    return reply.send({ success: true, data: item })
  })

  // Confirm: applies adjustment movements to stock
  app.post('/:id/confirm', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const adjustment = await prisma.invAdjustment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!adjustment) return reply.code(404).send({ success: false, error: 'Adjustment not found' })
    if (adjustment.status !== 'draft') return reply.code(400).send({ success: false, error: `Adjustment is already ${adjustment.status}` })
    if (adjustment.lines.length === 0) return reply.code(400).send({ success: false, error: 'Adjustment has no lines' })

    for (const line of adjustment.lines) {
      const diff = Number(line.difference)
      if (diff === 0) continue
      const isPositive = diff > 0
      await createMovement({
        tenantId, userId,
        type: isPositive ? 'adjustment_in' : 'adjustment_out',
        productId: line.productId,
        toWarehouseId: isPositive ? adjustment.warehouseId : undefined,
        fromWarehouseId: !isPositive ? adjustment.warehouseId : undefined,
        fromZoneId: !isPositive ? line.zoneId : undefined,
        toZoneId: isPositive ? line.zoneId : undefined,
        fromBinId: !isPositive ? line.binId : undefined,
        toBinId: isPositive ? line.binId : undefined,
        lotId: line.lotId,
        quantity: Math.abs(diff),
        unitCost: line.unitCost ? Number(line.unitCost) : undefined,
        referenceType: 'adjustment',
        referenceId: adjustment.id,
        reference: adjustment.number,
        date: adjustment.adjustmentDate,
        notes: line.notes ?? adjustment.reason ?? undefined,
      })
    }

    const updated = await prisma.invAdjustment.update({ where: { id }, data: { status: 'confirmed', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CONFIRM', module: 'inventory', entityType: 'InvAdjustment', entityId: id, newValues: { status: 'confirmed' } } })
    return reply.send({ success: true, data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.invAdjustment.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status === 'confirmed') return reply.code(400).send({ success: false, error: 'Cannot cancel a confirmed adjustment' })
    await prisma.invAdjustment.update({ where: { id }, data: { status: 'cancelled', deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })
}
