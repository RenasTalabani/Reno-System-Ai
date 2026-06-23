import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalProducts,
      totalWarehouses,
      movementsToday,
      stockBalances,
      _unused,
      recentMovements,
    ] = await Promise.all([
      prisma.invProduct.count({ where: { tenantId, deletedAt: null, type: { not: 'service' } } }),
      prisma.invWarehouse.count({ where: { tenantId, deletedAt: null } }),
      prisma.invMovement.count({ where: { tenantId, date: { gte: todayStart }, deletedAt: null } }),
      prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
      Promise.resolve(0), // low stock count computed below after balance query
      prisma.invMovement.findMany({
        where: { tenantId, deletedAt: null },
        include: { product: { select: { name: true, code: true } } },
        orderBy: { date: 'desc' },
        take: 8,
      }),
    ])

    // low stock: products where any warehouse balance < minStockLevel
    const productsWithMin = await prisma.invProduct.findMany({
      where: { tenantId, deletedAt: null, minStockLevel: { not: null } },
      include: { stockBalances: { where: { tenantId } } },
    })
    const lowStock = productsWithMin.filter(p => {
      const totalOnHand = p.stockBalances.reduce((s, b) => s + Number(b.onHand), 0)
      return totalOnHand < Number(p.minStockLevel!)
    })

    const totalInventoryValue = Number(stockBalances._sum.totalValue ?? 0)

    return reply.send({
      success: true,
      data: {
        kpis: {
          totalProducts,
          totalWarehouses,
          movementsToday,
          totalInventoryValue,
          lowStockAlerts: lowStock.length,
        },
        lowStockItems: lowStock.slice(0, 5).map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          minStockLevel: p.minStockLevel,
          onHand: p.stockBalances.reduce((s, b) => s + Number(b.onHand), 0),
        })),
        recentMovements: recentMovements.map(m => ({
          id: m.id,
          number: m.number,
          type: m.type,
          productName: m.product.name,
          productCode: m.product.code,
          quantity: m.quantity,
          date: m.date,
        })),
      },
    })
  })
}
