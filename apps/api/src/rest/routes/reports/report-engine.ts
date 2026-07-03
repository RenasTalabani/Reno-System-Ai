// Phase 69 — Enterprise Reporting & BI Engine

export const BUILT_IN_DATA_SOURCES = [
  {
    key: 'finance',
    name: 'Finance & Revenue',
    module: 'finance',
    description: 'P&L, cash flow, budget utilization and accounting KPIs',
    fields: ['revenue', 'expenses', 'profit', 'cashFlow', 'budgetUtilization', 'arDays', 'apDays', 'grossMargin'],
    icon: '💰',
  },
  {
    key: 'hr',
    name: 'Human Resources',
    module: 'hr',
    description: 'Workforce analytics, turnover, hiring and satisfaction metrics',
    fields: ['headcount', 'turnoverRate', 'timeToHire', 'satisfactionScore', 'trainingCompletion', 'absenteeism', 'openRoles', 'avgTenure'],
    icon: '👥',
  },
  {
    key: 'sales',
    name: 'Sales & Pipeline',
    module: 'crm',
    description: 'Deal performance, quota attainment, pipeline health',
    fields: ['dealsClosed', 'conversionRate', 'avgDealSize', 'pipelineValue', 'quotaAttainment', 'salesCycleDays', 'winRate', 'churnRate'],
    icon: '📈',
  },
  {
    key: 'operations',
    name: 'Operations & Manufacturing',
    module: 'manufacturing',
    description: 'OEE, defect rates, delivery performance and capacity',
    fields: ['oeEfficiency', 'defectRate', 'onTimeDelivery', 'inventoryTurnover', 'productionCapacity', 'wastePercent', 'cycleTime', 'utilization'],
    icon: '🏭',
  },
  {
    key: 'platform',
    name: 'Platform Health',
    module: 'system',
    description: 'Uptime, latency, AI costs and system reliability metrics',
    fields: ['uptime', 'apiLatency', 'activeUsers', 'aiCostToday', 'errorRate', 'storageUsed', 'activeModules', 'avgResponseMs'],
    icon: '🖥️',
  },
  {
    key: 'marketing',
    name: 'Marketing & Growth',
    module: 'marketing',
    description: 'Campaign ROI, lead generation and customer acquisition costs',
    fields: ['leadsGenerated', 'cac', 'ltv', 'campaignROI', 'websiteTraffic', 'emailOpenRate', 'conversionRate', 'socialReach'],
    icon: '📣',
  },
]

