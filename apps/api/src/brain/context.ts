import { prisma } from '@reno/database'

export interface BrainContext {
  tenant: { name: string; plan: string }
  modules: Record<string, any>
  generatedAt: string
}

// Build a cross-module context snapshot for a given agent's module permissions
export async function buildContext(tenantId: string, modules: string[]): Promise<BrainContext> {
  const [tenant, ...moduleData] = await Promise.all([
    prisma.coreTenant.findUnique({ where: { id: tenantId }, select: { name: true, plan: true } }),
    ...modules.map(m => fetchModuleContext(tenantId, m)),
  ])

  const moduleMap: Record<string, any> = {}
  modules.forEach((m, i) => { moduleMap[m] = moduleData[i] })

  return {
    tenant: { name: tenant?.name ?? 'Unknown', plan: tenant?.plan ?? 'starter' },
    modules: moduleMap,
    generatedAt: new Date().toISOString(),
  }
}

async function fetchModuleContext(tenantId: string, module: string): Promise<any> {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  switch (module) {
    case 'finance': {
      const [revenue, bills, openInvoices] = await Promise.all([
        prisma.salesInvoice.aggregate({
          where: { tenantId, status: { in: ['sent', 'partial', 'paid'] }, createdAt: { gte: thisMonthStart }, deletedAt: null },
          _sum: { total: true },
        }),
        prisma.finVendorBill.aggregate({
          where: { tenantId, status: { in: ['posted', 'partial', 'paid'] }, date: { gte: thisMonthStart }, deletedAt: null },
          _sum: { total: true },
        }),
        prisma.salesInvoice.count({ where: { tenantId, status: { in: ['sent', 'partial'] }, deletedAt: null } }),
      ])
      return {
        revenueThisMonth: Number(revenue._sum.total ?? 0),
        expensesThisMonth: Number(bills._sum.total ?? 0),
        openInvoicesCount: openInvoices,
      }
    }

    case 'sales': {
      const [openOrders, totalQuotations, closedThisMonth] = await Promise.all([
        prisma.salesOrder.count({ where: { tenantId, status: { in: ['confirmed', 'processing'] }, deletedAt: null } }),
        prisma.salesQuotation.count({ where: { tenantId, status: { in: ['draft', 'sent'] }, deletedAt: null } }),
        prisma.salesOrder.count({ where: { tenantId, status: { in: ['delivered', 'completed'] }, createdAt: { gte: thisMonthStart }, deletedAt: null } }),
      ])
      return { openOrders, openQuotations: totalQuotations, closedThisMonth }
    }

    case 'hr': {
      const [total, onLeave, newHires] = await Promise.all([
        prisma.hrEmployee.count({ where: { tenantId, status: 'active', deletedAt: null } }),
        prisma.hrEmployee.count({ where: { tenantId, status: 'on_leave', deletedAt: null } }),
        prisma.hrEmployee.count({ where: { tenantId, hireDate: { gte: thisMonthStart }, deletedAt: null } }),
      ])
      return { totalEmployees: total, onLeaveNow: onLeave, newHiresThisMonth: newHires }
    }

    case 'inventory': {
      const [stockValue, outOfStock, lowStock] = await Promise.all([
        prisma.invStockBalance.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
        prisma.invStockBalance.count({ where: { tenantId, onHand: { lte: 0 } } }),
        prisma.invStockBalance.count({ where: { tenantId, onHand: { gt: 0, lte: 10 } } }),
      ])
      return {
        totalStockValue: Number(stockValue._sum.totalValue ?? 0),
        outOfStockProducts: outOfStock,
        lowStockProducts: lowStock,
      }
    }

    case 'procurement': {
      const [openPOs, overdue] = await Promise.all([
        prisma.procOrder.count({ where: { tenantId, status: { in: ['submitted', 'approved', 'sent'] }, deletedAt: null } }),
        prisma.procOrder.count({ where: { tenantId, status: { in: ['approved', 'sent'] }, expectedDate: { lt: now }, deletedAt: null } }),
      ])
      return { openPurchaseOrders: openPOs, overdueDeliveries: overdue }
    }

    case 'manufacturing': {
      const [active, completed, failedQC] = await Promise.all([
        prisma.mfgOrder.count({ where: { tenantId, status: { in: ['released', 'in_progress'] }, deletedAt: null } }),
        prisma.mfgOrder.count({ where: { tenantId, status: 'completed', actualEnd: { gte: new Date(now.getTime() - 30 * 86400000) }, deletedAt: null } }),
        prisma.mfgQualityCheck.count({ where: { tenantId, status: 'failed', createdAt: { gte: new Date(now.getTime() - 7 * 86400000) }, deletedAt: null } }),
      ])
      return { activeMfgOrders: active, completedLast30d: completed, failedQCLast7d: failedQC }
    }

    case 'projects': {
      const [active, planning] = await Promise.all([
        prisma.pmProject.count({ where: { tenantId, status: 'active', deletedAt: null } }),
        prisma.pmProject.count({ where: { tenantId, status: 'planning', deletedAt: null } }),
      ])
      return { activeProjects: active, planningProjects: planning }
    }

    case 'analytics': {
      const health = await prisma.biCompanyHealthScore.findFirst({
        where: { tenantId },
        orderBy: { snapshotDate: 'desc' },
        select: { overallScore: true, aiTrend: true, aiRiskLevel: true },
      })
      return {
        healthScore: health ? Number(health.overallScore) : null,
        trend: health?.aiTrend ?? null,
        riskLevel: health?.aiRiskLevel ?? null,
      }
    }

    case 'crm': {
      const [contacts, companies, openDeals] = await Promise.all([
        prisma.crmContact.count({ where: { tenantId, deletedAt: null } }),
        prisma.crmCompany.count({ where: { tenantId, deletedAt: null } }),
        prisma.crmPipeline.count({ where: { tenantId, deletedAt: null } }),
      ])
      return { totalContacts: contacts, totalCompanies: companies, pipelines: openDeals }
    }

    default:
      return {}
  }
}

export function formatContextForPrompt(ctx: BrainContext): string {
  const lines = [
    `# Business Context — ${ctx.tenant.name}`,
    `Plan: ${ctx.tenant.plan} | Generated: ${new Date(ctx.generatedAt).toLocaleString()}`,
    '',
  ]

  for (const [module, data] of Object.entries(ctx.modules)) {
    lines.push(`## ${module.toUpperCase()}`)
    for (const [key, val] of Object.entries(data)) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
      lines.push(`- ${label}: ${val}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
