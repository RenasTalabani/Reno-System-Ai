import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

async function getContactId(tenantId: string, userId: string): Promise<string | null> {
  const pu = await prisma.portalUser.findFirst({
    where: { tenantId, userId, portalType: 'customer', entityType: 'crm_contact', isActive: true },
  })
  return pu?.entityId ?? null
}

export async function portalCustomerRoutes(app: FastifyInstance) {
  // GET /portal/customer/dashboard — customer dashboard
  app.get('/dashboard', async (req, reply) => {
    const { tenantId, userId } = req as any

    // For demo: show tenant-level stats (in production this would be scoped to the customer's company)
    const [invoiceCount, orderCount, overdueCount] = await Promise.all([
      prisma.salesInvoice.count({ where: { tenantId, deletedAt: null } }).catch(() => 0),
      prisma.salesOrder.count({ where: { tenantId, deletedAt: null } }).catch(() => 0),
      prisma.salesInvoice.count({ where: { tenantId, status: 'overdue', deletedAt: null } }).catch(() => 0),
    ])

    const recentInvoices = await prisma.salesInvoice.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, number: true, status: true, total: true, currency: true, dueDate: true },
    }).catch(() => [])

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'customer', action: 'view_dashboard', module: 'customer' },
    })

    return reply.send({
      success: true,
      data: { invoiceCount, orderCount, overdueCount, recentInvoices },
    })
  })

  // GET /portal/customer/invoices — list invoices
  app.get('/invoices', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { status, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status

    const [invoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, number: true, status: true, total: true, currency: true,
          dueDate: true, issuedAt: true, paidAt: true, createdAt: true,
        },
      }),
      prisma.salesInvoice.count({ where }),
    ])

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'customer', action: 'view_invoices', module: 'invoices' },
    })

    return reply.send({ success: true, data: invoices, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /portal/customer/invoices/:id — invoice detail
  app.get('/invoices/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    })
    if (!invoice) return reply.code(404).send({ success: false, error: 'Invoice not found' })

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'customer', action: 'view_invoice', module: 'invoices', entityId: id },
    })

    return reply.send({ success: true, data: invoice })
  })

  // GET /portal/customer/orders — list sales orders
  app.get('/orders', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { status, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, number: true, status: true, total: true, currency: true,
          confirmedAt: true, shippedAt: true, createdAt: true,
        },
      }),
      prisma.salesOrder.count({ where }),
    ])

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'customer', action: 'view_orders', module: 'orders' },
    })

    return reply.send({ success: true, data: orders, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })
}
