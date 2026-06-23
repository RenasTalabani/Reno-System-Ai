import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mfgDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const [
      totalOrders,
      activeOrders,
      completedOrders30d,
      totalWorkCenters,
      pendingQualityChecks,
      failedQualityChecks,
      recentOrders,
      workCenterHealth,
    ] = await Promise.all([
      prisma.mfgOrder.count({ where: { tenantId, deletedAt: null } }),
      prisma.mfgOrder.count({ where: { tenantId, deletedAt: null, status: { in: ['released', 'in_progress'] } } }),
      prisma.mfgOrder.count({ where: { tenantId, deletedAt: null, status: 'completed', actualEnd: { gte: thirtyDaysAgo } } }),
      prisma.mfgWorkCenter.count({ where: { tenantId, deletedAt: null, isActive: true } }),
      prisma.mfgQualityCheck.count({ where: { tenantId, deletedAt: null, status: 'pending' } }),
      prisma.mfgQualityCheck.count({ where: { tenantId, deletedAt: null, status: 'failed' } }),
      prisma.mfgOrder.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          finishedProduct: { select: { name: true, code: true } },
          _count: { select: { components: true, operations: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.mfgWorkCenter.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        select: {
          id: true, name: true, code: true, type: true,
          oeeActual: true, oeeTarget: true,
          aiDowntimeRisk: true, aiMaintenancePriority: true,
          nextMaintenanceAt: true,
          _count: { select: { orderOps: true } },
        },
        orderBy: { name: 'asc' },
        take: 8,
      }),
    ])

    // Maintenance alerts: work centers with nextMaintenanceAt in next 7 days
    const maintenanceDue = workCenterHealth.filter(w =>
      w.nextMaintenanceAt && new Date(w.nextMaintenanceAt) <= new Date(now.getTime() + 7 * 86400000)
    )

    return reply.send({
      success: true,
      data: {
        kpis: {
          totalOrders, activeOrders, completedOrders30d, totalWorkCenters,
          pendingQualityChecks, failedQualityChecks,
          maintenanceDueCount: maintenanceDue.length,
        },
        recentOrders: recentOrders.map(o => ({
          id: o.id, number: o.number, status: o.status,
          productName: o.finishedProduct.name, productCode: o.finishedProduct.code,
          plannedQty: o.plannedQty, producedQty: o.producedQty,
          scheduledEnd: o.scheduledEnd, componentCount: o._count.components,
        })),
        workCenterHealth: workCenterHealth.map(w => ({
          ...w,
          maintenanceDue: w.nextMaintenanceAt && new Date(w.nextMaintenanceAt) <= new Date(now.getTime() + 7 * 86400000),
        })),
        maintenanceDue,
      },
    })
  })
}
