// Phase 68 — Dashboard engine: widget definitions, templates, data simulation, AI recommendations

export const BUILT_IN_WIDGET_DEFINITIONS = [
  {
    key: 'kpi.total_revenue',
    name: 'Total Revenue',
    description: 'Current month total revenue from Finance module',
    category: 'kpi',
    chartType: 'number',
    dataSource: '/v1/finance/summary',
    defaultConfig: { period: 'current_month', currency: 'USD' },
    schema: { valueKey: 'totalRevenue', unit: 'currency', changeKey: 'revenueChange' },
  },
  {
    key: 'kpi.active_employees',
    name: 'Active Employees',
    description: 'Total active headcount from HR module',
    category: 'kpi',
    chartType: 'number',
    dataSource: '/v1/hr/summary',
    defaultConfig: { status: 'active' },
    schema: { valueKey: 'activeCount', unit: 'count', changeKey: 'headcountChange' },
  },
  {
    key: 'kpi.open_deals',
    name: 'Open CRM Deals',
    description: 'Number of active deals in CRM pipeline',
    category: 'kpi',
    chartType: 'number',
    dataSource: '/v1/crm/pipeline',
    defaultConfig: { status: 'open' },
    schema: { valueKey: 'openDeals', unit: 'count', changeKey: 'dealChange' },
  },
  {
    key: 'kpi.platform_health',
    name: 'Platform Health Score',
    description: 'Overall resilience score from Health Monitor',
    category: 'kpi',
    chartType: 'gauge',
    dataSource: '/v1/resilience/summary',
    defaultConfig: { maxScore: 100 },
    schema: { valueKey: 'overallScore', unit: 'score', minGood: 80 },
  },
  {
    key: 'kpi.ai_cost_today',
    name: 'AI Cost Today',
    description: 'LLMOps total spend today across all providers',
    category: 'kpi',
    chartType: 'number',
    dataSource: '/v1/llmops/cost',
    defaultConfig: { period: 'today' },
    schema: { valueKey: 'totalCostUsd', unit: 'currency' },
  },
  {
    key: 'chart.revenue_trend',
    name: 'Revenue Trend',
    description: 'Monthly revenue trend (line chart)',
    category: 'chart',
    chartType: 'line',
    dataSource: '/v1/finance/revenue-trend',
    defaultConfig: { months: 6, groupBy: 'month' },
    schema: { labelsKey: 'months', dataKey: 'revenue' },
  },
  {
    key: 'chart.sales_pipeline',
    name: 'Sales Pipeline Stages',
    description: 'Deal count by pipeline stage (bar chart)',
    category: 'chart',
    chartType: 'bar',
    dataSource: '/v1/sales/pipeline-stages',
    defaultConfig: { showValue: true },
    schema: { labelsKey: 'stages', dataKey: 'counts' },
  },
  {
    key: 'chart.hr_headcount',
    name: 'Headcount Over Time',
    description: 'Employee count by month (area chart)',
    category: 'chart',
    chartType: 'area',
    dataSource: '/v1/hr/headcount-trend',
    defaultConfig: { months: 6 },
    schema: { labelsKey: 'months', dataKey: 'headcount' },
  },
  {
    key: 'chart.expense_breakdown',
    name: 'Expense Breakdown',
    description: 'Expenses by category (pie chart)',
    category: 'chart',
    chartType: 'pie',
    dataSource: '/v1/finance/expenses',
    defaultConfig: { period: 'current_month' },
    schema: { labelsKey: 'categories', dataKey: 'amounts' },
  },
  {
    key: 'ai.executive_summary',
    name: 'AI Executive Summary',
    description: 'Reno Brain AI-generated business summary',
    category: 'ai',
    chartType: 'text',
    dataSource: '/v1/ei/dashboard',
    defaultConfig: { maxLength: 500 },
    schema: { contentKey: 'summary' },
  },
  {
    key: 'ai.risk_alerts',
    name: 'AI Risk Alerts',
    description: 'Top risks flagged by AI across all modules',
    category: 'ai',
    chartType: 'list',
    dataSource: '/v1/risk/summary',
    defaultConfig: { maxItems: 5, severity: 'high' },
    schema: { itemsKey: 'risks' },
  },
  {
    key: 'table.recent_platform_alerts',
    name: 'Platform Alerts',
    description: 'Recent unresolved platform health alerts',
    category: 'table',
    chartType: 'table',
    dataSource: '/v1/resilience/alerts',
    defaultConfig: { limit: 5, resolved: false },
    schema: { rowsKey: 'alerts', columns: ['component', 'severity', 'title', 'createdAt'] },
  },
]

