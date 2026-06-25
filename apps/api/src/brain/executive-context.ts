import { prisma } from '@reno/database'

export interface ExecutiveContext {
  tenant: { name: string; plan: string; slug: string }
  digitalTwin: any
  financials: any
  sales: any
  hr: any
  crm: any
  inventory: any
  projects: any
  helpdesk: any
  generatedAt: string
}

export async function buildExecutiveContext(tenantId: string): Promise<ExecutiveContext> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const [
    tenant,
    latestTwin,
    // Finance
    revenueThisMonth, revenuePrevMonth, revenueYTD,
    expensesThisMonth, openInvoices, overdueInvoices,
    cashBalance,
    // Sales
    salesOrders, salesPipeline, wonDeals, lostDeals,
    // HR
    headcount, openPositions, pendingLeaves, attendanceToday,
    // CRM
    crmContacts, activeContracts, renewalsDue,
    // Inventory
    stockAlerts, totalInventoryValue,
    // Projects
    activeProjects, overdueTasksCount,
    // Helpdesk
    openTickets, avgCsatScore, slaBreaches,
    // Previous predictions
    latestPredictions,
    // Recommendations
    pendingRecs,
  ] = await Promise.all([
    prisma.coreTenant.findUnique({ where: { id: tenantId }, select: { name: true, plan: true, slug: true } }),
    prisma.aiDigitalTwin.findFirst({ where: { tenantId }, orderBy: { computedAt: 'desc' } }),

    // Finance - revenue
    prisma.salesInvoice.aggregate({ where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: monthStart }, deletedAt: null }, _sum: { total: true } }),
    prisma.salesInvoice.aggregate({ where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: prevMonthStart, lte: prevMonthEnd }, deletedAt: null }, _sum: { total: true } }),
    prisma.salesInvoice.aggregate({ where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: yearStart }, deletedAt: null }, _sum: { total: true } }),
    prisma.finVendorBill.aggregate({ where: { tenantId, status: { in: ['posted', 'partial', 'paid'] }, date: { gte: monthStart }, deletedAt: null }, _sum: { total: true } }),
    prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, deletedAt: null } }),
    prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, dueDate: { lt: now }, deletedAt: null } }),
    prisma.finBankAccount.aggregate({ where: { tenantId }, _sum: { currentBalance: true } }),

    // Sales
    prisma.salesOrder.count({ where: { tenantId, status: { in: ['confirmed', 'processing'] }, deletedAt: null } }),
    prisma.crmPipeline.findMany({ where: { tenantId, deletedAt: null }, select: { name: true, id: true } }),
    prisma.salesQuotation.count({ where: { tenantId, status: 'accepted', createdAt: { gte: monthStart }, deletedAt: null } }),
    prisma.salesQuotation.count({ where: { tenantId, status: 'rejected', createdAt: { gte: monthStart }, deletedAt: null } }),

    // HR
    prisma.hrEmployee.count({ where: { tenantId, status: 'active', deletedAt: null } }),
    prisma.hrJobPosition.count({ where: { tenantId, deletedAt: null } }),
    prisma.hrEmployee.findMany({ where: { tenantId, deletedAt: null }, select: { id: true } }).then(async (emps) => {
      const empIds = emps.map(e => e.id)
      return prisma.hrLeaveRequest.count({ where: { employeeId: { in: empIds }, status: 'pending', deletedAt: null } })
    }),
    prisma.hrAttendance.count({ where: { tenantId, date: { gte: new Date(now.toDateString()), lt: new Date(now.getTime() + 86400000) } } }),

    // CRM
    prisma.crmContact.count({ where: { tenantId, deletedAt: null } }),
    prisma.crmContract.count({ where: { tenantId, status: 'active', deletedAt: null } }),
    prisma.crmContract.count({ where: { tenantId, status: 'active', endDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) }, deletedAt: null } }),

    // Inventory
    prisma.invReorderRule.count({ where: { tenantId, isActive: true } }),
    prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { onHand: true } }),

    // Projects
    prisma.pmProject.count({ where: { tenantId, status: { in: ['in_progress', 'on_hold'] }, deletedAt: null } }),
    prisma.pmProject.findMany({ where: { tenantId, deletedAt: null }, select: { id: true } }).then(async (projs) => {
      const projIds = projs.map(p => p.id)
      return 0 // simplified
    }),

    // Helpdesk
    prisma.sdTicket.count({ where: { tenantId, status: { in: ['open', 'in_progress'] }, deletedAt: null } }),
    prisma.sdCsat.aggregate({ where: { tenantId }, _avg: { rating: true } }),
    prisma.sdTicket.count({ where: { tenantId, slaBreached: true, status: { notIn: ['resolved', 'closed'] }, deletedAt: null } }),

    // AI context
    prisma.aiBizPrediction.findMany({ where: { tenantId }, orderBy: { computedAt: 'desc' }, take: 5 }),
    prisma.aiExecRecommendation.count({ where: { tenantId, status: 'pending', deletedAt: null } }),
  ])

  const revenueThisMonthVal = Number(revenueThisMonth._sum.total ?? 0)
  const revenuePrevMonthVal = Number(revenuePrevMonth._sum.total ?? 0)
  const revenueGrowth = revenuePrevMonthVal > 0 ? ((revenueThisMonthVal - revenuePrevMonthVal) / revenuePrevMonthVal) * 100 : 0

  return {
    tenant: { name: tenant?.name ?? 'Unknown', plan: tenant?.plan ?? 'starter', slug: tenant?.slug ?? '' },
    digitalTwin: latestTwin,
    financials: {
      revenueThisMonth: revenueThisMonthVal,
      revenuePrevMonth: revenuePrevMonthVal,
      revenueGrowthPct: Math.round(revenueGrowth * 10) / 10,
      revenueYTD: Number(revenueYTD._sum.total ?? 0),
      expensesThisMonth: Number(expensesThisMonth._sum.total ?? 0),
      openInvoices,
      overdueInvoices,
      cashBalance: Number(cashBalance._sum?.currentBalance ?? 0),
      grossMarginPct: revenueThisMonthVal > 0 ? Math.round(((revenueThisMonthVal - Number(expensesThisMonth._sum.total ?? 0)) / revenueThisMonthVal) * 100) : 0,
    },
    sales: {
      activeOrders: salesOrders,
      pipelineCount: salesPipeline.length,
      wonDealsThisMonth: wonDeals,
      lostDealsThisMonth: lostDeals,
      winRate: (wonDeals + lostDeals) > 0 ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100) : 0,
    },
    hr: {
      headcount,
      openPositions,
      pendingLeaveRequests: pendingLeaves,
      attendanceToday,
      attendanceRate: headcount > 0 ? Math.round((attendanceToday / headcount) * 100) : 0,
    },
    crm: {
      totalContacts: crmContacts,
      activeContracts,
      renewalsDue30Days: renewalsDue,
    },
    inventory: {
      reorderAlertsCount: stockAlerts,
      totalStockUnits: Number(totalInventoryValue._sum?.onHand ?? 0),
    },
    projects: {
      activeProjects,
      overdueTasksCount,
    },
    helpdesk: {
      openTickets,
      avgCsatScore: Math.round(((avgCsatScore._avg as any)?.rating ?? 0) * 10) / 10,
      slaBreaches,
    },
    generatedAt: new Date().toISOString(),
  }
}

