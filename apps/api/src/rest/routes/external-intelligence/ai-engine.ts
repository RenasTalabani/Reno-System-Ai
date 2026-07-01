// Phase 43 — AI External Intelligence Engine
// All analysis is performed by Reno Brain (local logic). Claude/OpenAI are OPTIONAL.

export interface Signal {
  id: string
  type: string
  title: string
  summary?: string | null
  value?: number | null
  unit?: string | null
  sentiment?: string | null
  relevance?: number | null
  tags: string[]
  signalDate: Date
}

export interface Goal {
  id: string
  title: string
  category: string
  type: string
  status: string
  progress: number
  targetDate?: Date | null
  successProb?: number | null
}

export interface SignalRelevance {
  signalId: string
  goalId: string
  goalTitle: string
  relevanceScore: number
  impactDirection: 'positive' | 'negative' | 'neutral'
  explanation: string
}

export interface MarketRiskAdjustment {
  goalId: string
  goalTitle: string
  baseSuccessProb: number
  adjustedSuccessProb: number
  adjustment: number
  drivers: string[]
}

export interface Threat {
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  goalIds: string[]
  signalId: string
}

export interface ExternalBriefing {
  marketOverview: string
  topRisks: string[]
  opportunities: string[]
  goalAdjustments: MarketRiskAdjustment[]
  executiveSummary: string
  recommendedActions: string[]
}

// ── Keyword maps ──────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sales:      ['sales', 'revenue', 'customer', 'market share', 'demand', 'consumer', 'retail', 'ecommerce'],
  growth:     ['growth', 'expansion', 'scale', 'branch', 'new market', 'acquisition', 'invest'],
  hiring:     ['hiring', 'talent', 'workforce', 'employee', 'labor', 'recruitment', 'salary', 'layoff'],
  cost:       ['cost', 'inflation', 'price', 'commodity', 'energy', 'shipping', 'freight', 'tariff', 'expense'],
  product:    ['product', 'innovation', 'technology', 'software', 'launch', 'feature', 'roadmap'],
  finance:    ['finance', 'currency', 'exchange rate', 'interest rate', 'funding', 'capital', 'credit'],
  health:     ['health', 'medical', 'wellness', 'fitness', 'insurance'],
  learning:   ['learning', 'training', 'education', 'certification', 'skill', 'course'],
  regulation: ['regulation', 'law', 'compliance', 'policy', 'government', 'tax', 'legal', 'sanction'],
}

const TYPE_CATEGORY_MAP: Record<string, string[]> = {
  currency:    ['finance', 'cost'],
  commodity:   ['cost', 'product'],
  news:        ['sales', 'growth', 'regulation'],
  regulation:  ['regulation'],
  economic:    ['sales', 'finance', 'cost'],
  competitor:  ['sales', 'growth', 'product'],
  security:    [],
  shipping:    ['cost'],
  energy:      ['cost'],
}

// ── Relevance scoring ─────────────────────────────────────────────────────────

export function scoreSignalRelevance(signal: Signal, goal: Goal): number {
  let score = 0

  // Signal type → goal category match
  const signalCategories = TYPE_CATEGORY_MAP[signal.type] ?? []
  if (signalCategories.includes(goal.category)) score += 0.35

  // Keyword match in title/summary
  const text = `${signal.title} ${signal.summary ?? ''}`.toLowerCase()
  const goalKeywords = CATEGORY_KEYWORDS[goal.category] ?? []
  for (const kw of goalKeywords) {
    if (text.includes(kw)) { score += 0.1; break }
  }

  // Tag match
  for (const tag of signal.tags) {
    if (tag.toLowerCase() === goal.category) score += 0.15
    if (tag.toLowerCase() === goal.type) score += 0.1
  }

  // Negative sentiment on active goal = higher relevance (risk)
  if (signal.sentiment === 'negative' && goal.status === 'active') score += 0.1
  if (signal.sentiment === 'positive' && goal.status === 'active') score += 0.05

  return Math.min(1, score)
}

