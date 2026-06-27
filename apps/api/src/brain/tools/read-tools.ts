import { prisma } from '@reno/database'

export async function readDashboardSummary(tenantId: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    revenue, openInvoices, totalEmployees, openProjects,
    openTickets, stockValue, openPOs, openOrders,
  ] = await Promise.all([
    prisma.salesInvoice.aggregate({
      where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: monthStart }, deletedAt: null },
      _sum: { total: true },
    }),
    prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, deletedAt: null } }),
    prisma.hrEmployee.count({ where: { tenantId, status: 'active', deletedAt: null } }),
    prisma.pmProject.count({ where: { tenantId, status: 'active', deletedAt: null } }),
    prisma.sdTicket.count({ where: { tenantId, status: { in: ['open', 'in_progress'] }, deletedAt: null } }),
    prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
    prisma.procOrder.count({ where: { tenantId, status: { in: ['submitted', 'approved', 'sent'] }, deletedAt: null } }),
    prisma.salesOrder.count({ where: { tenantId, status: { in: ['confirmed', 'processing'] }, deletedAt: null } }),
  ])

  return {
    period: `${monthStart.toISOString().slice(0, 7)}`,
    finance: {
      revenueThisMonth: Number(revenue._sum.total ?? 0),
      openInvoices,
    },
    hr: { activeEmployees: totalEmployees },
    projects: { activeProjects: openProjects },
    support: { openTickets },
    inventory: { totalStockValue: Number(stockValue._sum.totalValue ?? 0) },
    procurement: { openPurchaseOrders: openPOs },
    sales: { openOrders },
  }
}

export async function readCustomer(tenantId: string, identifier: string) {
  const [contacts, companies] = await Promise.all([
    prisma.crmContact.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { id: identifier },
          { email: { contains: identifier, mode: 'insensitive' } },
          { firstName: { contains: identifier, mode: 'insensitive' } },
          { lastName: { contains: identifier, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phone: true, jobTitle: true, status: true, createdAt: true,
      },
      take: 5,
    }),
    prisma.crmCompany.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { id: identifier },
          { name: { contains: identifier, mode: 'insensitive' } },
          { email: { contains: identifier, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, name: true, email: true, phone: true,
        website: true, industry: true, status: true, createdAt: true,
      },
      take: 5,
    }),
  ])

  if (contacts.length === 0 && companies.length === 0) {
    return { found: false, message: `No customer found matching "${identifier}"` }
  }

  return { found: true, contacts, companies }
}

export async function readEmployee(tenantId: string, identifier: string) {
  const employees = await prisma.hrEmployee.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { id: identifier },
        { workEmail: { contains: identifier, mode: 'insensitive' } },
        { firstName: { contains: identifier, mode: 'insensitive' } },
        { lastName: { contains: identifier, mode: 'insensitive' } },
        { employeeCode: { contains: identifier, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      phone: true,
      status: true,
      hireDate: true,
      employmentType: true,
      department: { select: { name: true } },
      positions: {
        where: { isCurrent: true },
        select: { position: { select: { title: true } } },
        take: 1,
      },
    },
    take: 5,
  })

  if (employees.length === 0) {
    return { found: false, message: `No employee found matching "${identifier}"` }
  }

  return {
    found: true,
    employees: employees.map(e => ({
      id: e.id,
      employeeCode: e.employeeCode,
      name: `${e.firstName} ${e.lastName}`,
      email: e.workEmail,
      phone: e.phone,
      jobTitle: e.positions[0]?.position?.title ?? null,
      department: e.department?.name ?? null,
      status: e.status,
      employmentType: e.employmentType,
      hireDate: e.hireDate,
    })),
  }
}

