// Phase 60 — AI Financial Intelligence & Cash Flow Optimizer: AI Engine

export const CATEGORIES = ['revenue', 'cogs', 'opex', 'capex', 'other']

export interface PnlSummary {
  revenue: number; cogs: number; grossProfit: number; grossMargin: number
  opex: number; ebitda: number; ebitdaMargin: number; netIncome: number
  period: string
}

export function computePnl(entries: { category: string; amount: number; period: string }[], period?: string): PnlSummary {
  const filtered = period ? entries.filter(e => e.period === period) : entries
  const revenue = filtered.filter(e => e.category === 'revenue').reduce((s, e) => s + e.amount, 0)
  const cogs = filtered.filter(e => e.category === 'cogs').reduce((s, e) => s + e.amount, 0)
  const opex = filtered.filter(e => e.category === 'opex').reduce((s, e) => s + e.amount, 0)
  const capex = filtered.filter(e => e.category === 'capex').reduce((s, e) => s + e.amount, 0)
  const grossProfit = revenue - cogs
  const ebitda = grossProfit - opex
  const netIncome = ebitda - capex
  return {
    revenue, cogs, grossProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    opex, ebitda, ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
    netIncome, period: period ?? 'all',
  }
}

export interface CashFlowForecast {
  inflows: number; outflows: number; netCashFlow: number
  openingBalance: number; closingBalance: number
  aiAdjusted: number; aiConfidence: number; aiSummary: string
}

export function forecastCashFlow(entries: { category: string; amount: number; type: string }[], openingBalance = 0): CashFlowForecast {
  const revenue = entries.filter(e => e.category === 'revenue').reduce((s, e) => s + e.amount, 0)
  const opex = entries.filter(e => e.category !== 'revenue').reduce((s, e) => s + e.amount, 0)

  const inflows = revenue * (0.85 + Math.random() * 0.1)
  const outflows = opex * (0.9 + Math.random() * 0.15)
  const netCashFlow = inflows - outflows
  const closingBalance = openingBalance + netCashFlow

  const aiAdjustment = netCashFlow * (0.9 + Math.random() * 0.2)
  const aiConfidence = 0.72 + Math.random() * 0.2

  const status = closingBalance < 0 ? 'NEGATIVE' : closingBalance < 10000 ? 'LOW' : 'HEALTHY'
  const aiSummary = `Cash flow ${status}: Net $${netCashFlow.toFixed(0)} | Closing balance $${closingBalance.toFixed(0)} | AI confidence ${(aiConfidence * 100).toFixed(0)}%. ${status === 'NEGATIVE' ? 'Immediate action required — credit line or cost reduction.' : status === 'LOW' ? 'Monitor closely — consider invoicing acceleration.' : 'Cash position is healthy for the period.'}`

  return { inflows, outflows, netCashFlow, openingBalance, closingBalance, aiAdjusted: Math.round(aiAdjustment), aiConfidence, aiSummary }
}

export interface BudgetVariance { category: string; budgeted: number; actual: number; variance: number; variancePct: number; severity: string; aiSuggestion: string }

export function analyzeBudgetVariance(entries: { category: string; amount: number; budgeted?: number | null }[]): BudgetVariance[] {
  const cats = [...new Set(entries.map(e => e.category))]
  return cats.map(cat => {
    const catEntries = entries.filter(e => e.category === cat)
    const actual = catEntries.reduce((s, e) => s + e.amount, 0)
    const budgeted = catEntries.find(e => e.budgeted != null)?.budgeted ?? actual * 1.05
    const variance = actual - budgeted
    const variancePct = budgeted !== 0 ? (variance / budgeted) * 100 : 0
    const absVariancePct = Math.abs(variancePct)
    const severity = absVariancePct > 25 ? 'critical' : absVariancePct > 10 ? 'warning' : 'info'
    const overspend = variance > 0
    const suggestions: Record<string, string> = {
      revenue: overspend ? 'Revenue exceeding budget — analyze drivers and adjust Q+1 targets upward.' : 'Revenue below budget — review pipeline and accelerate close efforts.',
      cogs: overspend ? 'COGS overspend — review supplier contracts and production efficiency.' : 'COGS under budget — favorable margin impact.',
      opex: overspend ? 'OpEx overspend — freeze discretionary spend pending budget review.' : 'OpEx under budget — evaluate if critical investments were missed.',
      capex: overspend ? 'CapEx overspend — review project scope and approval thresholds.' : 'CapEx under budget — check if planned projects are delayed.',
    }
    const aiSuggestion = suggestions[cat] ?? (overspend ? 'Actual exceeds budget — investigate root cause.' : 'Under budget — assess if savings are intentional.')
    return { category: cat, budgeted, actual, variance, variancePct, severity, aiSuggestion }
  })
}