export function analyseSignalRelevance(signal: Signal, goals: Goal[]): SignalRelevance[] {
  const results: SignalRelevance[] = []
  for (const goal of goals) {
    const relevanceScore = scoreSignalRelevance(signal, goal)
    if (relevanceScore < 0.2) continue

    const impactDirection = determineImpact(signal, goal)
    results.push({
      signalId: signal.id,
      goalId: goal.id,
      goalTitle: goal.title,
      relevanceScore,
      impactDirection,
      explanation: buildExplanation(signal, goal, impactDirection),
    })
  }
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

function determineImpact(signal: Signal, goal: Goal): 'positive' | 'negative' | 'neutral' {
  if (signal.sentiment === 'positive') return 'positive'
  if (signal.sentiment === 'negative') return 'negative'
  // Value-based signals (currency, commodity, economic)
  if (signal.type === 'currency' || signal.type === 'commodity' || signal.type === 'energy' || signal.type === 'shipping') {
    if (goal.category === 'cost') return signal.value && signal.value > 0 ? 'negative' : 'positive'
    if (goal.category === 'finance') return 'neutral'
  }
  return 'neutral'
}

function buildExplanation(signal: Signal, goal: Goal, direction: string): string {
  const dir = direction === 'positive' ? 'positively' : direction === 'negative' ? 'negatively' : 'neutrally'
  const valueStr = signal.value != null ? ` (${signal.value} ${signal.unit ?? ''})` : ''
  return `"${signal.title}"${valueStr} may affect your "${goal.title}" goal ${dir}. Monitor and adjust KPIs if trend continues.`
}

// ── Market risk adjustment ────────────────────────────────────────────────────

export function adjustGoalSuccessProb(goal: Goal, signals: Signal[]): MarketRiskAdjustment {
  const baseSuccessProb = goal.successProb ?? 0.7
  let adjustment = 0
  const drivers: string[] = []

  for (const signal of signals) {
    const relevance = scoreSignalRelevance(signal, goal)
    if (relevance < 0.2) continue

    const direction = determineImpact(signal, goal)
    const weight = relevance * 0.15

    if (direction === 'positive') {
      adjustment += weight
      drivers.push(`↑ ${signal.title} (positive market signal)`)
    } else if (direction === 'negative') {
      adjustment -= weight
      drivers.push(`↓ ${signal.title} (negative market signal)`)
    }
  }

  const adjusted = Math.max(0, Math.min(1, baseSuccessProb + adjustment))
  return {
    goalId: goal.id,
    goalTitle: goal.title,
    baseSuccessProb,
    adjustedSuccessProb: adjusted,
    adjustment: Math.round(adjustment * 100),
    drivers: drivers.slice(0, 5),
  }
}

// ── Threat detection ──────────────────────────────────────────────────────────

export function detectThreats(signal: Signal, goals: Goal[]): Threat[] {
  const threats: Threat[] = []
  const text = `${signal.title} ${signal.summary ?? ''}`.toLowerCase()

  // Critical threat patterns
  const CRITICAL_KEYWORDS = ['crash', 'collapse', 'bankruptcy', 'crisis', 'emergency', 'sanction', 'ban', 'shutdown']
  const HIGH_KEYWORDS = ['recession', 'downturn', 'shortage', 'disruption', 'inflation spike', 'rate hike', 'war', 'strike']
  const MED_KEYWORDS = ['slowdown', 'decline', 'pressure', 'risk', 'concern', 'uncertainty', 'volatility']

  let severity: Threat['severity'] | null = null
  if (CRITICAL_KEYWORDS.some(k => text.includes(k))) severity = 'critical'
  else if (HIGH_KEYWORDS.some(k => text.includes(k))) severity = 'high'
  else if (signal.sentiment === 'negative' && MED_KEYWORDS.some(k => text.includes(k))) severity = 'medium'

  if (!severity) return threats

  // Find affected goals
  const affectedGoalIds = goals
    .filter(g => scoreSignalRelevance(signal, g) >= 0.2)
    .map(g => g.id)

  threats.push({
    severity,
    title: `${severity.toUpperCase()} Alert: ${signal.title.slice(0, 100)}`,
    message: `External signal "${signal.title}" has been detected with ${severity} severity. ${signal.summary ? signal.summary.slice(0, 200) : ''} Review impacted goals and update risk assessments.`,
    goalIds: affectedGoalIds,
    signalId: signal.id,
  })

  return threats
}

// ── Executive briefing ────────────────────────────────────────────────────────

export function generateExternalBriefing(signals: Signal[], goals: Goal[]): ExternalBriefing {
  const recentSignals = signals.slice(0, 20) // most recent 20

  // Market overview
  const positiveCount = recentSignals.filter(s => s.sentiment === 'positive').length
  const negativeCount = recentSignals.filter(s => s.sentiment === 'negative').length
  const total = recentSignals.length || 1
  const sentiment = positiveCount > negativeCount ? 'generally positive' : negativeCount > positiveCount ? 'generally negative' : 'mixed'

  const marketOverview = total === 0
    ? 'No external signals have been captured yet. Add signal sources to begin market intelligence tracking.'
    : `External market conditions are ${sentiment} based on ${total} recent signals. ${positiveCount} positive and ${negativeCount} negative signals were detected across your monitored sources.`

  // Top risks
  const topRisks = recentSignals
    .filter(s => s.sentiment === 'negative')
    .slice(0, 5)
    .map(s => `${s.title}${s.value != null ? ` (${s.value} ${s.unit ?? ''})` : ''}`)

  // Opportunities
  const opportunities = recentSignals
    .filter(s => s.sentiment === 'positive')
    .slice(0, 5)
    .map(s => s.title)

  // Goal adjustments
  const goalAdjustments = goals
    .filter(g => g.status === 'active')
    .map(g => adjustGoalSuccessProb(g, recentSignals))
    .filter(a => Math.abs(a.adjustment) >= 3)
    .sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment))

  // Executive summary
  const executiveSummary = buildExecutiveSummary(marketOverview, goalAdjustments, topRisks)

  // Recommended actions
  const recommendedActions = buildRecommendedActions(recentSignals, goalAdjustments, goals)

  return {
    marketOverview,
    topRisks: topRisks.length > 0 ? topRisks : ['No significant negative signals detected'],
    opportunities: opportunities.length > 0 ? opportunities : ['No significant positive signals detected'],
    goalAdjustments,
    executiveSummary,
    recommendedActions,
  }
}

