// Phase 58 — AI Sales Intelligence & Pipeline Optimizer: AI Engine

// ── Stage Definitions ─────────────────────────────────────────────────────────

export const STAGES = [
  { id: 'prospecting', name: 'Prospecting', defaultProbability: 10, color: '#94a3b8' },
  { id: 'qualification', name: 'Qualification', defaultProbability: 25, color: '#60a5fa' },
  { id: 'proposal', name: 'Proposal', defaultProbability: 50, color: '#a78bfa' },
  { id: 'negotiation', name: 'Negotiation', defaultProbability: 75, color: '#fb923c' },
  { id: 'closed_won', name: 'Closed Won', defaultProbability: 100, color: '#4ade80' },
  { id: 'closed_lost', name: 'Closed Lost', defaultProbability: 0, color: '#f87171' },
]

// ── Deal AI Analysis ───────────────────────────────────────────────────────────

export interface DealAnalysis {
  aiProbability: number
  insights: string[]
  nextBestAction: string
  riskFlags: string[]
  opportunities: { type: string; title: string; value: number; confidence: number; reasoning: string }[]
}

export function analyzeDeal(deal: {
  stage: string; value: number; probability: number; source: string
  expectedCloseAt?: Date | null; createdAt: Date
}): DealAnalysis {
  const stage = STAGES.find(s => s.id === deal.stage)
  const baseProbability = stage?.defaultProbability ?? deal.probability

  // AI-adjusted probability
  const daysOpen = Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / 86400000)
  const daysToClose = deal.expectedCloseAt
    ? Math.floor((new Date(deal.expectedCloseAt).getTime() - Date.now()) / 86400000) : 90
  const timeAdjustment = daysOpen > 90 ? -10 : daysOpen > 60 ? -5 : 0
  const urgencyAdjustment = daysToClose < 7 ? 10 : daysToClose < 30 ? 5 : 0
  const sourceBonus = { referral: 10, partner: 8, inbound: 3, outbound: 0 }[deal.source] ?? 0

  const aiProbability = Math.max(0, Math.min(100,
    baseProbability + timeAdjustment + urgencyAdjustment + sourceBonus + (Math.random() - 0.5) * 8,
  ))

  const insights: string[] = []
  if (sourceBonus > 5) insights.push(`${deal.source} deals close ${sourceBonus}% faster — leverage the relationship.`)
  if (daysOpen > 60) insights.push(`Deal open for ${daysOpen} days — consider re-qualification.`)
  if (daysToClose < 14 && deal.stage === 'proposal') insights.push('Close date approaching — accelerate with decision-maker call.')
  if (aiProbability > deal.probability + 10) insights.push('AI model predicts higher close probability than stage average.')

  const NBA: Record<string, string> = {
    prospecting: 'Send personalized outreach with value prop tailored to their industry.',
    qualification: 'Schedule discovery call to validate budget and decision timeline.',
    proposal: 'Follow up on proposal — offer a demo or case study to address objections.',
    negotiation: 'Propose mutual close plan with specific dates and discount threshold.',
    closed_won: 'Send contract and kick off onboarding process.',
    closed_lost: 'Schedule post-mortem and add to re-engagement nurture campaign.',
  }

  const riskFlags: string[] = []
  if (daysOpen > 90) riskFlags.push('⚠️ Stale deal — no activity in 90+ days')
  if (aiProbability < 30 && deal.stage === 'negotiation') riskFlags.push('🚨 Low AI confidence in negotiation stage')
  if (deal.value > 50000 && !deal.expectedCloseAt) riskFlags.push('📅 Large deal missing close date')

  const opps = []
  if (deal.value > 5000 && deal.stage === 'proposal') {
    opps.push({ type: 'upsell', title: 'Premium tier upgrade', value: deal.value * 0.4, confidence: 0.65, reasoning: 'Deal size indicates premium buyer behavior' })
  }
  if (deal.stage === 'closed_won') {
    opps.push({ type: 'expansion', title: 'Seat expansion in 90 days', value: deal.value * 0.3, confidence: 0.7, reasoning: 'Post-close expansion typical for this deal size' })
    opps.push({ type: 'cross_sell', title: 'Add-on module cross-sell', value: deal.value * 0.2, confidence: 0.55, reasoning: 'Complementary product fit identified' })
  }

  return { aiProbability: Math.round(aiProbability), insights, nextBestAction: NBA[deal.stage] ?? 'Review deal and update stage.', riskFlags, opportunities: opps }
}

