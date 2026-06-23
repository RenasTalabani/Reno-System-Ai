import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

async function getSupplierId(tenantId: string, userId: string): Promise<string | null> {
  const pu = await prisma.portalUser.findFirst({
    where: { tenantId, userId, portalType: 'supplier', entityType: 'proc_supplier', isActive: true },
  })
  return pu?.entityId ?? null
}

export async function portalSupplierRoutes(app: FastifyInstance) {
  // GET /portal/supplier/dashboard — supplier dashboard
  app.get('/dashboard', async (req, reply) => {
    const { tenantId, userId } = req as any
    const supplierId = await getSupplierId(tenantId, userId)

    const poWhere = supplierId ? { tenantId, supplierId } : { tenantId }
    const rfqWhere = supplierId
      ? { tenantId, suppliers: { some: { supplierId } } }
      : { tenantId }

    const [pendingPos, sentRfqs, receivedPos] = await Promise.all([
      prisma.procOrder.count({ where: { ...poWhere, status: 'sent', deletedAt: null } }).catch(() => 0),
      prisma.procRfq.count({ where: { ...rfqWhere, status: 'sent', deletedAt: null } }).catch(() => 0),
      prisma.procOrder.count({ where: { ...poWhere, status: 'received', deletedAt: null } }).catch(() => 0),
    ])

    const recentOrders = await prisma.procOrder.findMany({
      where: { ...poWhere, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, number: true, status: true, totalAmount: true, currency: true, expectedDate: true },
    }).catch(() => [])

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'supplier', action: 'view_dashboard', module: 'supplier' },
    })

    return reply.send({ success: true, data: { pendingPos, sentRfqs, receivedPos, recentOrders } })
  })

  // GET /portal/supplier/orders — list purchase orders
  app.get('/orders', async (req, reply) => {
    const { tenantId, userId } = req as any
    const supplierId = await getSupplierId(tenantId, userId)
    const { status, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (supplierId) where.supplierId = supplierId
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.procOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: { id: true, number: true, status: true, totalAmount: true, currency: true, expectedDate: true, createdAt: true },
      }),
      prisma.procOrder.count({ where }),
    ])

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'supplier', action: 'view_orders', module: 'procurement' },
    })

    return reply.send({ success: true, data: orders, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /portal/supplier/orders/:id — PO detail
  app.get('/orders/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const order = await prisma.procOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!order) return reply.code(404).send({ success: false, error: 'Purchase order not found' })

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'supplier', action: 'view_po', module: 'procurement', entityId: id },
    })

    return reply.send({ success: true, data: order })
  })

  // GET /portal/supplier/rfqs — list RFQs for this supplier
  app.get('/rfqs', async (req, reply) => {
    const { tenantId, userId } = req as any
    const supplierId = await getSupplierId(tenantId, userId)
    const { page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (supplierId) where.suppliers = { some: { supplierId } }

    const [rfqs, total] = await Promise.all([
      prisma.procRfq.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: { id: true, number: true, status: true, currency: true, dueDate: true, createdAt: true },
      }),
      prisma.procRfq.count({ where }),
    ])

    return reply.send({ success: true, data: rfqs, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })
}