export async function readInvoice(tenantId: string, identifier: string) {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { id: identifier },
        { number: { contains: identifier, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, number: true, status: true,
      total: true, subtotal: true, taxTotal: true, amountDue: true,
      currency: true, issuedAt: true, dueDate: true, paidAt: true,
      notes: true, contactId: true, companyId: true,
      items: {
        select: { name: true, quantity: true, unitPrice: true, total: true },
        where: { deletedAt: null },
      },
    },
  })

  if (!invoice) {
    return { found: false, message: `No invoice found matching "${identifier}"` }
  }

  return {
    found: true,
    invoice: {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      notes: invoice.notes,
      total: Number(invoice.total),
      subtotal: Number(invoice.subtotal),
      taxTotal: Number(invoice.taxTotal),
      amountDue: Number(invoice.amountDue),
      items: invoice.items.map(l => ({
        name: l.name,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        total: Number(l.total),
      })),
    },
  }
}

export async function readInventoryStock(tenantId: string, query: string) {
  const stocks = await prisma.invStockBalance.findMany({
    where: {
      tenantId,
      product: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
        ],
      },
    },
    select: {
      onHand: true, reserved: true, available: true, totalValue: true,
      product: { select: { id: true, name: true, code: true, unit: { select: { name: true } } } },
      warehouse: { select: { name: true } },
    },
    take: 10,
  })

  if (stocks.length === 0) {
    return { found: false, message: `No products found matching "${query}"` }
  }

  return {
    found: true,
    results: stocks.map(s => ({
      product: s.product.name,
      code: s.product.code,
      unit: s.product.unit?.name ?? null,
      warehouse: s.warehouse.name,
      onHand: Number(s.onHand),
      reserved: Number(s.reserved),
      available: Number(s.available),
      totalValue: s.totalValue ? Number(s.totalValue) : null,
    })),
  }
}

export async function readProject(tenantId: string, identifier: string) {
  const project = await prisma.pmProject.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { id: identifier },
        { name: { contains: identifier, mode: 'insensitive' } },
        { code: { contains: identifier, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, name: true, code: true, status: true, priority: true,
      startDate: true, endDate: true, budget: true, currency: true,
      description: true, progress: true, actualEndDate: true,
      _count: { select: { tasks: true, members: true } },
    },
  })

  if (!project) {
    return { found: false, message: `No project found matching "${identifier}"` }
  }

  const [openTasks, doneTasks] = await Promise.all([
    prisma.pmTask.count({ where: { tenantId, projectId: project.id, status: { not: 'done' }, deletedAt: null } }),
    prisma.pmTask.count({ where: { tenantId, projectId: project.id, status: 'done', deletedAt: null } }),
  ])

  return {
    found: true,
    project: {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      priority: project.priority,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
      actualEndDate: project.actualEndDate,
      budget: project.budget ? Number(project.budget) : null,
      currency: project.currency,
      members: project._count.members,
      tasks: { total: project._count.tasks, open: openTasks, done: doneTasks },
    },
  }
}

