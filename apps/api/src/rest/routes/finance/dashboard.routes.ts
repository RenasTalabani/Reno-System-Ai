import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [
      totalAccounts,
      openPeriod,
      totalVendors,
      totalJournals,
      postedJournals,
      draftJournals,
      apTotal,
      apOverdue,
      arTotal,
      arOverdue,
      billsThisMonth,
      recentJournals,
      topExpenseAccounts,
    ] = await Promise.all([
      prisma.finAccount.count({ where: { tenantId, deletedAt: null } }),
      prisma.finPeriod.findFirst({ where: { tenantId, status: 'open', deletedAt: null }, orderBy: { startDate: 'desc' } }),
      prisma.finVendor.count({ where: { tenantId, deletedAt: null, isActive: true } }),
      prisma.finJournalEntry.count({ where: { tenantId, deletedAt: null } }),
      prisma.finJournalEntry.count({ where: { tenantId, deletedAt: null, status: 'posted' } }),
      prisma.finJournalEntry.count({ where: { tenantId, deletedAt: null, status: 'draft' } }),
      prisma.finVendorBill.aggregate({ where: { tenantId, deletedAt: null, status: { in: ['posted','partial'] } }, _sum: { amountDue: true } }),
      prisma.finVendorBill.count({ where: { tenantId, deletedAt: null, status: { in: ['posted','partial'] }, dueDate: { lt: now } } }),
      // AR from Sales invoices
      prisma.salesInvoice.aggregate({ where: { tenantId, deletedAt: null, status: { in: ['sent','partial'] } }, _sum: { amountDue: true } }),
      prisma.salesInvoice.count({ where: { tenantId, deletedAt: null, status: { in: ['sent','partial'] }, dueDate: { lt: now } } }),
      prisma.finVendorBill.count({ where: { tenantId, deletedAt: null, date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.finJournalEntry.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, number: true, type: true, status: true, date: true, description: true },
      }),
      // Top expense accounts (sum of posted journal debits for expense type)
      prisma.finJournalLine.groupBy({
        by: ['accountId'],
        where: { tenantId, deletedAt: null, debitBase: { gt: 0 }, journal: { status: 'posted', date: { gte: startOfYear } } },
        _sum: { debitBase: true },
        orderBy: { _sum: { debitBase: 'desc' } },
        take: 5,
      }),
    ])

    // Enrich top expense accounts
    const expenseAccIds = topExpenseAccounts.map(e => e.accountId)
    const expenseAccNames = await prisma.finAccount.findMany({ where: { id: { in: expenseAccIds }, type: 'expense' }, select: { id: true, code: true, name: true } })
    const nameMap = Object.fromEntries(expenseAccNames.map(a => [a.id, `${a.code} - ${a.name}`]))

    return reply.send({
      success: true,
      data: {
        accounts: { total: totalAccounts },
        currentPeriod: openPeriod ? { name: openPeriod.name, status: openPeriod.status } : null,
        vendors: { total: totalVendors },
        journals: { total: totalJournals, posted: postedJournals, drafts: draftJournals },
        ap: { outstanding: Number(apTotal._sum.amountDue ?? 0), overdueCount: apOverdue, billsThisMonth },
        ar: { outstanding: Number(arTotal._sum.amountDue ?? 0), overdueCount: arOverdue },
        recentJournals,
        topExpenses: topExpenseAccounts
          .filter(e => nameMap[e.accountId])
          .map(e => ({ accountId: e.accountId, name: nameMap[e.accountId], amount: Number(e._sum.debitBase ?? 0) })),
      },
    })
  })
}
