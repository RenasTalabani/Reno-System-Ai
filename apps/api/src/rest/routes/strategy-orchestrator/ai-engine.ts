// Phase 45 — AI Enterprise Strategy Orchestrator
// All logic performed by Reno Brain. Claude/OpenAI are OPTIONAL.

export type InitiativeType = 'growth' | 'cost' | 'risk' | 'product' | 'hiring' | 'process' | 'technology' | 'market'
export type Department = 'finance' | 'hr' | 'sales' | 'marketing' | 'operations' | 'product' | 'technology' | 'all'
export type TimeHorizon = '30d' | '90d' | '1y' | '5y'

export interface Initiative {
  id: string
  title: string
  type: InitiativeType
  department: Department
  status: string
  priority: string
  estimatedBudget?: number | null
  estimatedRoi?: number | null
  riskScore?: number | null
  urgencyScore?: number | null
  strategicScore?: number | null
  portfolioScore?: number | null
  timeHorizon: TimeHorizon
  linkedGoalIds: string[]
}

export interface Goal {
  id: string; title: string; type: string; category: string
  status: string; progress: number; successProb?: number | null; targetDate?: Date | null
}

export interface Signal {
  id: string; type: string; title: string; sentiment?: string | null
}

export interface PortfolioScore {
  initiativeId: string
  roiScore: number        // 0-100
  riskScore: number       // 0-100 (inverted — low risk = high score)
  urgencyScore: number    // 0-100
  strategicScore: number  // 0-100
  totalScore: number      // weighted composite
  rank: number
  rationale: string
}