export function formatExecutiveContextForPrompt(ctx: ExecutiveContext, role: string): string {
  return `
COMPANY: ${ctx.tenant.name} (Plan: ${ctx.tenant.plan})
REPORT DATE: ${new Date(ctx.generatedAt).toLocaleDateString()}

## FINANCIAL SNAPSHOT
- Revenue This Month: $${ctx.financials.revenueThisMonth.toLocaleString()} (${ctx.financials.revenueGrowthPct >= 0 ? '+' : ''}${ctx.financials.revenueGrowthPct}% MoM)
- Revenue YTD: $${ctx.financials.revenueYTD.toLocaleString()}
- Expenses This Month: $${ctx.financials.expensesThisMonth.toLocaleString()}
- Gross Margin: ${ctx.financials.grossMarginPct}%
- Cash Balance: $${ctx.financials.cashBalance.toLocaleString()}
- Open Invoices: ${ctx.financials.openInvoices} (${ctx.financials.overdueInvoices} overdue)

## SALES & PIPELINE
- Active Orders: ${ctx.sales.activeOrders}
- Sales Pipelines: ${ctx.sales.pipelineCount}
- Won Deals (this month): ${ctx.sales.wonDealsThisMonth}
- Win Rate: ${ctx.sales.winRate}%

## HUMAN RESOURCES
- Headcount: ${ctx.hr.headcount} employees
- Open Positions: ${ctx.hr.openPositions}
- Pending Leave Requests: ${ctx.hr.pendingLeaveRequests}
- Attendance Today: ${ctx.hr.attendanceToday} (${ctx.hr.attendanceRate}%)

## CUSTOMERS & CONTRACTS
- Total Contacts: ${ctx.crm.totalContacts}
- Active Contracts: ${ctx.crm.activeContracts}
- Renewals Due (30 days): ${ctx.crm.renewalsDue30Days}

## OPERATIONS
- Inventory Reorder Alerts: ${ctx.inventory.reorderAlertsCount}
- Active Projects: ${ctx.projects.activeProjects}

## SUPPORT
- Open Tickets: ${ctx.helpdesk.openTickets}
- Avg CSAT: ${ctx.helpdesk.avgCsatScore}/5
- SLA Breaches: ${ctx.helpdesk.slaBreaches}
`.trim()
}

