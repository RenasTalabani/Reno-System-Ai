import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invWarehouseRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const items = await prisma.invWarehouse.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        _count: { select: { zones: true, stockBalances: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    return reply.send({ success: true, data: items })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { code, name, address, city, country, isDefault } = req.body as any
    if (isDefault) await prisma.invWarehouse.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } })
    const item = await prisma.invWarehouse.create({
      data: { tenantId, code, name, address, city, country, isDefault: isDefault ?? false, createdBy: userId, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvWarehouse', entityId: item.id, newValues: { code, name } } })
    return reply.code(201).send({ success: true, data: item })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.invWarehouse.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        zones: {
          where: { deletedAt: null },
          include: { bins: { where: { deletedAt: null } } },
          orderBy: { code: 'asc' },
        },
        _count: { select: { stockBalances: true } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Warehouse not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    if (body.isDefault) await prisma.invWarehouse.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } })
    const allowed = ['code', 'name', 'address', 'city', 'country', 'isDefault', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const item = await prisma.invWarehouse.update({ where: { id }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'inventory', entityType: 'InvWarehouse', entityId: id, newValues: data } })
    return reply.send({ success: true, data: item })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const hasStock = await prisma.invStockBalance.count({ where: { tenantId, warehouseId: id, onHand: { gt: 0 } } })
    if (hasStock > 0) return reply.code(400).send({ success: false, error: 'Warehouse has stock on hand' })
    await prisma.invWarehouse.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })

  // Zones
  app.get('/:id/zones', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const zones = await prisma.invWarehouseZone.findMany({
      where: { tenantId, warehouseId: id, deletedAt: null },
      include: { bins: { where: { deletedAt: null } } },
      orderBy: { code: 'asc' },
    })
    return reply.send({ success: true, data: zones })
  })

  app.post('/:id/zones', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { code, name, type } = req.body as any
    const zone = await prisma.invWarehouseZone.create({
      data: { tenantId, warehouseId: id, code, name, type: type ?? 'storage', createdBy: userId, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvWarehouseZone', entityId: zone.id, newValues: { code, name } } })
    return reply.code(201).send({ success: true, data: zone })
  })

  app.patch('/:id/zones/:zoneId', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { zoneId } = req.params as any
    const body = req.body as any
    const allowed = ['code', 'name', 'type', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const zone = await prisma.invWarehouseZone.update({ where: { id: zoneId }, data })
    return reply.send({ success: true, data: zone })
  })

  // Bins
  app.get('/:id/zones/:zoneId/bins', async (req, reply) => {
    const { tenantId } = req as any
    const { zoneId } = req.params as any
    const bins = await prisma.invBin.findMany({
      where: { tenantId, zoneId, deletedAt: null },
      orderBy: { code: 'asc' },
    })
    return reply.send({ success: true, data: bins })
  })

  app.post('/:id/zones/:zoneId/bins', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { zoneId } = req.params as any
    const { code, name, barcode, capacity } = req.body as any
    const bin = await prisma.invBin.create({
      data: { tenantId, zoneId, code, name, barcode, capacity, createdBy: userId, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvBin', entityId: bin.id, newValues: { code, name } } })
    return reply.code(201).send({ success: true, data: bin })
  })
}
