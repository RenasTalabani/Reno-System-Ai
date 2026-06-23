import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invStockRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { warehouseId, productId, lowStock } = req.query as any
    const where: any = { tenantId }
    if (warehouseId) where.warehouseId = warehouseId
    if (productId) where.productId = productId

    const balances = await prisma.invStockBalance.findMany({
      where,
      include: {
        product: {
          select: { name: true, code: true, barcode: true, minStockLevel: true, unit: { select: { symbol: true } } },
        },
        warehouse: { select: { name: true, code: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    })

    const results = lowStock === 'true'
      ? balances.filter(b => b.product.minStockLevel != null && Number(b.onHand) < Number(b.product.minStockLevel))
      : balances

    const totalValue = results.reduce((s, b) => s + Number(b.totalValue ?? 0), 0)
    return reply.send({ success: true, data: results, meta: { totalValue } })
  })

  app.get('/alerts', async (req, reply) => {
    const { tenantId } = req as any
    const balances = await prisma.invStockBalance.findMany({
      where: { tenantId },
      include: {
        product: {
          select: { name: true, code: true, minStockLevel: true, reorderQty: true, leadTimeDays: true, unit: { select: { symbol: true } } },
        },
        warehouse: { select: { name: true, code: true } },
      },
    })

    const alerts = balances
      .filter(b => b.product.minStockLevel != null && Number(b.onHand) < Number(b.product.minStockLevel))
      .map(b => ({
        productId: b.productId,
        warehouseId: b.warehouseId,
        productCode: b.product.code,
        productName: b.product.name,
        warehouseName: b.warehouse.name,
        onHand: Number(b.onHand),
        available: Number(b.available),
        minStockLevel: Number(b.product.minStockLevel),
        reorderQty: b.product.reorderQty ? Number(b.product.reorderQty) : null,
        unitSymbol: b.product.unit?.symbol,
        severity: Number(b.onHand) <= 0 ? 'critical' : 'low',
      }))

    return reply.send({ success: true, data: alerts, meta: { total: alerts.length } })
  })

  app.get('/valuation', async (req, reply) => {
    const { tenantId } = req as any
    const { warehouseId } = req.query as any
    const where: any = { tenantId }
    if (warehouseId) where.warehouseId = warehouseId

    const [balances, byWarehouse] = await Promise.all([
      prisma.invStockBalance.aggregate({ where, _sum: { totalValue: true, onHand: true } }),
      prisma.invStockBalance.groupBy({
        by: ['warehouseId'],
        where,
        _sum: { totalValue: true, onHand: true },
      }),
    ])

    const warehouseIds = byWarehouse.map(b => b.warehouseId)
    const warehouses = await prisma.invWarehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: { id: true, name: true, code: true },
    })
    const whMap = new Map(warehouses.map(w => [w.id, w]))

    return reply.send({
      success: true,
      data: {
        totalValue: Number(balances._sum.totalValue ?? 0),
        totalOnHand: Number(balances._sum.onHand ?? 0),
        byWarehouse: byWarehouse.map(b => ({
          warehouse: whMap.get(b.warehouseId),
          totalValue: Number(b._sum.totalValue ?? 0),
          totalOnHand: Number(b._sum.onHand ?? 0),
        })),
      },
    })
  })

  app.get('/lots', async (req, reply) => {
    const { tenantId } = req as any
    const { productId, expiringIn } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (productId) where.productId = productId
    if (expiringIn) {
      const days = parseInt(expiringIn)
      where.expiryDate = { lte: new Date(Date.now() + days * 86400000), gte: new Date() }
    }
    const lots = await prisma.invLot.findMany({
      where,
      include: { product: { select: { name: true, code: true } } },
      orderBy: { expiryDate: 'asc' },
    })
    return reply.send({ success: true, data: lots })
  })
}