export const BUILT_IN_TEMPLATES = [
  {
    name: 'CEO Executive Dashboard',
    description: 'High-level KPIs for executive leadership: revenue, headcount, health, AI summary',
    department: 'executive',
    icon: '👔',
    widgets: [
      { key: 'kpi.total_revenue', title: 'Total Revenue', x: 0, y: 0, w: 3, h: 2 },
      { key: 'kpi.active_employees', title: 'Headcount', x: 3, y: 0, w: 3, h: 2 },
      { key: 'kpi.open_deals', title: 'Open Deals', x: 6, y: 0, w: 3, h: 2 },
      { key: 'kpi.platform_health', title: 'Platform Health', x: 9, y: 0, w: 3, h: 2 },
      { key: 'chart.revenue_trend', title: 'Revenue Trend (6M)', x: 0, y: 2, w: 6, h: 4 },
      { key: 'ai.executive_summary', title: 'AI Executive Summary', x: 6, y: 2, w: 6, h: 4 },
    ],
  },
  {
    name: 'CFO Finance Dashboard',
    description: 'Revenue, expenses, pipeline value, and AI cost monitoring for finance teams',
    department: 'finance',
    icon: '💰',
    widgets: [
      { key: 'kpi.total_revenue', title: 'Monthly Revenue', x: 0, y: 0, w: 4, h: 2 },
      { key: 'kpi.ai_cost_today', title: "Today's AI Spend", x: 4, y: 0, w: 4, h: 2 },
      { key: 'kpi.open_deals', title: 'Pipeline Value', x: 8, y: 0, w: 4, h: 2 },
      { key: 'chart.revenue_trend', title: 'Revenue 6M Trend', x: 0, y: 2, w: 7, h: 4 },
      { key: 'chart.expense_breakdown', title: 'Expense Breakdown', x: 7, y: 2, w: 5, h: 4 },
    ],
  },
  {
    name: 'CHRO People Dashboard',
    description: 'Headcount, recruitment, and workforce trends for HR leadership',
    department: 'hr',
    icon: '👥',
    widgets: [
      { key: 'kpi.active_employees', title: 'Active Employees', x: 0, y: 0, w: 4, h: 2 },
      { key: 'chart.hr_headcount', title: 'Headcount Trend', x: 0, y: 2, w: 6, h: 4 },
      { key: 'ai.risk_alerts', title: 'HR Risk Signals', x: 6, y: 2, w: 6, h: 4 },
    ],
  },
  {
    name: 'COO Operations Dashboard',
    description: 'Platform health, resilience score, and operational performance',
    department: 'operations',
    icon: '⚙️',
    widgets: [
      { key: 'kpi.platform_health', title: 'Platform Resilience', x: 0, y: 0, w: 4, h: 2 },
      { key: 'kpi.ai_cost_today', title: 'AI Ops Cost', x: 4, y: 0, w: 4, h: 2 },
      { key: 'table.recent_platform_alerts', title: 'Active Alerts', x: 0, y: 2, w: 12, h: 4 },
    ],
  },
  {
    name: 'Sales Manager Dashboard',
    description: 'Pipeline stages, deal counts, and revenue metrics for sales teams',
    department: 'sales',
    icon: '📈',
    widgets: [
      { key: 'kpi.open_deals', title: 'Open Deals', x: 0, y: 0, w: 4, h: 2 },
      { key: 'kpi.total_revenue', title: 'Revenue MTD', x: 4, y: 0, w: 4, h: 2 },
      { key: 'chart.sales_pipeline', title: 'Pipeline Stages', x: 0, y: 2, w: 6, h: 4 },
      { key: 'chart.revenue_trend', title: 'Revenue Trend', x: 6, y: 2, w: 6, h: 4 },
    ],
  },
]