export interface ConflictDetection {
  initiativeAId: string
  initiativeBId: string
  type: 'budget' | 'headcount' | 'timeline' | 'strategic' | 'resource'
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface KpiCascade {
  company: { kpi: string; target: string }[]
  departments: { dept: Department; kpis: { kpi: string; target: string; owner: string }[] }[]
  individual: { role: string; kpis: { kpi: string; target: string }[] }[]
}

export interface CalendarPhase {
  horizon: TimeHorizon
  label: string
  initiatives: string[]
  milestones: string[]
  budget: number
}

export interface DecisionBoardEntry {
  source: 'goal' | 'signal' | 'simulation' | 'initiative'
  id: string
  title: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
  action: string
}

// ── Portfolio scoring ─────────────────────────────────────────────────────────

const PRIORITY_URGENCY: Record<string, number> = {
  critical: 100, high: 75, medium: 50, low: 25,
}

const TYPE_STRATEGIC_WEIGHT: Record<string, number> = {
  growth: 90, product: 85, market: 80, technology: 75,
  process: 60, hiring: 65, cost: 70, risk: 80,
}

const HORIZON_URGENCY_BONUS: Record<string, number> = {
  '30d': 30, '90d': 15, '1y': 5, '5y': 0,
}

export function scorePortfolio(initiatives: Initiative[]): PortfolioScore[] {
  const scores = initiatives.map(ini => {
    // ROI score (0-100): based on estimatedRoi
    const roi = ini.estimatedRoi ?? 0
    const roiScore = Math.min(100, Math.max(0, roi > 0 ? Math.min(100, roi * 200) : 0))

    // Risk score (inverted): low risk = high score
    const rawRisk = ini.riskScore ?? 50
    const riskScore = Math.max(0, 100 - rawRisk)

    // Urgency score: priority + time horizon bonus
    const urgencyScore = Math.min(100,
      (PRIORITY_URGENCY[ini.priority] ?? 50) + (HORIZON_URGENCY_BONUS[ini.timeHorizon] ?? 0)
    )

    // Strategic score: type weight + goal linkage bonus
    const goalBonus = Math.min(20, ini.linkedGoalIds.length * 5)
    const strategicScore = Math.min(100, (TYPE_STRATEGIC_WEIGHT[ini.type] ?? 60) + goalBonus)

    // Weighted composite: ROI 30% | Risk 25% | Urgency 25% | Strategic 20%
    const totalScore = Math.round(
      roiScore * 0.30 + riskScore * 0.25 + urgencyScore * 0.25 + strategicScore * 0.20
    )

    return { initiativeId: ini.id, roiScore, riskScore, urgencyScore, strategicScore, totalScore, rank: 0, rationale: '' }
  })

  // Rank descending
  scores.sort((a, b) => b.totalScore - a.totalScore)
  scores.forEach((s, i) => {
    s.rank = i + 1
    const ini = initiatives.find(x => x.id === s.initiativeId)
    s.rationale = buildScoreRationale(ini!, s)
  })

  return scores
}

function buildScoreRationale(ini: Initiative, s: PortfolioScore): string {
  const parts: string[] = []
  if (s.roiScore >= 70) parts.push(`strong ROI potential (${s.roiScore}/100)`)
  if (s.riskScore >= 70) parts.push(`manageable risk profile (${s.riskScore}/100)`)
  if (s.urgencyScore >= 70) parts.push(`high urgency (${ini.priority} priority, ${ini.timeHorizon} horizon)`)
  if (s.strategicScore >= 70) parts.push(`high strategic alignment (${ini.type})`)
  if (ini.linkedGoalIds.length > 0) parts.push(`linked to ${ini.linkedGoalIds.length} active goal(s)`)
  return parts.length > 0 ? `Ranked #${s.rank} due to: ${parts.join(', ')}.` : `Ranked #${s.rank} with composite score ${s.totalScore}/100.`
}

// ── Conflict detection ────────────────────────────────────────────────────────

const CONFLICT_RULES: { type: ConflictDetection['type']; severity: ConflictDetection['severity']; check: (a: Initiative, b: Initiative) => string | null }[] = [
  {
    type: 'budget',
    severity: 'high',
    check: (a, b) => {
      if (a.type === 'cost' && b.type === 'hiring') {
        return `"${a.title}" aims to reduce costs while "${b.title}" plans new hiring, creating a budget conflict.`
      }
      if (a.type === 'cost' && b.estimatedBudget && b.estimatedBudget > 100000) {
        return `"${a.title}" (cost reduction) conflicts with the high budget (${b.estimatedBudget?.toLocaleString()}) planned for "${b.title}".`
      }
      return null
    },
  },
  {
    type: 'headcount',
    severity: 'medium',
    check: (a, b) => {
      if (a.type === 'hiring' && b.type === 'cost' && (b.department === 'hr' || b.department === 'all')) {
        return `"${a.title}" (hiring initiative) conflicts with "${b.title}" which targets HR/headcount cost reduction.`
      }
      return null
    },
  },
  {
    type: 'strategic',
    severity: 'high',
    check: (a, b) => {
      if (a.department === b.department && a.type !== b.type && a.timeHorizon === b.timeHorizon) {
        const opposites = [['growth', 'cost'], ['hiring', 'process']]
        for (const [x, y] of opposites) {
          if ((a.type === x && b.type === y) || (a.type === y && b.type === x)) {
            return `"${a.title}" (${a.type}) and "${b.title}" (${b.type}) are strategically opposed in the ${a.department} department within the same time horizon.`
          }
        }
      }
      return null
    },
  },
  {
    type: 'resource',
    severity: 'medium',
    check: (a, b) => {
      if (a.department === b.department && a.timeHorizon === b.timeHorizon &&
          (a.estimatedBudget ?? 0) + (b.estimatedBudget ?? 0) > 500000) {
        return `Both "${a.title}" and "${b.title}" are competing for significant budget in the ${a.department} department in the same period.`
      }
      return null
    },
  },
  {
    type: 'timeline',
    severity: 'low',
    check: (a, b) => {
      if (a.type === 'product' && b.type === 'technology' && a.timeHorizon === b.timeHorizon) {
        return `"${a.title}" (product) and "${b.title}" (technology) both target the ${a.timeHorizon} horizon and may create team bandwidth conflicts.`
      }
      return null
    },
  },
]

export function detectConflicts(initiatives: Initiative[]): ConflictDetection[] {
  const conflicts: ConflictDetection[] = []
  for (let i = 0; i < initiatives.length; i++) {
    for (let j = i + 1; j < initiatives.length; j++) {
      const a = initiatives[i]
      const b = initiatives[j]
      for (const rule of CONFLICT_RULES) {
        const desc = rule.check(a, b) ?? rule.check(b, a)
        if (desc) {
          conflicts.push({ initiativeAId: a.id, initiativeBId: b.id, type: rule.type, description: desc, severity: rule.severity })
          break  // one conflict per pair
        }
      }
    }
  }
  return conflicts
}

// ── AI-generate initiatives from context ──────────────────────────────────────

export function generateInitiativesFromContext(goals: Goal[], signals: Signal[]): Omit<Initiative, 'id'>[] {
  const initiatives: Omit<Initiative, 'id'>[] = []

  // Goals → initiatives
  for (const goal of goals.slice(0, 5)) {
    if (goal.status !== 'active') continue
    const type = mapGoalCategoryToType(goal.category)
    const dept = mapGoalCategoryToDept(goal.category)
    const successProb = goal.successProb ?? 0.7

    initiatives.push({
      title: `Strategic Initiative: ${goal.title}`,
      type,
      department: dept,
      status: 'draft',
      priority: successProb < 0.5 ? 'high' : 'medium',
      estimatedBudget: estimateBudgetForType(type),
      estimatedRoi: estimateRoiForType(type),
      riskScore: successProb < 0.5 ? 70 : 30,
      urgencyScore: successProb < 0.4 ? 90 : 60,
      strategicScore: TYPE_STRATEGIC_WEIGHT[type] ?? 60,
      portfolioScore: null,
      linkedGoalIds: [goal.id],
      linkedSignalIds: [],
      timeHorizon: mapTargetDateToHorizon(goal.targetDate),
      aiPlan: buildAiPlan(goal.title, type, dept),
      kpiCascade: null,
    })
  }

  // Negative signals → risk mitigation initiatives
  const negativeSignals = signals.filter(s => s.sentiment === 'negative').slice(0, 3)
  for (const signal of negativeSignals) {
    initiatives.push({
      title: `Risk Mitigation: ${signal.title.slice(0, 80)}`,
      type: 'risk',
      department: mapSignalTypeToDept(signal.type),
      status: 'draft',
      priority: 'high',
      estimatedBudget: 50000,
      estimatedRoi: 0.3,
      riskScore: 20,
      urgencyScore: 85,
      strategicScore: 80,
      portfolioScore: null,
      linkedGoalIds: [],
      linkedSignalIds: [signal.id],
      timeHorizon: '30d',
      aiPlan: { steps: [`Assess exposure to: ${signal.title}`, 'Quantify financial impact', 'Assign risk owner', 'Define response plan', 'Monitor weekly'], },
      kpiCascade: null,
    })
  }

  return initiatives
}

function mapGoalCategoryToType(category: string): InitiativeType {
  const m: Record<string, InitiativeType> = {
    sales: 'growth', growth: 'growth', hiring: 'hiring', cost: 'cost',
    product: 'product', finance: 'cost', health: 'process', learning: 'process',
  }
  return m[category] ?? 'growth'
}

function mapGoalCategoryToDept(category: string): Department {
  const m: Record<string, Department> = {
    sales: 'sales', growth: 'sales', hiring: 'hr', cost: 'finance',
    product: 'product', finance: 'finance', health: 'hr', learning: 'hr',
  }
  return m[category] ?? 'all'
}

function mapSignalTypeToDept(type: string): Department {
  const m: Record<string, Department> = {
    currency: 'finance', commodity: 'operations', news: 'all', regulation: 'all',
    economic: 'finance', competitor: 'sales', security: 'technology', shipping: 'operations', energy: 'operations',
  }
  return m[type] ?? 'all'
}

function estimateBudgetForType(type: string): number {
  const m: Record<string, number> = {
    growth: 200000, cost: 50000, risk: 75000, product: 300000,
    hiring: 150000, process: 80000, technology: 250000, market: 180000,
  }
  return m[type] ?? 100000
}

function estimateRoiForType(type: string): number {
  const m: Record<string, number> = {
    growth: 0.35, cost: 0.25, risk: 0.15, product: 0.40,
    hiring: 0.30, process: 0.20, technology: 0.35, market: 0.30,
  }
  return m[type] ?? 0.25
}

function mapTargetDateToHorizon(targetDate?: Date | null): TimeHorizon {
  if (!targetDate) return '90d'
  const daysLeft = Math.round((targetDate.getTime() - Date.now()) / 86400000)
  if (daysLeft <= 35) return '30d'
  if (daysLeft <= 100) return '90d'
  if (daysLeft <= 400) return '1y'
  return '5y'
}

function buildAiPlan(title: string, type: string, dept: string): Record<string, unknown> {
  const PLANS: Record<string, string[]> = {
    growth: ['Define target market segment', 'Set revenue targets and KPIs', 'Allocate sales/marketing budget', 'Build execution timeline', 'Launch pilot and measure'],
    cost: ['Audit current cost structure', 'Identify top 5 reduction opportunities', 'Model financial impact', 'Get department sign-off', 'Implement and track savings'],
    hiring: ['Define headcount plan by role', 'Set salary bands and budget', 'Launch recruitment pipeline', 'Onboarding and ramp plan', 'Performance milestones at 30/60/90 days'],
    product: ['Gather customer requirements', 'Define MVP scope', 'Technical architecture review', 'Sprint planning', 'Beta launch and feedback loop'],
    risk: ['Risk identification workshop', 'Probability × impact matrix', 'Define controls and owners', 'Monitor leading indicators', 'Quarterly risk review'],
    technology: ['Technology assessment', 'Vendor evaluation', 'Implementation roadmap', 'Training plan', 'Go-live and support model'],
    process: ['Process mapping (as-is)', 'Identify bottlenecks', 'Design to-be process', 'Pilot in one team', 'Full rollout and measurement'],
    market: ['Market research', 'Competitive positioning', 'Go-to-market strategy', 'Channel partner identification', 'Launch campaign'],
  }
  return { title, department: dept, steps: PLANS[type] ?? PLANS.growth, estimatedWeeks: 12 }
}

// ── KPI Cascade ───────────────────────────────────────────────────────────────

const KPI_TEMPLATES: Record<string, KpiCascade> = {
  growth: {
    company: [{ kpi: 'Annual Revenue Growth', target: '+20% YoY' }, { kpi: 'New Customer Acquisition', target: '+30% YoY' }],
    departments: [
      { dept: 'sales', kpis: [{ kpi: 'Monthly Closed Deals', target: '+25%', owner: 'Sales VP' }, { kpi: 'Pipeline Value', target: '3× ARR', owner: 'Sales VP' }] },
      { dept: 'marketing', kpis: [{ kpi: 'Qualified Leads Generated', target: '+40%', owner: 'Marketing VP' }, { kpi: 'CAC', target: '<$500', owner: 'Marketing VP' }] },
    ],
    individual: [
      { role: 'Account Executive', kpis: [{ kpi: 'Monthly Quota Attainment', target: '100%' }, { kpi: 'New Logos', target: '5/month' }] },
      { role: 'SDR', kpis: [{ kpi: 'Meetings Set', target: '20/month' }, { kpi: 'Response Rate', target: '>15%' }] },
    ],
  },
  cost: {
    company: [{ kpi: 'Operating Cost Ratio', target: '<65%' }, { kpi: 'EBITDA Margin', target: '+5pp' }],
    departments: [
      { dept: 'finance', kpis: [{ kpi: 'Budget Variance', target: '<5%', owner: 'CFO' }, { kpi: 'AP Days', target: '<45', owner: 'Finance Director' }] },
      { dept: 'operations', kpis: [{ kpi: 'Unit Cost Reduction', target: '-10%', owner: 'COO' }, { kpi: 'Supplier Savings', target: '$200K', owner: 'Procurement' }] },
    ],
    individual: [
      { role: 'Department Head', kpis: [{ kpi: 'Budget Adherence', target: '≤100%' }, { kpi: 'Cost per Output Unit', target: '-8%' }] },
    ],
  },
  hiring: {
    company: [{ kpi: 'Employee Count Growth', target: '+20%' }, { kpi: 'Time-to-Hire', target: '<30 days' }],
    departments: [
      { dept: 'hr', kpis: [{ kpi: 'Offer Acceptance Rate', target: '>85%', owner: 'HR Director' }, { kpi: '90-Day Retention', target: '>95%', owner: 'HR Director' }] },
    ],
    individual: [
      { role: 'Recruiter', kpis: [{ kpi: 'Hires per Month', target: '5', }, { kpi: 'Candidate Quality Score', target: '>4.0/5' }] },
    ],
  },
}

export function cascadeKPIs(initiativeType: string): KpiCascade {
  return KPI_TEMPLATES[initiativeType] ?? KPI_TEMPLATES.growth
}

// ── Executive Calendar ────────────────────────────────────────────────────────

export function buildExecutiveCalendar(initiatives: Initiative[]): CalendarPhase[] {
  const phases: TimeHorizon[] = ['30d', '90d', '1y', '5y']
  const labels = { '30d': 'Immediate (30 days)', '90d': 'Short-term (90 days)', '1y': '1 Year', '5y': '5 Years' }

  return phases.map(horizon => {
    const phaseInits = initiatives.filter(i => i.timeHorizon === horizon && i.status !== 'cancelled')
    const budget = phaseInits.reduce((s, i) => s + (i.estimatedBudget ?? 0), 0)
    const milestones = buildMilestones(phaseInits, horizon)
    return {
      horizon,
      label: labels[horizon],
      initiatives: phaseInits.map(i => i.title),
      milestones,
      budget,
    }
  })
}

function buildMilestones(initiatives: Initiative[], horizon: TimeHorizon): string[] {
  const ms: string[] = []
  if (horizon === '30d') {
    if (initiatives.length > 0) ms.push('Kick-off all immediate initiatives', 'Assign owners and resources', 'Establish weekly check-ins')
  } else if (horizon === '90d') {
    if (initiatives.length > 0) ms.push('Q1 review and course correction', 'Mid-quarter KPI assessment', 'Budget reallocation if needed')
  } else if (horizon === '1y') {
    ms.push('H1 strategy review (Month 6)', 'Annual OKR alignment', 'Year-end performance evaluation')
  } else {
    ms.push('Annual strategic review', 'Board-level progress reporting', 'Market positioning reassessment', 'Technology roadmap refresh')
  }
  return ms
}

// ── Strategy Review ───────────────────────────────────────────────────────────

export function generateStrategyReview(
  initiatives: Initiative[],
  goals: Goal[],
): { summary: string; onTrackCount: number; atRiskCount: number; completedCount: number; recommendations: string[]; initiativeUpdates: { id: string; title: string; status: string; note: string }[] } {
  const active = initiatives.filter(i => i.status === 'active')
  const completed = initiatives.filter(i => i.status === 'completed')
  const draft = initiatives.filter(i => i.status === 'draft')
  const atRisk = active.filter(i => (i.riskScore ?? 0) > 60)
  const onTrack = active.filter(i => (i.riskScore ?? 0) <= 60)

  const recommendations: string[] = []
  if (draft.length > 3) recommendations.push(`${draft.length} initiatives remain in draft. Prioritise activation to maintain strategic momentum.`)
  if (atRisk.length > 0) recommendations.push(`${atRisk.length} initiative(s) have high risk scores. Schedule risk review sessions immediately.`)
  if (goals.filter(g => g.status === 'active' && (g.successProb ?? 1) < 0.5).length > 0) recommendations.push('Several active goals show below-50% success probability. Review linked initiatives and adjust resource allocation.')
  if (completed.length > 0) recommendations.push(`${completed.length} initiative(s) completed this period. Capture learnings and plan successors.`)
  if (recommendations.length === 0) recommendations.push('Strategy execution is on track. Maintain current cadence and prepare for next-quarter planning.')

  const summary = `Weekly strategy review: ${active.length} active, ${onTrack.length} on track, ${atRisk.length} at risk, ${completed.length} completed, ${draft.length} in draft. Total portfolio: ${initiatives.length} initiatives across ${new Set(initiatives.map(i => i.department)).size} departments.`

  const initiativeUpdates = initiatives.slice(0, 10).map(i => ({
    id: i.id,
    title: i.title,
    status: i.status,
    note: buildInitiativeNote(i),
  }))

  return { summary, onTrackCount: onTrack.length, atRiskCount: atRisk.length, completedCount: completed.length, recommendations, initiativeUpdates }
}

function buildInitiativeNote(initiative: Initiative): string {
  if (initiative.status === 'completed') return 'Completed. Review outcomes and document learnings.'
  if ((initiative.riskScore ?? 0) > 70) return 'High risk — requires immediate attention and mitigation plan.'
  if (initiative.status === 'draft') return 'Pending activation. Assign owner and set start date.'
  return 'On track. Continue executing according to plan.'
}

// ── Decision Board ────────────────────────────────────────────────────────────

export function buildDecisionBoard(
  initiatives: Initiative[],
  goals: Goal[],
  activeAlerts: { id: string; title: string; severity: string }[],
): DecisionBoardEntry[] {
  const entries: DecisionBoardEntry[] = []

  // High-risk initiatives
  for (const ini of initiatives.filter(i => (i.riskScore ?? 0) > 70 && i.status === 'active').slice(0, 3)) {
    entries.push({
      source: 'initiative', id: ini.id,
      title: ini.title,
      urgency: 'high',
      recommendation: `This initiative has a high risk score (${ini.riskScore}). Convene a risk review with ${ini.department} leadership.`,
      action: 'Schedule risk review',
    })
  }

  // Goals at risk
  for (const goal of goals.filter(g => g.status === 'active' && (g.successProb ?? 1) < 0.4).slice(0, 3)) {
    entries.push({
      source: 'goal', id: goal.id,
      title: goal.title,
      urgency: 'critical',
      recommendation: `Goal "${goal.title}" has only ${Math.round((goal.successProb ?? 0) * 100)}% success probability. Immediate re-planning required.`,
      action: 'Revise goal strategy',
    })
  }

  // Critical alerts
  for (const alert of activeAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 3)) {
    entries.push({
      source: 'signal', id: alert.id,
      title: alert.title,
      urgency: alert.severity as 'critical' | 'high',
      recommendation: 'Critical external intelligence alert requires executive decision on risk response.',
      action: 'Review and respond to alert',
    })
  }

  // Draft initiatives with no owner (action needed)
  const staleDrafts = initiatives.filter(i => i.status === 'draft').slice(0, 2)
  for (const ini of staleDrafts) {
    entries.push({
      source: 'initiative', id: ini.id,
      title: `Unactivated: ${ini.title}`,
      urgency: 'medium',
      recommendation: 'This strategic initiative is still in draft. Assign an owner and activate to maintain portfolio momentum.',
      action: 'Activate initiative',
    })
  }

  // Sort by urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return entries.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
}