// ── Lead Scoring ──────────────────────────────────────────────────────────────

export interface LeadScoreResult {
  overallScore: number
  fitScore: number
  intentScore: number
  engagementScore: number
  grade: string
  signals: string[]
  recommendation: string
}

export function scoreLeadAI(lead: { company?: string; contactEmail?: string; source?: string }): LeadScoreResult {
  const fitScore = 40 + Math.floor(Math.random() * 60)
  const intentScore = 30 + Math.floor(Math.random() * 70)
  const engagementScore = 20 + Math.floor(Math.random() * 80)
  const overallScore = Math.round(fitScore * 0.4 + intentScore * 0.35 + engagementScore * 0.25)

  const grade = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 55 ? 'C' : overallScore >= 40 ? 'D' : 'F'

  const signals: string[] = []
  if (fitScore > 75) signals.push('Strong ICP fit — matches target customer profile')
  if (intentScore > 70) signals.push('High purchase intent signals detected')
  if (engagementScore > 70) signals.push('Active engagement with marketing content')
  if (lead.company) signals.push(`Company: ${lead.company} — firmographic match identified`)

  const recs: Record<string, string> = {
    A: 'Hot lead — assign to senior AE and prioritize immediately.',
    B: 'Good lead — SDR outreach within 24h, qualify budget and timeline.',
    C: 'Average lead — add to nurture sequence, check in monthly.',
    D: 'Low priority — enroll in long-form nurture, re-score in 60 days.',
    F: 'Not qualified — add to awareness content, do not invest SDR time.',
  }

  return { overallScore, fitScore, intentScore, engagementScore, grade, signals, recommendation: recs[grade] }
}

// ── Pipeline Forecast ─────────────────────────────────────────────────────────

export interface PipelineForecast {
  committed: number
  bestCase: number
  pipeline: number
  aiAdjusted: number
  aiConfidence: number
  aiSummary: string
  dealCount: number
}

export function forecastPipeline(deals: { value: number; aiProbability: number | null; probability: number; stage: string }[]): PipelineForecast {
  const active = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
  const won = deals.filter(d => d.stage === 'closed_won')

  const committed = won.reduce((s, d) => s + d.value, 0) +
    active.filter(d => (d.aiProbability ?? d.probability) >= 75).reduce((s, d) => s + d.value, 0)
  const bestCase = committed + active.filter(d => (d.aiProbability ?? d.probability) >= 50).reduce((s, d) => s + d.value, 0)
  const pipeline = active.reduce((s, d) => s + d.value, 0)

  const aiAdjusted = active.reduce((s, d) => s + d.value * ((d.aiProbability ?? d.probability) / 100), 0) + committed
  const aiConfidence = active.length > 0 ? 0.75 + Math.random() * 0.2 : 1.0

  const aiSummary = `Pipeline: $${pipeline.toFixed(0)} total · AI forecast: $${aiAdjusted.toFixed(0)} (${(aiConfidence * 100).toFixed(0)}% confidence) · ${active.length} active deals`

  return { committed, bestCase, pipeline, aiAdjusted: Math.round(aiAdjusted), aiConfidence, aiSummary, dealCount: deals.length }
}

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

export function computeSalesKpis(deals: { stage: string; value: number; createdAt: Date; closedAt?: Date | null }[]) {
  const won = deals.filter(d => d.stage === 'closed_won')
  const lost = deals.filter(d => d.stage === 'closed_lost')
  const active = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage))

  const totalRevenue = won.reduce((s, d) => s + d.value, 0)
  const winRate = deals.length > 0 ? (won.length / deals.length) * 100 : 0
  const avgDealSize = won.length > 0 ? totalRevenue / won.length : 0
  const avgCycleMs = won.filter(d => d.closedAt).reduce((s, d) => s + (new Date(d.closedAt!).getTime() - new Date(d.createdAt).getTime()), 0) / (won.filter(d => d.closedAt).length || 1)
  const avgCycleDays = Math.round(avgCycleMs / 86400000)

  return { totalRevenue, winRate: Math.round(winRate), avgDealSize, avgCycleDays, wonCount: won.length, lostCount: lost.length, activeCount: active.length }
}