export function simulateWidgetData(
  key: string, category: string, chartType: string, _config: Record<string, unknown>
): Record<string, unknown> {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return months[d.getMonth()]
  })

  if (key === 'kpi.total_revenue') {
    const base = 1_150_000 + Math.floor(Math.random() * 200_000)
    return { type: 'kpi', label: 'Total Revenue', value: base, unit: 'USD', change: +(7 + Math.random() * 8).toFixed(1), trend: 'up', period: 'Current Month', sparkline: [950000, 1020000, 1080000, 1100000, 1140000, base] }
  }
  if (key === 'kpi.active_employees') {
    const base = 420 + Math.floor(Math.random() * 60)
    return { type: 'kpi', label: 'Active Employees', value: base, unit: 'people', change: +(1.5 + Math.random() * 3).toFixed(1), trend: 'up', period: 'Today', sparkline: [380, 392, 401, 410, 418, base] }
  }
  if (key === 'kpi.open_deals') {
    const base = 84 + Math.floor(Math.random() * 30)
    return { type: 'kpi', label: 'Open Deals', value: base, unit: 'deals', change: +(5 + Math.random() * 10).toFixed(1), trend: base > 90 ? 'up' : 'stable', period: 'Active Pipeline', sparkline: [65, 70, 78, 80, 82, base] }
  }
  if (key === 'kpi.platform_health') {
    const score = 80 + Math.round(Math.random() * 18)
    return { type: 'gauge', label: 'Platform Health', value: score, unit: 'score', maxValue: 100, thresholds: { good: 85, fair: 65 }, status: score >= 85 ? 'excellent' : score >= 65 ? 'good' : 'fair' }
  }
  if (key === 'kpi.ai_cost_today') {
    const cost = +(1.2 + Math.random() * 4.8).toFixed(2)
    return { type: 'kpi', label: "Today's AI Cost", value: cost, unit: 'USD', change: +(-5 + Math.random() * 15).toFixed(1), trend: cost > 4 ? 'up' : 'stable', period: 'Today' }
  }
  if (key === 'chart.revenue_trend') {
    const data = last6.map((_, i) => 900000 + i * 60000 + Math.floor(Math.random() * 50000))
    return { type: 'chart', chartType: 'line', title: 'Revenue Trend', labels: last6, datasets: [{ label: 'Revenue (USD)', data, borderColor: '#6366f1', fill: false }] }
  }
  if (key === 'chart.sales_pipeline') {
    return { type: 'chart', chartType: 'bar', title: 'Pipeline Stages', labels: ['Prospect', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'Closed Won'], datasets: [{ label: 'Deals', data: [45, 32, 24, 18, 12, 8], backgroundColor: '#6366f1' }] }
  }
  if (key === 'chart.hr_headcount') {
    const data = last6.map((_, i) => 380 + i * 8 + Math.floor(Math.random() * 10))
    return { type: 'chart', chartType: 'area', title: 'Headcount', labels: last6, datasets: [{ label: 'Employees', data, backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366f1' }] }
  }
  if (key === 'chart.expense_breakdown') {
    return { type: 'chart', chartType: 'pie', title: 'Expenses', labels: ['Salaries', 'Infrastructure', 'Marketing', 'Operations', 'AI/SaaS', 'Other'], datasets: [{ data: [55, 15, 12, 8, 6, 4], backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'] }] }
  }
  if (key === 'ai.executive_summary') {
    return { type: 'ai', label: 'AI Executive Summary', summary: 'Revenue is tracking 12.5% above last month. Headcount grew 3% with 6 new hires in Engineering. Platform resilience score is 94/100 — all services healthy. Two high-priority deals in negotiation representing $420K ARR. AI cost efficiency improved 8% via Reno Brain routing. Key risk: Q3 marketing budget 18% above forecast.', generatedAt: now.toISOString(), confidence: 0.91, module: 'Executive AI' }
  }
  if (key === 'ai.risk_alerts') {
    return { type: 'list', label: 'Risk Alerts', items: [{ title: 'Marketing Budget Overrun', severity: 'high', description: '18% over Q3 forecast', module: 'Finance' }, { title: 'Talent Gap: Engineering', severity: 'medium', description: '4 open senior roles >30 days', module: 'HR' }, { title: 'CRM Conversion Rate Drop', severity: 'medium', description: 'Demo-to-proposal rate fell 5%', module: 'CRM' }], count: 3 }
  }
  if (key === 'table.recent_platform_alerts') {
    return { type: 'table', label: 'Platform Alerts', columns: ['Component', 'Severity', 'Alert', 'Time'], rows: [['Storage', 'warning', 'Latency elevated 3x', '14m ago'], ['Redis', 'info', 'Hit rate below 85%', '1h ago']], count: 2 }
  }

  // Generic fallback for unknown keys
  if (category === 'kpi') return { type: 'kpi', label: 'Metric', value: Math.floor(Math.random() * 1000), unit: 'count', change: 0, trend: 'stable', period: 'Current' }
  if (category === 'chart') return { type: 'chart', chartType: chartType, title: 'Data', labels: last6, datasets: [{ label: 'Value', data: last6.map(() => Math.floor(Math.random() * 100)) }] }
  return { type: 'raw', data: {}, generatedAt: now.toISOString() }
}

interface WidgetSummary { definitionKey: string; count: number; categories: string[] }

export function generateAiRecommendations(
  dashboardName: string, widgetKeys: string[]
): Array<{ type: string; title: string; description: string; confidence: number }> {
  const recs: Array<{ type: string; title: string; description: string; confidence: number }> = []

  const hasRevenue = widgetKeys.includes('kpi.total_revenue')
  const hasRevenueTrend = widgetKeys.includes('chart.revenue_trend')
  const hasHealth = widgetKeys.includes('kpi.platform_health')
  const hasAlerts = widgetKeys.includes('table.recent_platform_alerts')
  const hasAiSummary = widgetKeys.includes('ai.executive_summary')
  const hasRisk = widgetKeys.includes('ai.risk_alerts')
  const hasPipeline = widgetKeys.includes('chart.sales_pipeline')

  if (hasRevenue && !hasRevenueTrend) recs.push({ type: 'widget', title: 'Add Revenue Trend Chart', description: 'You have the Revenue KPI but no trend chart. Adding a 6-month revenue trend gives temporal context to your headline number.', confidence: 0.92 })
  if (!hasHealth) recs.push({ type: 'widget', title: 'Add Platform Health Widget', description: 'Platform Health Score shows system resilience at a glance — critical for any operational or executive dashboard.', confidence: 0.87 })
  if (!hasAiSummary) recs.push({ type: 'widget', title: 'Add AI Executive Summary', description: 'Reno Brain can synthesize cross-module insights into a single paragraph. Saves 10+ minutes of morning reporting.', confidence: 0.85 })
  if (hasHealth && !hasAlerts) recs.push({ type: 'widget', title: 'Add Platform Alerts Table', description: 'You track platform health — complement it with the active alerts table for actionable context.', confidence: 0.80 })
  if (!hasRisk) recs.push({ type: 'widget', title: 'Add AI Risk Alerts', description: 'AI Risk Alerts aggregate high-priority signals from all modules. Recommended for executive and operations dashboards.', confidence: 0.78 })
  if (!hasPipeline && widgetKeys.some(k => k.includes('deal') || k.includes('sales'))) recs.push({ type: 'widget', title: 'Add Sales Pipeline Chart', description: 'You have sales KPIs. A pipeline stages chart shows exactly where deals are getting stuck.', confidence: 0.82 })

  if (widgetKeys.length > 8) recs.push({ type: 'layout', title: 'Dashboard is Dense — Split into Views', description: `You have ${widgetKeys.length} widgets on one dashboard. Consider splitting into "Executive Overview" and "Operations Detail" for clarity.`, confidence: 0.75 })
  if (widgetKeys.length === 0) recs.push({ type: 'widget', title: 'Start with a KPI Row', description: 'Begin with 4 KPI widgets across the top row: Revenue, Headcount, Open Deals, Platform Health. This is the foundation of any effective dashboard.', confidence: 0.95 })

  recs.push({ type: 'insight', title: 'Set Refresh Interval', description: 'KPI widgets refresh every page load. Configure auto-refresh (every 5 min) to keep real-time awareness without manual reload.', confidence: 0.70 })

  return recs.slice(0, 5)
}

export function buildTemplateWidgets(templateWidgets: Array<{
  key: string; title: string; x: number; y: number; w: number; h: number
}>) {
  return templateWidgets.map(w => ({
    definitionKey: w.key,
    title: w.title,
    x: w.x, y: w.y, w: w.w, h: w.h,
    config: {},
  }))
}
