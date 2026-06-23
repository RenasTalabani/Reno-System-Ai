import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { createMovement } from '../inventory/movement.helper.js'

export async function mfgOrderRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status, productId } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (productId) where.finishedProductId = productId
    const [total, items] = await Promise.all([
      prisma.mfgOrder.count({ where }),
      prisma.mfgOrder.findMany({
        where, skip, take: Number(limit),
        include: {
          finishedProduct: { select: { name: true, code: true } },
          bom: { select: { code: true, name: true } },
          _count: { select: { components: true, operations: true, qualityChecks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.mfgOrder.count({ where: { tenantId } })
    const number = `MO-${String(count + 1).padStart(5, '0')}`

    // If bomId provided, auto-populate components from BOM
    let components = body.components ?? []
    if (body.bomId && components.length === 0) {
      const bom = await prisma.mfgBomTemplate.findFirst({
        where: { id: body.bomId, tenantId },
        include: { lines: { where: { type: 'component', parentLineId: null } } },
      })
      if (bom) {
        const multiplier = Number(body.plannedQty) / Number(bom.quantity)
        components = bom.lines.map(l => ({
          componentId: l.componentId, unitId: l.unitId,
          plannedQty: Number(l.quantity) * multiplier * (1 + Number(l.scrapPercent) / 100),
          warehouseId: body.warehouseId,
        }))
      }
    }

    // If bomId with routing, auto-populate operations
    let operations = body.operations ?? []
    if (body.bomId && operations.length === 0) {
      const bom = await prisma.mfgBomTemplate.findFirst({
        where: { id: body.bomId, tenantId },
        include: { routing: { include: { operations: { orderBy: { sequence: 'asc' } } } } },
      })
      if (bom?.routing) {
        operations = bom.routing.operations.map(op => ({
          workCenterId: op.workCenterId, sequence: op.sequence,
          name: op.name, plannedHours: op.durationHours,
        }))
      }
    }

    const order = await prisma.mfgOrder.create({
      data: {
        tenantId, number, bomId: body.bomId,
        finishedProductId: body.finishedProductId,
        warehouseId: body.warehouseId,
        plannedQty: body.plannedQty, unitId: body.unitId,
        scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
        scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
        origin: body.origin ?? 'manual', originId: body.originId,
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        components: { create: components.map((c: any) => ({ tenantId, componentId: c.componentId, plannedQty: c.plannedQty, unitId: c.unitId, warehouseId: c.warehouseId ?? body.warehouseId })) },
        operations: { create: operations.map((op: any) => ({ tenantId, workCenterId: op.workCenterId, sequence: op.sequence ?? 0, name: op.name, plannedHours: op.plannedHours })) },
      },
      include: { components: true, operations: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'manufacturing', entityType: 'MfgOrder', entityId: order.id, newValues: { number, plannedQty: body.plannedQty } } })
    return reply.code(201).send({ success: true, data: order })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.mfgOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        finishedProduct: { select: { name: true, code: true, costPrice: true } },
        bom: { select: { code: true, name: true, version: true } },
        components: { include: { component: { select: { name: true, code: true } } }, orderBy: { createdAt: 'asc' } },
        operations: { include: { workCenter: { select: { name: true, code: true, costPerHour: true } } }, orderBy: { sequence: 'asc' } },
        qualityChecks: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Manufacturing order not found' })
    return reply.send({ success: true, data: item })
  })

  app.post('/:id/release', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.mfgOrder.findFirst({ where: { id, tenantId }, include: { components: true } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'draft') return reply.code(400).send({ success: false, error: `Order is already ${existing.status}` })
    if (existing.components.length === 0) return reply.code(400).send({ success: false, error: 'Order has no components' })
    const updated = await prisma.mfgOrder.update({ where: { id }, data: { status: 'released', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'RELEASE', module: 'manufacturing', entityType: 'MfgOrder', entityId: id, newValues: { status: 'released' } } })
    return reply.send({ success: true, data: updated })
  })

  app.post('/:id/start', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.mfgOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'released') return reply.code(400).send({ success: false, error: 'Order must be released before starting' })
    const updated = await prisma.mfgOrder.update({
      where: { id },
      data: { status: 'in_progress', actualStart: new Date(), updatedBy: userId },
    })
    // Start first operation
    await prisma.mfgOrderOperation.updateMany({
      where: { orderId: id, sequence: 0 },
      data: { status: 'in_progress', startedAt: new Date() },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'START', module: 'manufacturing', entityType: 'MfgOrder', entityId: id, newValues: { status: 'in_progress' } } })
    return reply.send({ success: true, data: updated })
  })

  // Consume components: issues inventory movements for all components
  app.post('/:id/consume', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.mfgOrder.findFirst({
      where: { id, tenantId },
      include: { components: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['released', 'in_progress'].includes(existing.status)) {
      return reply.code(400).send({ success: false, error: 'Order must be released or in progress to consume components' })
    }
    if (!existing.warehouseId) return reply.code(400).send({ success: false, error: 'Order must have a warehouse' })

    const movements: string[] = []
    for (const comp of existing.components) {
      const remaining = Number(comp.plannedQty) - Number(comp.consumedQty)
      if (remaining <= 0) continue
      const movement = await createMovement({
        tenantId, userId, type: 'issue',
        productId: comp.componentId,
        fromWarehouseId: comp.warehouseId ?? existing.warehouseId!,
        quantity: remaining,
        reference: existing.number, referenceType: 'mfg_order', referenceId: existing.id,
        notes: `Component consumption for MO ${existing.number}`,
      })
      await prisma.mfgOrderComponent.update({
        where: { id: comp.id },
        data: { consumedQty: Number(comp.plannedQty) },
      })
      movements.push(movement.id)
    }

    await prisma.mfgOrder.update({
      where: { id },
      data: { componentMoveRef: movements.join(','), updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CONSUME_COMPONENTS', module: 'manufacturing', entityType: 'MfgOrder', entityId: id, newValues: { movementsCreated: movements.length } } })
    return reply.send({ success: true, data: { movementsCreated: movements.length, movementIds: movements } })
  })

  // Post finished goods: creates receipt inventory movement for produced quantity
  app.post('/:id/produce', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { qty, lotId, notes } = req.body as any ?? {}
    const existing = await prisma.mfgOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['released', 'in_progress'].includes(existing.status)) {
      return reply.code(400).send({ success: false, error: 'Order must be released or in progress to record production' })
    }
    if (!existing.warehouseId) return reply.code(400).send({ success: false, error: 'Order must have a warehouse' })

    const producedQty = qty ? Number(qty) : Number(existing.plannedQty)
    const movement = await createMovement({
      tenantId, userId, type: 'receipt',
      productId: existing.finishedProductId,
      toWarehouseId: existing.warehouseId,
      quantity: producedQty,
      lotId, reference: existing.number,
      referenceType: 'mfg_order', referenceId: existing.id,
      notes: notes ?? `Finished goods from MO ${existing.number}`,
    })

    await prisma.mfgOrder.update({
      where: { id },
      data: { producedQty: Number(existing.producedQty) + producedQty, finishedMoveRef: movement.id, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'PRODUCE', module: 'manufacturing', entityType: 'MfgOrder', entityId: id, newValues: { producedQty, movementId: movement.id } } })
    return reply.send({ success: true, data: { movement, producedQty } })
  })

  app.post('/:id/complete', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { scrapQty = 0 } = req.body as any ?? {}
    const existing = await prisma.mfgOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['released', 'in_progress'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot complete order in current status' })
    const updated = await prisma.mfgOrder.update({
      where: { id },
      data: { status: 'completed', actualEnd: new Date(), scrapQty: Number(scrapQty), updatedBy: userId },
    })
    await prisma.mfgOrderOperation.updateMany({ where: { orderId: id, status: { not: 'completed' } }, data: { status: 'completed', completedAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'COMPLETE', module: 'manufacturing', entityType: 'MfgOrder', entityId: id, newValues: { status: 'completed', scrapQty } } })
    return reply.send({ success: true, data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.mfgOrder.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft', 'released'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot cancel an in-progress order' })
    await prisma.mfgOrder.update({ where: { id }, data: { status: 'cancelled', deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })
}