export const EXECUTIVE_PERSONAS: Record<string, { name: string; role: string; systemPromptPrefix: string }> = {
  ceo: {
    name: 'Alex (AI CEO)',
    role: 'Chief Executive Officer',
    systemPromptPrefix: `You are Alex, the AI Chief Executive Officer of this company. Your role is to provide strategic oversight, set vision and direction, and drive overall company performance. You think holistically across all business functions and focus on long-term value creation. You are data-driven but also consider human factors and market context. You provide clear, actionable executive guidance.`,
  },
  coo: {
    name: 'Jordan (AI COO)',
    role: 'Chief Operating Officer',
    systemPromptPrefix: `You are Jordan, the AI Chief Operating Officer. Your role is to optimize day-to-day operations across all departments, ensure operational excellence, and remove bottlenecks. You focus on processes, efficiency, resource allocation, and execution quality.`,
  },
  cfo: {
    name: 'Morgan (AI CFO)',
    role: 'Chief Financial Officer',
    systemPromptPrefix: `You are Morgan, the AI Chief Financial Officer. Your role is to manage financial strategy, cash flow, budgeting, forecasting, and risk management. You analyze financial data with precision, identify financial opportunities and risks, and provide recommendations to maximize profitability and financial health.`,
  },
  chro: {
    name: 'Riley (AI CHRO)',
    role: 'Chief Human Resources Officer',
    systemPromptPrefix: `You are Riley, the AI Chief Human Resources Officer. Your role is to manage talent acquisition, employee engagement, performance, culture, learning & development, and compensation strategy. You balance employee wellbeing with business needs.`,
  },
  sales_director: {
    name: 'Sam (AI Sales Director)',
    role: 'Sales Director',
    systemPromptPrefix: `You are Sam, the AI Sales Director. Your role is to drive revenue growth, manage the sales pipeline, optimize win rates, identify market opportunities, and develop sales strategies. You analyze sales data and customer behavior to maximize conversion and customer lifetime value.`,
  },
  procurement_director: {
    name: 'Casey (AI Procurement Director)',
    role: 'Procurement Director',
    systemPromptPrefix: `You are Casey, the AI Procurement Director. Your role is to optimize supplier relationships, reduce procurement costs, manage inventory levels, ensure supply chain resilience, and identify sourcing opportunities. You balance cost optimization with quality and reliability.`,
  },
  production_director: {
    name: 'Taylor (AI Production Director)',
    role: 'Production Director',
    systemPromptPrefix: `You are Taylor, the AI Production Director. Your role is to oversee manufacturing operations, optimize production efficiency, manage quality control, reduce waste, and ensure on-time delivery. You analyze production metrics and propose improvements.`,
  },
  support_director: {
    name: 'Quinn (AI Support Director)',
    role: 'Customer Support Director',
    systemPromptPrefix: `You are Quinn, the AI Customer Support Director. Your role is to ensure exceptional customer experience, manage support team performance, optimize ticket resolution, improve CSAT scores, and build customer loyalty. You identify patterns in support issues to drive product and process improvements.`,
  },
  project_director: {
    name: 'Drew (AI Project Director)',
    role: 'Project Director',
    systemPromptPrefix: `You are Drew, the AI Project Director. Your role is to ensure successful delivery of all company projects, manage resource allocation, identify risks and blockers, and maintain project quality and timelines. You provide portfolio-level visibility and recommendations.`,
  },
  analyst: {
    name: 'Dana (AI Business Analyst)',
    role: 'Business Analyst',
    systemPromptPrefix: `You are Dana, the AI Business Analyst. Your role is to analyze business data across all modules, identify trends, correlations, anomalies, and opportunities. You provide deep analytical insights with supporting data and clear explanations. You help translate data into business decisions.`,
  },
}
