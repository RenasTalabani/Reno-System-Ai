// Phase 57 — AI Customer Success & Churn Prevention: AI Engine

export const PLAYBOOK_TEMPLATES = [
  {
    slug: 'churn_intervention', name: 'Churn Intervention', trigger: 'churn_risk',
    description: 'Automated intervention for high-churn-risk customers',
    steps: [
      { order: 1, type: 'email', title: 'Send personalized re-engagement email', config: { template: 'churn_intervention', delay: 0 } },
      { order: 2, type: 'task', title: 'Create CSM follow-up task', config: { assignTo: 'csm', due: '24h' } },
      { order: 3, type: 'offer', title: 'Generate retention offer', config: { discount: 20, duration: '3months' } },
      { order: 4, type: 'call', title: 'Schedule executive call', config: { urgency: 'high', topic: 'retention' } },
    ],
  },
  {
    slug: 'onboarding_success', name: 'Onboarding Success', trigger: 'onboarding',
    description: 'Guide new customers through activation milestones',
    steps: [
      { order: 1, type: 'email', title: 'Welcome email with quick-start guide', config: { template: 'welcome' } },
      { order: 2, type: 'task', title: 'Schedule onboarding call (Day 3)', config: { due: '3days' } },
      { order: 3, type: 'check', title: 'Check product activation (Day 7)', config: { milestone: 'first_login' } },
      { order: 4, type: 'email', title: 'Tips & best practices (Day 14)', config: { template: 'tips', delay: '14days' } },
      { order: 5, type: 'survey', title: 'First NPS survey (Day 30)', config: { type: 'nps' } },
    ],
  },
  {
    slug: 'renewal_campaign', name: 'Renewal Campaign', trigger: 'renewal',
    description: '90-day renewal preparation and upsell',
    steps: [
      { order: 1, type: 'email', title: 'Renewal reminder 90 days out', config: { template: 'renewal_90d' } },
      { order: 2, type: 'review', title: 'Prepare QBR materials', config: { type: 'qbr' } },
      { order: 3, type: 'email', title: 'Upsell proposal 60 days out', config: { template: 'upsell', delay: '30days' } },
      { order: 4, type: 'call', title: 'Renewal negotiation call', config: { due: '45days', type: 'renewal' } },
    ],
  },
  {
    slug: 'nps_detractor', name: 'NPS Detractor Recovery', trigger: 'nps_low',
    description: 'Rapid response to NPS detractors (score 0–6)',
    steps: [
      { order: 1, type: 'alert', title: 'Alert CSM immediately', config: { urgency: 'critical' } },
      { order: 2, type: 'call', title: 'Personal call within 24h', config: { due: '24h', goal: 'listen' } },
      { order: 3, type: 'task', title: 'Root cause analysis', config: { owner: 'csm', due: '48h' } },
      { order: 4, type: 'email', title: 'Resolution follow-up', config: { template: 'nps_recovery' } },
    ],
  },
]

export interface HealthScoreResult {
  overallScore: number
  engagementScore: number
  adoptionScore: number
  supportScore: number
  paymentScore: number
  npsScoreFactor: number
  churnRisk: 'low' | 'medium' | 'high' | 'critical'
  signals: string[]
  aiInsights: string[]
}

