import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invUnitRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const items = await prisma.invUnit.findMany({
      where: { tenantId, deletedAt: null },
      include: { baseUnit: { select: { name: true, symbol: true } }, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return reply.send({ success: true, data: items })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, symbol, type, isBase, baseUnitId, conversionFactor } = req.body as any
    const item = await prisma.invUnit.create({
      data: { tenantId, name, symbol, type: type ?? 'count', isBase: isBase ?? false, baseUnitId, conversionFactor: conversionFactor ?? 1, createdBy: userId, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvUnit', entityId: item.id, newValues: { name, symbol } } })
    return reply.code(201).send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name', 'symbol', 'type', 'isBase', 'baseUnitId', 'conversionFactor', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const item = await prisma.invUnit.update({ where: { id }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'inventory', entityType: 'InvUnit', entityId: id, newValues: data } })
    return reply.send({ success: true, data: item })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const inUse = await prisma.invProduct.count({ where: { unitId: id, deletedAt: null } })
    if (inUse > 0) return reply.code(400).send({ success: false, error: 'Unit is in use by products' })
    await prisma.invUnit.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'inventory', entityType: 'InvUnit', entityId: id, newValues: {} } })
    return reply.send({ success: true })
  })
}