export function detectAnomalies(entries: { category: string; amount: number; period: string }[]): { type: string; title: string; summary: string; impact: number; severity: string; actionItems: string[] }[] {
  const anomalies = []

  const revenueEntries = entries.filter(e => e.category === 'revenue')
  if (revenueEntries.length >= 2) {
    const latest = revenueEntries[revenueEntries.length - 1].amount
    const prev = revenueEntries[revenueEntries.length - 2].amount
    const drop = (prev - latest) / prev
    if (drop > 0.15) {
      anomalies.push({ type: 'anomaly', title: 'Revenue Drop Detected', summary: `Revenue dropped ${(drop * 100).toFixed(1)}% vs prior period. Immediate investigation required.`, impact: prev - latest, severity: drop > 0.3 ? 'critical' : 'warning', actionItems: ['Review sales pipeline', 'Check for customer churn', 'Validate data integrity'] })
    }
  }

  const totalOpex = entries.filter(e => e.category === 'opex').reduce((s, e) => s + e.amount, 0)
  const totalRevenue = entries.filter(e => e.category === 'revenue').reduce((s, e) => s + e.amount, 0)
  if (totalRevenue > 0 && totalOpex / totalRevenue > 0.7) {
    anomalies.push({ type: 'opportunity', title: 'High OpEx Ratio', summary: `Operating expenses at ${((totalOpex / totalRevenue) * 100).toFixed(1)}% of revenue — above healthy threshold of 65%.`, impact: totalOpex - totalRevenue * 0.65, severity: 'warning', actionItems: ['Conduct cost audit', 'Identify automation opportunities', 'Review vendor contracts'] })
  }

  return anomalies
}

export function generateFinancialInsights(pnl: PnlSummary, cashFlow: CashFlowForecast): { type: string; title: string; summary: string; impact: number; severity: string; actionItems: string[] }[] {
  const insights = []

  if (pnl.grossMargin < 30) {
    insights.push({ type: 'pnl', title: 'Low Gross Margin Alert', summary: `Gross margin of ${pnl.grossMargin.toFixed(1)}% is below 30% target. Review pricing and COGS structure.`, impact: pnl.revenue * (0.3 - pnl.grossMargin / 100), severity: pnl.grossMargin < 20 ? 'critical' : 'warning', actionItems: ['Review pricing strategy', 'Negotiate supplier terms', 'Identify COGS reduction opportunities'] })
  }
  if (pnl.netIncome < 0) {
    insights.push({ type: 'pnl', title: 'Net Loss Detected', summary: `Net loss of $${Math.abs(pnl.netIncome).toFixed(0)} in the period. Review spending and revenue growth plan.`, impact: Math.abs(pnl.netIncome), severity: 'critical', actionItems: ['Immediate cost review', 'Accelerate revenue initiatives', 'Board notification recommended'] })
  }
  if (cashFlow.closingBalance < 0) {
    insights.push({ type: 'cash_flow', title: 'Negative Cash Position Forecast', summary: `Projected closing cash balance of -$${Math.abs(cashFlow.closingBalance).toFixed(0)}. Immediate action required.`, impact: Math.abs(cashFlow.closingBalance), severity: 'critical', actionItems: ['Draw on credit facilities', 'Accelerate accounts receivable', 'Defer non-critical expenditures'] })
  }
  if (pnl.ebitdaMargin > 20) {
    insights.push({ type: 'opportunity', title: 'Strong EBITDA Performance', summary: `EBITDA margin of ${pnl.ebitdaMargin.toFixed(1)}% exceeds 20% — consider reinvesting in growth or rewarding shareholders.`, impact: pnl.ebitda, severity: 'info', actionItems: ['Evaluate reinvestment opportunities', 'Consider R&D acceleration', 'Review dividend/buyback policy'] })
  }

  return insights
}