function buildExecutiveSummary(overview: string, adjustments: MarketRiskAdjustment[], risks: string[]): string {
  const riskImpacted = adjustments.filter(a => a.adjustment < 0).length
  const boosted = adjustments.filter(a => a.adjustment > 0).length
  let summary = `${overview} `
  if (riskImpacted > 0) summary += `${riskImpacted} active goal${riskImpacted > 1 ? 's have' : ' has'} reduced success probability due to market conditions. `
  if (boosted > 0) summary += `${boosted} goal${boosted > 1 ? 's are' : ' is'} showing improved probability from positive signals. `
  if (risks.length > 0) summary += `Key risk to monitor: "${risks[0]}".`
  return summary.trim()
}

function buildRecommendedActions(signals: Signal[], adjustments: MarketRiskAdjustment[], goals: Goal[]): string[] {
  const actions: string[] = []

  const negativeCurrency = signals.filter(s => s.type === 'currency' && s.sentiment === 'negative')
  const positiveCurrency = signals.filter(s => s.type === 'currency' && s.sentiment === 'positive')
  const highCommodity = signals.filter(s => s.type === 'commodity' && s.sentiment === 'negative')
  const regulation = signals.filter(s => s.type === 'regulation')
  const competitor = signals.filter(s => s.type === 'competitor')
  const security = signals.filter(s => s.type === 'security')

  if (negativeCurrency.length > 0) actions.push('Review forex exposure — currency signals indicate adverse movement. Consider hedging strategies.')
  if (positiveCurrency.length > 0) actions.push('Positive currency movement detected — potential cost savings for imports. Review procurement timing.')
  if (highCommodity.length > 0) actions.push('Commodity prices rising. Review cost-related KPIs and assess impact on gross margin goals.')
  if (regulation.length > 0) actions.push('New regulatory signals detected. Consult legal team to assess compliance requirements for active projects.')
  if (competitor.length > 0) actions.push('Competitor intelligence available. Review market positioning and consider accelerating differentiation roadmap.')
  if (security.length > 0) actions.push('Security alerts detected. Brief your IT/security team immediately and review incident response readiness.')

  // Severely impacted goals
  for (const adj of adjustments.filter(a => a.adjustment <= -10).slice(0, 2)) {
    actions.push(`Goal "${adj.goalTitle}" success probability dropped ${Math.abs(adj.adjustment)}%. Schedule a strategic review.`)
  }

  if (actions.length === 0) actions.push('Continue monitoring market signals. No immediate strategic action required at this time.')

  return actions.slice(0, 7)
}

// ── Simulate signals (for demo, no external API needed) ───────────────────────

