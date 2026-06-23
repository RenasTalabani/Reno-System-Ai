import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function procDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const [
      totalSuppliers,
      totalOrders,
      openOrders,
      pendingApproval,
      pendingRequisitions,
      totalSpend30d,
      recentOrders,
      topSuppliers,
    ] = await Promise.all([
      prisma.procSupplier.count({ where: { tenantId, deletedAt: null, status: 'active' } }),
      prisma.procOrder.count({ where: { tenantId, deletedAt: null } }),
      prisma.procOrder.count({ where: { tenantId, deletedAt: null, status: { in: ['approved', 'sent', 'partially_received'] } } }),
      prisma.procOrder.count({ where: { tenantId, deletedAt: null, status: 'pending_approval' } }),
      prisma.procRequisition.count({ where: { tenantId, deletedAt: null, status: 'submitted' } }),
      prisma.procOrder.aggregate({
        where: { tenantId, deletedAt: null, createdAt: { gte: thirtyDaysAgo }, status: { not: 'cancelled' } },
        _sum: { totalAmount: true },
      }),
      prisma.procOrder.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          supplier: { select: { name: true, code: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.procOrder.groupBy({
        by: ['supplierId'],
        where: { tenantId, deletedAt: null, status: { not: 'cancelled' } },
        _sum: { totalAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
    ])

    const supplierIds = topSuppliers.map(s => s.supplierId)
    const supplierDetails = await prisma.procSupplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true, code: true, overallScore: true },
    })
    const supplierMap = new Map(supplierDetails.map(s => [s.id, s]))

    return reply.send({
      success: true,
      data: {
        kpis: {
          totalSuppliers,
          totalOrders,
          openOrders,
          pendingApproval,
          pendingRequisitions,
          totalSpend30d: Number(totalSpend30d._sum.totalAmount ?? 0),
        },
        recentOrders: recentOrders.map(o => ({
          id: o.id, number: o.number, status: o.status,
          supplierName: o.supplier.name, totalAmount: o.totalAmount,
          lineCount: o._count.lines, createdAt: o.createdAt,
        })),
        topSuppliers: topSuppliers.map(s => ({
          ...supplierMap.get(s.supplierId),
          totalSpend: Number(s._sum.totalAmount ?? 0),
          orderCount: s._count._all,
        })),
      },
    })
  })
}
