import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invProductRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', search, categoryId, type } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }]
    if (categoryId) where.categoryId = categoryId
    if (type) where.type = type
    const [total, items] = await Promise.all([
      prisma.invProduct.count({ where }),
      prisma.invProduct.findMany({
        where, skip, take: Number(limit),
        include: {
          category: { select: { name: true } },
          unit: { select: { name: true, symbol: true } },
          stockBalances: { select: { warehouseId: true, onHand: true, available: true, totalValue: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const item = await prisma.invProduct.create({
      data: {
        tenantId,
        code: body.code,
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        unitId: body.unitId,
        type: body.type ?? 'storable',
        barcode: body.barcode,
        qrCode: body.qrCode,
        costPrice: body.costPrice,
        salePrice: body.salePrice,
        minStockLevel: body.minStockLevel,
        maxStockLevel: body.maxStockLevel,
        reorderQty: body.reorderQty,
        leadTimeDays: body.leadTimeDays,
        trackBatch: body.trackBatch ?? false,
        trackSerial: body.trackSerial ?? false,
        trackExpiry: body.trackExpiry ?? false,
        valuationMethod: body.valuationMethod ?? 'average',
        standardCost: body.standardCost,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvProduct', entityId: item.id, newValues: { code: item.code, name: item.name } } })
    return reply.code(201).send({ success: true, data: item })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.invProduct.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        unit: true,
        stockBalances: { include: { warehouse: { select: { name: true, code: true } } } },
        reorderRules: { include: { warehouse: { select: { name: true } } } },
        _count: { select: { movements: true, lots: true, serials: true } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Product not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name', 'description', 'categoryId', 'unitId', 'type', 'barcode', 'qrCode', 'costPrice', 'salePrice', 'minStockLevel', 'maxStockLevel', 'reorderQty', 'leadTimeDays', 'trackBatch', 'trackSerial', 'trackExpiry', 'valuationMethod', 'standardCost', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const item = await prisma.invProduct.update({ where: { id }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'inventory', entityType: 'InvProduct', entityId: id, newValues: data } })
    return reply.send({ success: true, data: item })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const hasMovements = await prisma.invMovement.count({ where: { productId: id, tenantId } })
    if (hasMovements > 0) return reply.code(400).send({ success: false, error: 'Product has movement history and cannot be deleted' })
    await prisma.invProduct.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'inventory', entityType: 'InvProduct', entityId: id, newValues: {} } })
    return reply.send({ success: true })
  })

  app.get('/:id/movements', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { page = '1', limit = '50', type } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, productId: id, deletedAt: null }
    if (type) where.type = type
    const [total, items] = await Promise.all([
      prisma.invMovement.count({ where }),
      prisma.invMovement.findMany({
        where, skip, take: Number(limit),
        include: {
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
          lot: { select: { number: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.get('/:id/stock', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const balances = await prisma.invStockBalance.findMany({
      where: { tenantId, productId: id },
      include: { warehouse: { select: { name: true, code: true } } },
    })
    const totalOnHand = balances.reduce((s, b) => s + Number(b.onHand), 0)
    const totalValue = balances.reduce((s, b) => s + Number(b.totalValue ?? 0), 0)
    return reply.send({ success: true, data: { balances, totalOnHand, totalValue } })
  })
}