export async function readTicket(tenantId: string, identifier: string) {
  const ticket = await prisma.sdTicket.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { id: identifier },
        { number: { contains: identifier, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, number: true, subject: true, description: true,
      priority: true, status: true, type: true,
      slaBreached: true, firstResponseDue: true, resolutionDue: true,
      resolvedAt: true, closedAt: true, createdAt: true, updatedAt: true,
      aiSentiment: true, aiSummary: true,
      comments: {
        where: { deletedAt: null },
        select: { content: true, isInternal: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  })

  if (!ticket) {
    return { found: false, message: `No ticket found matching "${identifier}"` }
  }

  return { found: true, ticket }
}

export async function generateReport(tenantId: string, reportType: string, period = 'this_month') {
  const now = new Date()
  const since = getPeriodStart(period, now)

  switch (reportType) {
    case 'revenue': {
      const [invoices, byStatus] = await Promise.all([
        prisma.salesInvoice.aggregate({
          where: { tenantId, createdAt: { gte: since }, deletedAt: null },
          _sum: { total: true, subtotal: true, taxTotal: true },
          _count: { id: true },
        }),
        prisma.salesInvoice.groupBy({
          by: ['status'],
          where: { tenantId, createdAt: { gte: since }, deletedAt: null },
          _sum: { total: true },
          _count: { id: true },
        }),
      ])
      return {
        reportType: 'revenue', period,
        since: since.toISOString(),
        totals: {
          invoiceCount: invoices._count.id,
          revenue: Number(invoices._sum.total ?? 0),
          subtotal: Number(invoices._sum.subtotal ?? 0),
          tax: Number(invoices._sum.taxTotal ?? 0),
        },
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id, total: Number(s._sum.total ?? 0) })),
      }
    }

    case 'hr_headcount': {
      const [total, byStatus, newHires] = await Promise.all([
        prisma.hrEmployee.count({ where: { tenantId, deletedAt: null } }),
        prisma.hrEmployee.groupBy({ by: ['status'], where: { tenantId, deletedAt: null }, _count: { id: true } }),
        prisma.hrEmployee.count({ where: { tenantId, hireDate: { gte: since }, deletedAt: null } }),
      ])
      return {
        reportType: 'hr_headcount', period,
        totals: { total, newHiresInPeriod: newHires },
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      }
    }

    case 'inventory': {
      const [balance, outOfStock, lowStock] = await Promise.all([
        prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true, onHand: true } }),
        prisma.invStockBalance.count({ where: { tenantId, onHand: { lte: 0 } } }),
        prisma.invStockBalance.count({ where: { tenantId, onHand: { gt: 0, lte: 10 } } }),
      ])
      return {
        reportType: 'inventory', period,
        totals: {
          totalStockValue: Number(balance._sum.totalValue ?? 0),
          totalUnitsOnHand: Number(balance._sum.onHand ?? 0),
          outOfStockProducts: outOfStock,
          lowStockProducts: lowStock,
        },
      }
    }

    case 'support': {
      const [total, byStatus, byPriority, slaBreached] = await Promise.all([
        prisma.sdTicket.count({ where: { tenantId, createdAt: { gte: since }, deletedAt: null } }),
        prisma.sdTicket.groupBy({ by: ['status'], where: { tenantId, createdAt: { gte: since }, deletedAt: null }, _count: { id: true } }),
        prisma.sdTicket.groupBy({ by: ['priority'], where: { tenantId, createdAt: { gte: since }, deletedAt: null }, _count: { id: true } }),
        prisma.sdTicket.count({ where: { tenantId, slaBreached: true, createdAt: { gte: since }, deletedAt: null } }),
      ])
      return {
        reportType: 'support', period,
        totals: { ticketsCreated: total, slaBreached },
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
        byPriority: byPriority.map(s => ({ priority: s.priority, count: s._count.id })),
      }
    }

    case 'projects': {
      const byStatus = await prisma.pmProject.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      })
      return {
        reportType: 'projects', period,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      }
    }

    case 'procurement': {
      const [byStatus, overdue] = await Promise.all([
        prisma.procOrder.groupBy({ by: ['status'], where: { tenantId, deletedAt: null }, _sum: { totalAmount: true }, _count: { id: true } }),
        prisma.procOrder.count({ where: { tenantId, status: { in: ['approved', 'sent'] }, expectedDate: { lt: now }, deletedAt: null } }),
      ])
      return {
        reportType: 'procurement', period,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id, total: Number(s._sum.totalAmount ?? 0) })),
        overdueDeliveries: overdue,
      }
    }

    default:
      return { error: `Unknown report type: ${reportType}` }
  }
}

function getPeriodStart(period: string, now: Date): Date {
  switch (period) {
    case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'this_week': {
      const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d
    }
    case 'this_month': return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'last_30_days': return new Date(now.getTime() - 30 * 86400000)
    case 'last_90_days': return new Date(now.getTime() - 90 * 86400000)
    case 'this_year': return new Date(now.getFullYear(), 0, 1)
    default: return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}