export const BUILT_IN_REPORT_TEMPLATES = [
  {
    name: 'Executive Monthly Summary',
    description: 'High-level KPIs and trends for C-Suite monthly review',
    category: 'executive',
    isBuiltIn: true,
    sections: [
      { sectionType: 'kpi', title: 'Financial Highlights', dataSource: 'finance', sortOrder: 1, config: {} },
      { sectionType: 'chart', title: 'Revenue vs Expenses (12 months)', dataSource: 'finance', sortOrder: 2, config: { chartType: 'line' } },
      { sectionType: 'kpi', title: 'People & Workforce', dataSource: 'hr', sortOrder: 3, config: {} },
      { sectionType: 'table', title: 'Top Sales Opportunities', dataSource: 'sales', sortOrder: 4, config: {} },
      { sectionType: 'chart', title: 'Pipeline by Stage', dataSource: 'sales', sortOrder: 5, config: { chartType: 'bar' } },
      { sectionType: 'narrative', title: 'AI Executive Summary', sortOrder: 6, config: {} },
    ],
  },
  {
    name: 'Financial Performance Report',
    description: 'Detailed P&L, cash flow, budget variance and expense analysis',
    category: 'financial',
    isBuiltIn: true,
    sections: [
      { sectionType: 'kpi', title: 'Revenue & Profitability KPIs', dataSource: 'finance', sortOrder: 1, config: {} },
      { sectionType: 'chart', title: 'Monthly Revenue Trend', dataSource: 'finance', sortOrder: 2, config: { chartType: 'line' } },
      { sectionType: 'chart', title: 'Budget vs Actual', dataSource: 'finance', sortOrder: 3, config: { chartType: 'bar' } },
      { sectionType: 'table', title: 'Expense Breakdown by Cost Center', dataSource: 'finance', sortOrder: 4, config: {} },
      { sectionType: 'narrative', title: 'Financial AI Analysis', sortOrder: 5, config: {} },
    ],
  },
  {
    name: 'HR Workforce Analytics',
    description: 'People metrics, turnover analysis, talent pipeline and engagement',
    category: 'hr',
    isBuiltIn: true,
    sections: [
      { sectionType: 'kpi', title: 'Workforce KPIs', dataSource: 'hr', sortOrder: 1, config: {} },
      { sectionType: 'chart', title: 'Headcount Trend (12 months)', dataSource: 'hr', sortOrder: 2, config: { chartType: 'line' } },
      { sectionType: 'chart', title: 'Turnover by Department', dataSource: 'hr', sortOrder: 3, config: { chartType: 'bar' } },
      { sectionType: 'table', title: 'Department Summary', dataSource: 'hr', sortOrder: 4, config: {} },
      { sectionType: 'narrative', title: 'HR AI Insights', sortOrder: 5, config: {} },
    ],
  },
  {
    name: 'Sales Pipeline & Performance',
    description: 'Deal progress, quota tracking, conversion rates and forecasting',
    category: 'sales',
    isBuiltIn: true,
    sections: [
      { sectionType: 'kpi', title: 'Sales Performance KPIs', dataSource: 'sales', sortOrder: 1, config: {} },
      { sectionType: 'chart', title: 'Pipeline by Stage', dataSource: 'sales', sortOrder: 2, config: { chartType: 'funnel' } },
      { sectionType: 'chart', title: 'Monthly Closed Revenue', dataSource: 'sales', sortOrder: 3, config: { chartType: 'bar' } },
      { sectionType: 'table', title: 'Top 10 Active Opportunities', dataSource: 'sales', sortOrder: 4, config: {} },
      { sectionType: 'narrative', title: 'Sales AI Analysis', sortOrder: 5, config: {} },
    ],
  },
  {
    name: 'Platform Operations Report',
    description: 'System health, AI usage costs, uptime and performance SLAs',
    category: 'operations',
    isBuiltIn: true,
    sections: [
      { sectionType: 'kpi', title: 'Platform Health KPIs', dataSource: 'platform', sortOrder: 1, config: {} },
      { sectionType: 'chart', title: 'Uptime & Latency (30 days)', dataSource: 'platform', sortOrder: 2, config: { chartType: 'line' } },
      { sectionType: 'chart', title: 'AI Cost by Module', dataSource: 'platform', sortOrder: 3, config: { chartType: 'bar' } },
      { sectionType: 'table', title: 'Recent Incidents', dataSource: 'platform', sortOrder: 4, config: {} },
      { sectionType: 'narrative', title: 'Platform AI Summary', sortOrder: 5, config: {} },
    ],
  },
]

function rnd(min: number, max: number, decimals = 0): number {
  const v = Math.random() * (max - min) + min
  return decimals ? Math.round(v * 10 ** decimals) / 10 ** decimals : Math.round(v)
}

function randChange(): number {
  return Math.round((Math.random() * 20 - 5) * 10) / 10
}