export function simulateSignals(type: string, tenantId: string): Omit<Signal, 'id'>[] {
  const now = new Date()
  const demos: Record<string, Omit<Signal, 'id'>[]> = {
    currency: [
      { type: 'currency', title: 'USD/EUR rate drops to 0.89 — lowest in 6 months', summary: 'The US Dollar weakened against the Euro amid Fed signals of pausing rate hikes.', value: 0.89, unit: 'USD/EUR', sentiment: 'negative', relevance: 0.7, tags: ['forex', 'finance'], signalDate: now, tenantId } as never,
      { type: 'currency', title: 'GBP strengthens after UK trade data beats expectations', summary: 'Sterling rose 1.2% against major currencies following positive trade balance data.', value: 1.27, unit: 'GBP/USD', sentiment: 'positive', relevance: 0.6, tags: ['forex', 'uk', 'finance'], signalDate: now, tenantId } as never,
    ],
    commodity: [
      { type: 'commodity', title: 'Crude oil surges 8% on supply concerns', summary: 'OPEC+ production cuts push Brent crude above $95/barrel, raising energy costs globally.', value: 95.4, unit: 'USD/barrel', sentiment: 'negative', relevance: 0.75, tags: ['oil', 'energy', 'cost'], signalDate: now, tenantId } as never,
      { type: 'commodity', title: 'Steel prices ease 5% on lower demand', summary: 'Global steel demand contraction drives prices to 18-month lows.', value: 680, unit: 'USD/ton', sentiment: 'positive', relevance: 0.55, tags: ['steel', 'manufacturing', 'cost'], signalDate: now, tenantId } as never,
    ],
    economic: [
      { type: 'economic', title: 'Consumer confidence index falls to 92.4 in June', summary: 'Consumer spending outlook weakens as inflation continues to erode purchasing power.', value: 92.4, unit: 'index', sentiment: 'negative', relevance: 0.65, tags: ['consumer', 'sales', 'economic'], signalDate: now, tenantId } as never,
      { type: 'economic', title: 'GDP growth revised upward to 3.1% Q2', summary: 'Strong business investment and export performance drive above-forecast economic expansion.', value: 3.1, unit: '%', sentiment: 'positive', relevance: 0.7, tags: ['gdp', 'growth', 'economic'], signalDate: now, tenantId } as never,
    ],
    competitor: [
      { type: 'competitor', title: 'Competitor A raises $50M Series C round', summary: 'Main competitor secures $50M in funding to accelerate product development and market expansion.', value: 50, unit: 'USD M', sentiment: 'negative', relevance: 0.8, tags: ['competitor', 'funding', 'market'], signalDate: now, tenantId } as never,
      { type: 'competitor', title: 'Competitor B announces layoffs of 15% of workforce', summary: 'Market consolidation signals — opportunity to acquire talent and customers.', value: 15, unit: '%', sentiment: 'positive', relevance: 0.7, tags: ['competitor', 'hiring', 'opportunity'], signalDate: now, tenantId } as never,
    ],
    regulation: [
      { type: 'regulation', title: 'New data privacy regulation effective Q3 2026', summary: 'Mandatory data residency requirements now apply to all SaaS platforms operating in the region.', sentiment: 'negative', relevance: 0.6, tags: ['regulation', 'compliance', 'data'], signalDate: now, tenantId } as never,
      { type: 'regulation', title: 'SME tax incentive programme expanded', summary: 'Government extends SME tax credits to cover new hiring and R&D expenditures through 2027.', sentiment: 'positive', relevance: 0.65, tags: ['regulation', 'tax', 'hiring'], signalDate: now, tenantId } as never,
    ],
    shipping: [
      { type: 'shipping', title: 'Red Sea disruptions push freight rates up 35%', summary: 'Container shipping costs surge as vessels reroute via Cape of Good Hope, adding 10-14 days.', value: 35, unit: '%', sentiment: 'negative', relevance: 0.7, tags: ['shipping', 'logistics', 'cost'], signalDate: now, tenantId } as never,
    ],
    energy: [
      { type: 'energy', title: 'Electricity prices drop 12% following new renewables capacity', summary: 'Grid expansion from solar and wind projects brings electricity costs down for commercial users.', value: -12, unit: '%', sentiment: 'positive', relevance: 0.6, tags: ['energy', 'electricity', 'cost'], signalDate: now, tenantId } as never,
    ],
    security: [
      { type: 'security', title: 'Critical zero-day vulnerability in widely used ERP middleware', summary: 'Security researchers disclosed a critical RCE vulnerability. Patch immediately. No active exploits confirmed yet.', sentiment: 'negative', relevance: 0.9, tags: ['security', 'vulnerability', 'patch'], signalDate: now, tenantId } as never,
    ],
  }

  return (demos[type] ?? []) as Omit<Signal, 'id'>[]
}