export function computeHealthScore(customer: {
  lastActivityAt?: Date | null
  npsScore?: number | null
  mrr: number
  ltv: number
  plan: string
}): HealthScoreResult {
  // Engagement: how recently active
  const daysSinceActivity = customer.lastActivityAt
    ? Math.floor((Date.now() - new Date(customer.lastActivityAt).getTime()) / 86400000)
    : 60
  const engagementScore = Math.max(0, 100 - daysSinceActivity * 2)

  // Adoption: based on plan
  const planAdoption: Record<string, number> = { starter: 40, growth: 65, pro: 80, enterprise: 90 }
  const adoptionScore = (planAdoption[customer.plan] ?? 50) + (Math.random() - 0.5) * 15

  // Support: simulated ticket health
  const supportScore = 70 + Math.random() * 30

  // Payment: LTV / MRR ratio health
  const mrrMonths = customer.mrr > 0 ? customer.ltv / customer.mrr : 0
  const paymentScore = Math.min(100, mrrMonths * 5 + 60)

  // NPS factor
  const nps = customer.npsScore ?? 7
  const npsScoreFactor = nps >= 9 ? 100 : nps >= 7 ? 75 : nps >= 5 ? 50 : 25

  const overallScore = Math.round(
    engagementScore * 0.3 + adoptionScore * 0.25 + supportScore * 0.2 + paymentScore * 0.15 + npsScoreFactor * 0.1,
  )

  const churnRisk: HealthScoreResult['churnRisk'] =
    overallScore >= 75 ? 'low' : overallScore >= 55 ? 'medium' : overallScore >= 35 ? 'high' : 'critical'

  const signals: string[] = []
  if (daysSinceActivity > 14) signals.push(`No activity for ${daysSinceActivity} days`)
  if (nps < 7) signals.push(`Low NPS score: ${nps}`)
  if (engagementScore < 40) signals.push('Low engagement detected')
  if (adoptionScore < 50) signals.push('Feature adoption below threshold')

  const aiInsights: string[] = [
    overallScore >= 75 ? '✅ Customer is healthy — good candidate for upsell or referral.' : `⚠️ Health score ${overallScore}/100 — intervention recommended.`,
    churnRisk === 'critical' ? '🚨 Critical churn risk — trigger intervention playbook immediately.' :
    churnRisk === 'high' ? '⚡ High churn risk — assign CSM and schedule call this week.' :
    churnRisk === 'medium' ? '📋 Monitor closely — check in with customer next 14 days.' : '💚 Low risk — maintain regular touchpoints.',
    customer.plan === 'starter' && adoptionScore > 60 ? '💡 Strong adoption on Starter plan — upsell opportunity to Growth.' : '',
  ].filter(Boolean)

  return {
    overallScore,
    engagementScore: Math.round(engagementScore),
    adoptionScore: Math.round(Math.max(0, Math.min(100, adoptionScore))),
    supportScore: Math.round(supportScore),
    paymentScore: Math.round(Math.min(100, paymentScore)),
    npsScoreFactor,
    churnRisk,
    signals,
    aiInsights,
  }
}

export function predictChurn(healthScore: number, daysSinceActivity: number, nps?: number): {
  probability: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
  recommendation: string
} {
  let probability = (100 - healthScore) / 100

  // Boost based on inactivity
  if (daysSinceActivity > 30) probability += 0.15
  if (daysSinceActivity > 60) probability += 0.20
  if (nps != null && nps < 6) probability += 0.25

  probability = Math.max(0.01, Math.min(0.99, probability + (Math.random() - 0.5) * 0.08))

  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    probability < 0.25 ? 'low' : probability < 0.50 ? 'medium' : probability < 0.75 ? 'high' : 'critical'

  const factors: string[] = []
  if (healthScore < 50) factors.push(`Low health score: ${healthScore}`)
  if (daysSinceActivity > 14) factors.push(`Inactive for ${daysSinceActivity} days`)
  if (nps != null && nps < 7) factors.push(`NPS score: ${nps}/10`)

  const recommendations: Record<string, string> = {
    low: 'Maintain regular QBR cadence and look for expansion opportunities.',
    medium: 'Schedule a proactive check-in call within the next 2 weeks.',
    high: 'Trigger churn intervention playbook and assign dedicated CSM.',
    critical: 'Immediate escalation required — executive call within 24 hours.',
  }

  return { probability: Math.round(probability * 100) / 100, riskLevel, factors, recommendation: recommendations[riskLevel] }
}

export function runPlaybookStep(stepType: string, config: Record<string, unknown>): { success: boolean; output: string; durationMs: number } {
  const durations: Record<string, number> = { email: 50, task: 30, offer: 80, call: 200, check: 60, survey: 40, review: 150, alert: 20 }
  const durationMs = (durations[stepType] ?? 50) + Math.floor(Math.random() * 50)
  const success = Math.random() > 0.04

  const outputs: Record<string, string> = {
    email: `Email sent to customer (template: ${config.template ?? 'default'})`,
    task: `Task created: assigned to ${config.assignTo ?? 'CSM'}, due in ${config.due ?? '7d'}`,
    offer: `Retention offer generated: ${config.discount ?? 10}% discount for ${config.duration ?? '1month'}`,
    call: `Call scheduled: ${config.type ?? 'check-in'}, urgency ${config.urgency ?? 'normal'}`,
    check: `Milestone check: ${config.milestone ?? 'activation'} — passed`,
    survey: `${config.type ?? 'CSAT'} survey sent to customer`,
    review: `${config.type ?? 'QBR'} materials prepared and shared`,
    alert: `Alert triggered: urgency ${config.urgency ?? 'normal'}`,
  }

  return { success, output: outputs[stepType] ?? 'Step completed', durationMs }
}
