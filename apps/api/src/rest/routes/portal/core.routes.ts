import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function portalCoreRoutes(app: FastifyInstance) {
  // GET /portal/branding — tenant portal branding (public-ish, tenant resolved by subdomain/header)
  app.get('/branding', async (req, reply) => {
    const { tenantId } = req as any

    let branding = await prisma.portalBranding.findUnique({ where: { tenantId } })
    if (!branding) {
      const tenant = await prisma.coreTenant.findUnique({ where: { id: tenantId }, select: { name: true } })
      branding = {
        id: '',
        tenantId,
        portalName: `${tenant?.name ?? 'Company'} Portal`,
        logoUrl: null,
        faviconUrl: null,
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        accentColor: '#10b981',
        welcomeMessage: null,
        footerText: null,
        customDomain: null,
        isEnabled: true,
        employeePortalEnabled: true,
        customerPortalEnabled: true,
        supplierPortalEnabled: true,
        partnerPortalEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
    return reply.send({ success: true, data: branding })
  })

  // PATCH /portal/branding — update portal branding (admin only)
  app.patch('/branding', async (req, reply) => {
    const { tenantId } = req as any
    const body = req.body as any

    const branding = await prisma.portalBranding.upsert({
      where: { tenantId },
      create: { tenantId, ...body },
      update: body,
    })
    return reply.send({ success: true, data: branding })
  })

  // GET /portal/me — current user's portal profile
  app.get('/me', async (req, reply) => {
    const { tenantId, userId } = req as any

    const portalUser = await prisma.portalUser.findFirst({
      where: { tenantId, userId, isActive: true },
    })

    const user = await prisma.coreUser.findFirst({
      where: { id: userId },
      select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    })

    if (!portalUser) {
      return reply.send({ success: true, data: { user, portalUser: null, portalType: null } })
    }

    // Update last login
    await prisma.portalUser.update({
      where: { id: portalUser.id },
      data: { lastLoginAt: new Date() },
    })

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: portalUser.portalType, action: 'login', module: 'auth' },
    })

    return reply.send({ success: true, data: { user, portalUser, portalType: portalUser.portalType } })
  })

  // GET /portal/dashboard — unified dashboard data by portal type
  app.get('/dashboard', async (req, reply) => {
    const { tenantId, userId } = req as any

    const portalUser = await prisma.portalUser.findFirst({ where: { tenantId, userId, isActive: true } })
    if (!portalUser) return reply.code(403).send({ success: false, error: 'No portal access configured' })

    const [notifications, tickets, unreadNotifications] = await Promise.all([
      prisma.portalNotification.findMany({
        where: { tenantId, userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.portalTicket.count({ where: { tenantId, submittedBy: userId, status: { not: 'closed' }, deletedAt: null } }),
      prisma.portalNotification.count({ where: { tenantId, userId, isRead: false } }),
    ])

    const data: any = { portalType: portalUser.portalType, notifications, tickets, unreadNotifications }

    if (portalUser.portalType === 'employee' && portalUser.entityType === 'hr_employee') {
      const [leaveBalance, pendingLeave, recentPayslip] = await Promise.all([
        prisma.hrLeaveBalance.findMany({ where: { employeeId: portalUser.entityId } }).catch(() => []),
        prisma.hrLeaveRequest.count({ where: { employeeId: portalUser.entityId, status: 'pending' } }).catch(() => 0),
        prisma.hrPayslip.findFirst({ where: { employeeId: portalUser.entityId }, orderBy: { createdAt: 'desc' }, select: { id: true, month: true, year: true, netSalary: true, status: true, currency: true } }).catch(() => null),
      ])
      data.employee = { leaveBalance, pendingLeave, recentPayslip }
    }

    if (portalUser.portalType === 'customer' && portalUser.entityType === 'crm_contact') {
      const contact = await prisma.crmContact.findFirst({ where: { id: portalUser.entityId }, select: { id: true, companyId: true } }).catch(() => null)
      if (contact?.companyId) {
        const [overdueInvoices, recentOrders] = await Promise.all([
          prisma.salesInvoice.count({ where: { tenantId, status: 'overdue' } }).catch(() => 0),
          prisma.salesOrder.count({ where: { tenantId, status: { in: ['confirmed', 'shipped'] } } }).catch(() => 0),
        ])
        data.customer = { overdueInvoices, recentOrders }
      }
    }

    if (portalUser.portalType === 'supplier' && portalUser.entityType === 'proc_supplier') {
      const [pendingPos, openRfqs] = await Promise.all([
        prisma.procOrder.count({ where: { tenantId, supplierId: portalUser.entityId, status: 'sent' } }).catch(() => 0),
        prisma.procRfq.count({ where: { tenantId, suppliers: { some: { supplierId: portalUser.entityId } }, status: 'sent' } }).catch(() => 0),
      ])
      data.supplier = { pendingPos, openRfqs }
    }

    return reply.send({ success: true, data })
  })

  // GET /portal/users — list portal users (admin)
  app.get('/users', async (req, reply) => {
    const { tenantId } = req as any
    const { page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const [users, total] = await Promise.all([
      prisma.portalUser.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.portalUser.count({ where: { tenantId } }),
    ])

    return reply.send({ success: true, data: users, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /portal/users — create portal user (admin)
  app.post('/users', async (req, reply) => {
    const { tenantId, userId: adminId } = req as any
    const { userId, portalType, entityType, entityId } = req.body as any
    if (!userId || !portalType || !entityType || !entityId) {
      return reply.code(400).send({ success: false, error: 'userId, portalType, entityType, entityId required' })
    }

    const portalUser = await prisma.portalUser.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: { tenantId, userId, portalType, entityType, entityId, createdBy: adminId },
      update: { portalType, entityType, entityId, isActive: true },
    })

    return reply.code(201).send({ success: true, data: portalUser })
  })

  // GET /portal/audit — portal audit logs (admin)
  app.get('/audit', async (req, reply) => {
    const { tenantId } = req as any
    const { portalType, userId, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (portalType) where.portalType = portalType
    if (userId) where.userId = userId

    const [logs, total] = await Promise.all([
      prisma.portalAuditLog.findMany({ where, orderBy: { occurredAt: 'desc' }, skip, take: Number(limit) }),
      prisma.portalAuditLog.count({ where }),
    ])

    return reply.send({ success: true, data: logs, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })
}