const KPI_DATA: Record<string, Array<{ label: string; value: string; unit: string; change: number; trend: string }>> = {
  finance: [
    { label: 'Total Revenue', value: `$${rnd(2_400_000, 3_800_000).toLocaleString()}`, unit: 'USD', change: randChange(), trend: 'up' },
    { label: 'Net Profit', value: `$${rnd(480_000, 900_000).toLocaleString()}`, unit: 'USD', change: randChange(), trend: 'up' },
    { label: 'Gross Margin', value: `${rnd(38, 62)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Budget Utilization', value: `${rnd(72, 96)}%`, unit: '%', change: randChange(), trend: 'stable' },
    { label: 'Cash Flow', value: `$${rnd(200_000, 650_000).toLocaleString()}`, unit: 'USD', change: randChange(), trend: 'up' },
    { label: 'AR Days', value: `${rnd(22, 45)}`, unit: 'days', change: randChange(), trend: 'down' },
  ],
  hr: [
    { label: 'Total Headcount', value: `${rnd(180, 420)}`, unit: 'employees', change: randChange(), trend: 'up' },
    { label: 'Turnover Rate', value: `${rnd(6, 18)}%`, unit: '%', change: randChange(), trend: 'down' },
    { label: 'Time to Hire', value: `${rnd(18, 42)}`, unit: 'days', change: randChange(), trend: 'down' },
    { label: 'Satisfaction Score', value: `${rnd(70, 92)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Training Completion', value: `${rnd(68, 95)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Open Roles', value: `${rnd(4, 24)}`, unit: 'positions', change: randChange(), trend: 'stable' },
  ],
  sales: [
    { label: 'Deals Closed (MTD)', value: `${rnd(18, 56)}`, unit: 'deals', change: randChange(), trend: 'up' },
    { label: 'Pipeline Value', value: `$${rnd(1_200_000, 4_800_000).toLocaleString()}`, unit: 'USD', change: randChange(), trend: 'up' },
    { label: 'Conversion Rate', value: `${rnd(18, 38)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Avg Deal Size', value: `$${rnd(12_000, 85_000).toLocaleString()}`, unit: 'USD', change: randChange(), trend: 'up' },
    { label: 'Quota Attainment', value: `${rnd(72, 112)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Win Rate', value: `${rnd(28, 54)}%`, unit: '%', change: randChange(), trend: 'up' },
  ],
  operations: [
    { label: 'OEE', value: `${rnd(72, 94)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Defect Rate', value: `${rnd(1, 5, 1)}%`, unit: '%', change: randChange(), trend: 'down' },
    { label: 'On-Time Delivery', value: `${rnd(82, 97)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Inventory Turnover', value: `${rnd(4, 12)}x`, unit: 'turns/yr', change: randChange(), trend: 'up' },
    { label: 'Capacity Utilization', value: `${rnd(68, 92)}%`, unit: '%', change: randChange(), trend: 'stable' },
    { label: 'Cycle Time', value: `${rnd(2, 8)} hrs`, unit: 'hrs', change: randChange(), trend: 'down' },
  ],
  platform: [
    { label: 'Uptime', value: `${rnd(99, 100, 2)}%`, unit: '%', change: 0.1, trend: 'up' },
    { label: 'API Latency (p99)', value: `${rnd(60, 180)}ms`, unit: 'ms', change: randChange(), trend: 'down' },
    { label: 'Active Users (DAU)', value: `${rnd(42, 180)}`, unit: 'users', change: randChange(), trend: 'up' },
    { label: 'AI Cost Today', value: `$${rnd(12, 85, 2)}`, unit: 'USD', change: randChange(), trend: 'stable' },
    { label: 'Error Rate', value: `${rnd(0, 2, 2)}%`, unit: '%', change: randChange(), trend: 'down' },
    { label: 'Storage Used', value: `${rnd(12, 48)}GB`, unit: 'GB', change: randChange(), trend: 'up' },
  ],
  marketing: [
    { label: 'Leads Generated', value: `${rnd(120, 480)}`, unit: 'leads', change: randChange(), trend: 'up' },
    { label: 'CAC', value: `$${rnd(180, 620)}`, unit: 'USD', change: randChange(), trend: 'down' },
    { label: 'LTV', value: `$${rnd(2_400, 12_000).toLocaleString()}`, unit: 'USD', change: randChange(), trend: 'up' },
    { label: 'Campaign ROI', value: `${rnd(120, 380)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Email Open Rate', value: `${rnd(18, 38)}%`, unit: '%', change: randChange(), trend: 'up' },
    { label: 'Conversion Rate', value: `${rnd(2, 8, 1)}%`, unit: '%', change: randChange(), trend: 'up' },
  ],
}

function buildChartData(dataSource: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    .slice(0, 9)
  if (dataSource === 'finance') {
    return {
      labels: months,
      datasets: [
        { label: 'Revenue', data: months.map(() => rnd(180_000, 380_000)), color: '#6366f1' },
        { label: 'Expenses', data: months.map(() => rnd(100_000, 240_000)), color: '#ef4444' },
        { label: 'Profit', data: months.map(() => rnd(40_000, 140_000)), color: '#22c55e' },
      ],
    }
  }
  if (dataSource === 'hr') {
    return {
      labels: months,
      datasets: [
        { label: 'Headcount', data: months.map(() => rnd(200, 420)), color: '#6366f1' },
        { label: 'New Hires', data: months.map(() => rnd(2, 18)), color: '#22c55e' },
        { label: 'Exits', data: months.map(() => rnd(1, 10)), color: '#ef4444' },
      ],
    }
  }
  if (dataSource === 'sales') {
    return {
      labels: ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'],
      datasets: [{ label: 'Deals', data: [rnd(80, 200), rnd(40, 120), rnd(20, 70), rnd(10, 40), rnd(5, 20)], color: '#6366f1' }],
    }
  }
  if (dataSource === 'platform') {
    return {
      labels: months,
      datasets: [
        { label: 'Uptime %', data: months.map(() => rnd(98, 100, 2)), color: '#22c55e' },
        { label: 'Latency (ms)', data: months.map(() => rnd(60, 200)), color: '#f59e0b' },
      ],
    }
  }
  return {
    labels: months,
    datasets: [{ label: 'Metric', data: months.map(() => rnd(100, 500)), color: '#6366f1' }],
  }
}

function buildTableData(dataSource: string) {
  if (dataSource === 'sales') {
    return {
      headers: ['Opportunity', 'Stage', 'Value', 'Owner', 'Close Date', 'Probability'],
      rows: Array.from({ length: 8 }, (_, i) => ({
        opportunity: `Deal ${String.fromCharCode(65 + i)} — Enterprise Contract`,
        stage: ['Negotiation', 'Proposal', 'Qualified', 'Closed Won'][rnd(0, 3)],
        value: `$${rnd(15_000, 220_000).toLocaleString()}`,
        owner: ['A. Chen', 'M. Patel', 'S. Kim', 'J. Martinez'][rnd(0, 3)],
        closeDate: new Date(Date.now() + rnd(7, 60) * 86400000).toISOString().slice(0, 10),
        probability: `${rnd(20, 95)}%`,
      })),
    }
  }
  if (dataSource === 'finance') {
    return {
      headers: ['Cost Center', 'Budget', 'Actual', 'Variance', 'Utilization'],
      rows: ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR', 'G&A'].map(cc => {
        const budget = rnd(50_000, 300_000)
        const actual = rnd(40_000, budget + 20_000)
        return {
          costCenter: cc,
          budget: `$${budget.toLocaleString()}`,
          actual: `$${actual.toLocaleString()}`,
          variance: `${actual > budget ? '-' : '+'}$${Math.abs(budget - actual).toLocaleString()}`,
          utilization: `${Math.round((actual / budget) * 100)}%`,
        }
      }),
    }
  }
  if (dataSource === 'hr') {
    return {
      headers: ['Department', 'Headcount', 'New Hires', 'Exits', 'Turnover', 'Avg Tenure'],
      rows: ['Engineering', 'Sales', 'Marketing', 'Operations', 'HR', 'Finance'].map(dept => ({
        department: dept,
        headcount: `${rnd(12, 80)}`,
        newHires: `${rnd(0, 8)}`,
        exits: `${rnd(0, 4)}`,
        turnover: `${rnd(4, 22)}%`,
        avgTenure: `${rnd(1, 5, 1)} yrs`,
      })),
    }
  }
  if (dataSource === 'platform') {
    return {
      headers: ['Incident', 'Severity', 'Duration', 'Affected', 'Status', 'Date'],
      rows: Array.from({ length: 5 }, (_, i) => ({
        incident: `INC-${1000 + i} — ${['API Timeout', 'DB Slowdown', 'Auth Service Spike', 'Cache Miss', 'Queue Backlog'][i]}`,
        severity: ['P1', 'P2', 'P3', 'P2', 'P3'][i],
        duration: `${rnd(2, 45)} min`,
        affected: `${rnd(5, 120)} users`,
        status: ['Resolved', 'Resolved', 'Resolved', 'Monitoring', 'Resolved'][i],
        date: new Date(Date.now() - rnd(1, 30) * 86400000).toISOString().slice(0, 10),
      })),
    }
  }
  return {
    headers: ['Item', 'Value', 'Change', 'Status'],
    rows: Array.from({ length: 6 }, (_, i) => ({
      item: `Entry ${i + 1}`,
      value: `${rnd(100, 10000)}`,
      change: `${randChange()}%`,
      status: ['Active', 'Stable', 'Growing', 'Watch'][rnd(0, 3)],
    })),
  }
}

export function simulateSectionData(sectionType: string, dataSource: string, config: Record<string, unknown> = {}) {
  switch (sectionType) {
    case 'kpi':
      return { kpis: KPI_DATA[dataSource] ?? KPI_DATA['finance'], generatedAt: new Date().toISOString() }
    case 'chart':
      return { chart: buildChartData(dataSource), chartType: config.chartType ?? 'line', generatedAt: new Date().toISOString() }
    case 'table':
      return { table: buildTableData(dataSource), generatedAt: new Date().toISOString() }
    case 'text':
      return { content: config.content ?? 'Report section content placeholder.', generatedAt: new Date().toISOString() }
    case 'narrative':
      return { pending: true, message: 'Use POST /:id/ai-narrative to generate AI narrative.' }
    default:
      return { raw: {}, generatedAt: new Date().toISOString() }
  }
}

export function generateAiNarrative(reportName: string, sections: Array<{ sectionType: string; title?: string | null; dataSource?: string | null }>) {
  const dataSources = [...new Set(sections.map(s => s.dataSource).filter(Boolean))]
  const sectionCount = sections.length

  const narrativeTemplates = [
    `Based on the latest data across ${sectionCount} report sections covering ${dataSources.join(', ')}, ${reportName} reveals strong performance momentum with revenue trending above forecast. Key operational indicators show healthy margins while workforce metrics remain stable. The AI analysis identifies three priority areas for executive attention: pipeline acceleration in the mid-market segment, cost center optimization in G&A, and talent retention risk in the engineering division.`,
    `The ${reportName} analysis synthesizes insights from ${sectionCount} data dimensions. Overall business health scores in the 78th percentile for your industry peer group. Revenue recognition is ahead of plan by 8.3%, while operational efficiency gains of 12% YoY have contributed to margin expansion. Notable risk factors include rising customer acquisition costs and extended sales cycles in enterprise deals. Recommended actions: accelerate top-of-funnel pipeline generation and review pricing strategy for Q3.`,
    `Reno AI has analyzed all ${sectionCount} sections of ${reportName} and identified a positive performance trajectory. Financial indicators show consistent growth with improving unit economics. Human capital metrics indicate a stable workforce with manageable turnover rates. Sales pipeline coverage at 3.2x provides adequate buffer for quota achievement. Platform reliability remains excellent at 99.7% uptime. The primary risk vector is market concentration — 42% of revenue from top 3 accounts warrants strategic diversification focus.`,
  ]

  const narrative = narrativeTemplates[Math.floor(Math.random() * narrativeTemplates.length)]

  const insights = [
    { category: 'Financial', insight: `Revenue is ${rnd(5, 15)}% above forecast for the current period`, priority: 'high', confidence: rnd(82, 96) / 100 },
    { category: 'Operations', insight: `Operational efficiency improved by ${rnd(8, 18)}% YoY`, priority: 'medium', confidence: rnd(78, 94) / 100 },
    { category: 'People', insight: `Turnover risk elevated in ${['Engineering', 'Sales', 'Marketing'][rnd(0, 2)]} — recommend retention review`, priority: 'high', confidence: rnd(75, 92) / 100 },
    { category: 'Sales', insight: `Pipeline coverage at ${rnd(25, 40) / 10}x provides adequate Q${rnd(1, 4)} buffer`, priority: 'medium', confidence: rnd(80, 95) / 100 },
    { category: 'Risk', insight: `Revenue concentration risk: top 3 accounts represent ${rnd(35, 55)}% of ARR`, priority: 'high', confidence: rnd(88, 98) / 100 },
  ]

  return { narrative, keyInsights: insights, confidence: rnd(82, 95) / 100 }
}

export function simulateExport(format: string, reportName: string) {
  const sizes: Record<string, number> = { pdf: rnd(120, 480), excel: rnd(40, 180), csv: rnd(8, 45) }
  return {
    status: 'done',
    format,
    fileSizeKb: sizes[format] ?? 100,
    simulatedUrl: `/exports/${reportName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${format}`,
    exportedAt: new Date().toISOString(),
    processingMs: rnd(800, 3200),
  }
}
