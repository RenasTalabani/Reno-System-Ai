import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

// Compute net balance for an account from journal lines
async function getAccountBalance(tenantId: string, accountId: string, filters: { periodIds?: string[], fromDate?: Date, toDate?: Date }) {
  const where: any = { tenantId, accountId, deletedAt: null, journal: { status: 'posted', deletedAt: null } }
  if (filters.periodIds?.length) where.journal = { ...where.journal, periodId: { in: filters.periodIds } }
  if (filters.fromDate || filters.toDate) {
    where.journal = { ...where.journal, date: {} }
    if (filters.fromDate) where.journal.date.gte = filters.fromDate
    if (filters.toDate) where.journal.date.lte = filters.toDate
  }
  const agg = await prisma.finJournalLine.aggregate({ where, _sum: { debitBase: true, creditBase: true } })
  return { debit: Number(agg._sum.debitBase ?? 0), credit: Number(agg._sum.creditBase ?? 0) }
}

export async function finReportsRoutes(app: FastifyInstance) {
  // GET /reports/trial-balance
  app.get('/trial-balance', async (req, reply) => {
    const { tenantId } = req as any
    const { periodId, fromDate, toDate } = req.query as any

    const accounts = await prisma.finAccount.findMany({
      where: { tenantId, isDetail: true, deletedAt: null },
      orderBy: { code: 'asc' },
    })

    const filters: any = {}
    if (periodId) filters.periodIds = [periodId]
    if (fromDate) filters.fromDate = new Date(fromDate)
    if (toDate) filters.toDate = new Date(toDate)

    const rows = []
    let totalDebit = 0, totalCredit = 0
    for (const acc of accounts) {
      const bal = await getAccountBalance(tenantId, acc.id, filters)
      if (bal.debit === 0 && bal.credit === 0) continue
      const net = acc.normalBalance === 'debit' ? bal.debit - bal.credit : bal.credit - bal.debit
      rows.push({ code: acc.code, name: acc.name, type: acc.type, category: acc.category, normalBalance: acc.normalBalance, debit: bal.debit, credit: bal.credit, net })
      totalDebit += bal.debit
      totalCredit += bal.credit
    }

    return reply.send({
      success: true,
      data: {
        rows,
        totals: { debit: +totalDebit.toFixed(2), credit: +totalCredit.toFixed(2), balanced: Math.abs(totalDebit - totalCredit) < 0.01 },
      },
    })
  })

  // GET /reports/pl — Profit & Loss
  app.get('/pl', async (req, reply) => {
    const { tenantId } = req as any
    const { fromDate, toDate, periodId } = req.query as any
    const filters: any = {}
    if (periodId) filters.periodIds = [periodId]
    if (fromDate) filters.fromDate = new Date(fromDate)
    if (toDate) filters.toDate = new Date(toDate)

    const accounts = await prisma.finAccount.findMany({
      where: { tenantId, isDetail: true, type: { in: ['revenue', 'expense'] }, deletedAt: null },
      orderBy: { code: 'asc' },
    })

    const revenue: any[] = [], expenses: any[] = []
    let totalRevenue = 0, totalExpenses = 0

    for (const acc of accounts) {
      const bal = await getAccountBalance(tenantId, acc.id, filters)
      const net = acc.normalBalance === 'credit' ? bal.credit - bal.debit : bal.debit - bal.credit
      if (acc.type === 'revenue') { revenue.push({ code: acc.code, name: acc.name, category: acc.category, amount: +net.toFixed(2) }); totalRevenue += net }
      else { expenses.push({ code: acc.code, name: acc.name, category: acc.category, amount: +net.toFixed(2) }); totalExpenses += net }
    }

    const grossProfit = totalRevenue - expenses.filter(e => e.category === 'cost_of_goods_sold').reduce((s: number, e: any) => s + e.amount, 0)
    const netIncome = totalRevenue - totalExpenses

    return reply.send({
      success: true,
      data: {
        revenue, totalRevenue: +totalRevenue.toFixed(2),
        expenses, totalExpenses: +totalExpenses.toFixed(2),
        grossProfit: +grossProfit.toFixed(2),
        netIncome: +netIncome.toFixed(2),
        period: fromDate && toDate ? { from: fromDate, to: toDate } : null,
      },
    })
  })

  // GET /reports/balance-sheet
  app.get('/balance-sheet', async (req, reply) => {
    const { tenantId } = req as any
    const { asOf } = req.query as any
    const endDate = asOf ? new Date(asOf) : new Date()
    const filters = { toDate: endDate }

    const accounts = await prisma.finAccount.findMany({
      where: { tenantId, isDetail: true, type: { in: ['asset', 'liability', 'equity'] }, deletedAt: null },
      orderBy: { code: 'asc' },
    })

    const assets: any[] = [], liabilities: any[] = [], equity: any[] = []
    let totalAssets = 0, totalLiabilities = 0, totalEquity = 0

    for (const acc of accounts) {
      const bal = await getAccountBalance(tenantId, acc.id, filters)
      const net = acc.normalBalance === 'debit' ? bal.debit - bal.credit : bal.credit - bal.debit
      const row = { code: acc.code, name: acc.name, category: acc.category, amount: +net.toFixed(2) }
      if (acc.type === 'asset') { assets.push(row); totalAssets += net }
      else if (acc.type === 'liability') { liabilities.push(row); totalLiabilities += net }
      else { equity.push(row); totalEquity += net }
    }

    return reply.send({
      success: true,
      data: {
        asOf: endDate.toISOString().slice(0, 10),
        assets, totalAssets: +totalAssets.toFixed(2),
        liabilities, totalLiabilities: +totalLiabilities.toFixed(2),
        equity, totalEquity: +totalEquity.toFixed(2),
        liabilitiesAndEquity: +(totalLiabilities + totalEquity).toFixed(2),
        balanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
      },
    })
  })

  // GET /reports/cash-flow — Simple indirect method
  app.get('/cash-flow', async (req, reply) => {
    const { tenantId } = req as any
    const { fromDate, toDate } = req.query as any
    const filters: any = {}
    if (fromDate) filters.fromDate = new Date(fromDate)
    if (toDate) filters.toDate = new Date(toDate)

    // Cash & bank accounts (type = asset, isBankAccount = true)
    const cashAccounts = await prisma.finAccount.findMany({
      where: { tenantId, isDetail: true, isBankAccount: true, deletedAt: null },
    })

    let totalCashIn = 0, totalCashOut = 0
    const cashRows = []
    for (const acc of cashAccounts) {
      const bal = await getAccountBalance(tenantId, acc.id, filters)
      const netDebit = bal.debit - bal.credit
      cashRows.push({ code: acc.code, name: acc.name, inflow: +bal.debit.toFixed(2), outflow: +bal.credit.toFixed(2), net: +netDebit.toFixed(2) })
      totalCashIn += bal.debit
      totalCashOut += bal.credit
    }

    return reply.send({
      success: true,
      data: {
        period: { from: fromDate, to: toDate },
        cashAccounts: cashRows,
        totalCashIn: +totalCashIn.toFixed(2),
        totalCashOut: +totalCashOut.toFixed(2),
        netCashFlow: +(totalCashIn - totalCashOut).toFixed(2),
      },
    })
  })

  // GET /reports/ledger/:accountId — Account ledger / statement
  app.get('/ledger/:accountId', async (req, reply) => {
    const { tenantId } = req as any
    const { accountId } = req.params as any
    const { fromDate, toDate, limit = '100' } = req.query as any
    const take = Math.min(parseInt(limit), 500)

    const account = await prisma.finAccount.findFirst({ where: { id: accountId, tenantId, deletedAt: null } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const where: any = { tenantId, accountId, deletedAt: null, journal: { status: 'posted', deletedAt: null } }
    if (fromDate || toDate) {
      where.journal.date = {}
      if (fromDate) where.journal.date.gte = new Date(fromDate)
      if (toDate) where.journal.date.lte = new Date(toDate)
    }

    const lines = await prisma.finJournalLine.findMany({
      where, take,
      include: { journal: { select: { id: true, number: true, date: true, description: true, type: true } } },
      orderBy: { journal: { date: 'asc' } },
    })

    // Running balance
    let runningBalance = 0
    const rows = lines.map(l => {
      const debit = Number(l.debitBase)
      const credit = Number(l.creditBase)
      runningBalance += account.normalBalance === 'debit' ? debit - credit : credit - debit
      return { ...l, runningBalance: +runningBalance.toFixed(2) }
    })

    return reply.send({ success: true, data: { account, lines: rows } })
  })

  // GET /reports/budget-vs-actual — Budget comparison
  app.get('/budget-vs-actual', async (req, reply) => {
    const { tenantId } = req as any
    const { budgetId, periodId } = req.query as any
    if (!budgetId) return reply.code(400).send({ success: false, error: 'budgetId is required' })

    const lines = await prisma.finBudgetLine.findMany({
      where: { budgetId, tenantId, deletedAt: null, ...(periodId ? { periodId } : {}) },
      include: { account: { select: { id: true, code: true, name: true, type: true } }, period: { select: { id: true, name: true } } },
    })

    const rows = []
    for (const l of lines) {
      const bal = await getAccountBalance(tenantId, l.accountId, { periodIds: [l.periodId] })
      const actual = l.account.type === 'expense' ? bal.debit - bal.credit : bal.credit - bal.debit
      const variance = Number(l.amount) - actual
      rows.push({ account: l.account, period: l.period, budget: Number(l.amount), actual: +actual.toFixed(2), variance: +variance.toFixed(2), variancePct: Number(l.amount) > 0 ? +((variance / Number(l.amount)) * 100).toFixed(1) : 0 })
    }

    return reply.send({ success: true, data: rows })
  })
}
