/**
 * Goals AI Engine — Reno Brain for strategic goal intelligence.
 *
 * Provides: progress analysis, success probability, risk detection,
 * AI mentor insights, roadmap generation, decision impact assessment.
 */

export interface GoalWithKpis {
  id: string
  title: string
  progress: number
  targetDate?: Date | string | null
  createdAt: Date | string
  status: string
  priority: string
  kpis: { current: number; target: number; baseline: number; trend: string; name: string; unit: string }[]
  children?: GoalWithKpis[]
  milestones?: { status: string; dueDate?: Date | string | null }[]
}

// ── Progress Intelligence ────────────────────────────────────────────────────

export interface ProgressAnalysis {
  progressPct: number
  expectedProgress: number
  deviation: number
  daysRemaining: number
  daysElapsed: number
  totalDays: number
  verdict: 'ahead' | 'on_track' | 'slightly_behind' | 'at_risk' | 'no_target'
  message: string
  daysAheadOrBehind: number
}

export function analyseProgress(goal: GoalWithKpis): ProgressAnalysis {
  const now = new Date()
  const created = new Date(goal.createdAt)

  if (!goal.targetDate) {
    return {
      progressPct: Math.round(goal.progress * 100),
      expectedProgress: 0, deviation: 0,
      daysRemaining: 0, daysElapsed: 0, totalDays: 0,
      verdict: 'no_target',
      message: 'No target date set — progress tracking requires a deadline.',
      daysAheadOrBehind: 0,
    }
  }

  const target = new Date(goal.targetDate)
  const totalDays = Math.max(1, Math.round((target.getTime() - created.getTime()) / 86400000))
  const daysElapsed = Math.max(0, Math.round((now.getTime() - created.getTime()) / 86400000))
  const daysRemaining = Math.max(0, Math.round((target.getTime() - now.getTime()) / 86400000))
  const expectedProgress = Math.min(1, daysElapsed / totalDays)
  const progressPct = Math.round(goal.progress * 100)
  const expectedPct = Math.round(expectedProgress * 100)
  const deviation = goal.progress - expectedProgress

  // Expected days at current rate
  let daysAheadOrBehind = 0
  if (goal.progress > 0 && goal.progress < 1) {
    const ratePerDay = goal.progress / Math.max(1, daysElapsed)
    const estimatedTotalDays = 1 / ratePerDay
    const estimatedFinish = new Date(created.getTime() + estimatedTotalDays * 86400000)
    daysAheadOrBehind = Math.round((target.getTime() - estimatedFinish.getTime()) / 86400000)
  }

  let verdict: ProgressAnalysis['verdict']
  let message: string

  if (deviation >= 0.1) {
    verdict = 'ahead'
    message = daysAheadOrBehind > 0
      ? `Excellent pace — at this rate you'll reach the goal ${Math.abs(daysAheadOrBehind)} days early.`
      : `Ahead of schedule. Keep the current momentum.`
  } else if (deviation >= -0.05) {
    verdict = 'on_track'
    message = `On track. Current progress: ${progressPct}%, expected: ${expectedPct}%.`
  } else if (deviation >= -0.15) {
    verdict = 'slightly_behind'
    message = daysAheadOrBehind < 0
      ? `Slightly behind schedule by ${Math.abs(daysAheadOrBehind)} days. A small push will get you back on track.`
      : `Slightly behind. Increase effort to meet the ${daysRemaining}-day deadline.`
  } else {
    verdict = 'at_risk'
    message = `At risk — ${Math.abs(daysAheadOrBehind)} days behind projected pace. Immediate attention required to meet the deadline.`
  }

  return { progressPct, expectedProgress: expectedPct, deviation: Math.round(deviation * 100), daysRemaining, daysElapsed, totalDays, verdict, message, daysAheadOrBehind }
}

// ── Success Probability ──────────────────────────────────────────────────────

export function estimateSuccessProb(goal: GoalWithKpis): number {
  let score = 50

  // Progress vs expected
  const analysis = analyseProgress(goal)
  if (analysis.verdict === 'ahead') score += 25
  else if (analysis.verdict === 'on_track') score += 10
  else if (analysis.verdict === 'slightly_behind') score -= 10
  else if (analysis.verdict === 'at_risk') score -= 25

  // KPI trends
  for (const kpi of goal.kpis) {
    if (kpi.trend === 'up' && kpi.current < kpi.target) score += 5
    else if (kpi.trend === 'down') score -= 8
  }

  // Priority weight
  if (goal.priority === 'critical') score += 5
  if (goal.priority === 'low') score -= 5

  // Milestone completion
  if (goal.milestones && goal.milestones.length > 0) {
    const completedMs = goal.milestones.filter(m => m.status === 'completed').length
    const ratio = completedMs / goal.milestones.length
    score += Math.round(ratio * 15)
    // Overdue milestones
    const now = new Date()
    const overdue = goal.milestones.filter(m => m.status === 'pending' && m.dueDate && new Date(m.dueDate) < now).length
    score -= overdue * 5
  }

  return Math.min(98, Math.max(5, Math.round(score))) / 100
}

// ── Risk Detection ───────────────────────────────────────────────────────────

export interface GoalRisk {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  mitigation: string
}

export function detectRisks(goal: GoalWithKpis): GoalRisk[] {
  const risks: GoalRisk[] = []
  const analysis = analyseProgress(goal)

  if (analysis.verdict === 'at_risk') {
    risks.push({
      type: 'deadline_risk', severity: 'critical',
      description: `Goal is ${Math.abs(analysis.daysAheadOrBehind)} days behind schedule.`,
      mitigation: 'Allocate more resources or adjust the target date. Review blockers immediately.',
    })
  }

  if (analysis.daysRemaining < 14 && goal.progress < 0.7) {
    risks.push({
      type: 'time_pressure', severity: 'high',
      description: `Only ${analysis.daysRemaining} days remaining with ${analysis.progressPct}% completion.`,
      mitigation: 'Focus exclusively on this goal for the next two weeks. Deprioritise other work.',
    })
  }

  for (const kpi of goal.kpis) {
    if (kpi.trend === 'down' && kpi.current < kpi.baseline) {
      risks.push({
        type: 'kpi_regression', severity: 'high',
        description: `KPI "${kpi.name}" is declining (${kpi.current}${kpi.unit} vs baseline ${kpi.baseline}${kpi.unit}).`,
        mitigation: `Investigate root cause of the ${kpi.name} decline and implement corrective actions.`,
      })
    }
  }

  if (goal.milestones) {
    const now = new Date()
    const overdue = goal.milestones.filter(m => m.status === 'pending' && m.dueDate && new Date(m.dueDate) < now)
    if (overdue.length > 0) {
      risks.push({
        type: 'overdue_milestones', severity: 'medium',
        description: `${overdue.length} milestone${overdue.length > 1 ? 's are' : ' is'} past due.`,
        mitigation: 'Complete or reschedule overdue milestones. Each overdue milestone delays the parent goal.',
      })
    }
  }

  if (!goal.targetDate) {
    risks.push({
      type: 'no_deadline', severity: 'low',
      description: 'Goal has no target date — progress cannot be tracked against a timeline.',
      mitigation: 'Set a realistic target date to enable progress tracking and AI predictions.',
    })
  }

  return risks
}

// ── AI Mentor Insight ────────────────────────────────────────────────────────

export function generateMentorInsight(goal: GoalWithKpis, allGoals: GoalWithKpis[]): string {
  const analysis = analyseProgress(goal)
  const risks = detectRisks(goal)
  const prob = estimateSuccessProb(goal)

  const lines: string[] = []

  // Opening based on status
  if (prob >= 0.8) {
    lines.push(`Strong execution on "${goal.title}". Success probability: ${Math.round(prob * 100)}%.`)
  } else if (prob >= 0.6) {
    lines.push(`"${goal.title}" is progressing but needs consistent attention. Success probability: ${Math.round(prob * 100)}%.`)
  } else {
    lines.push(`"${goal.title}" requires immediate strategic attention. Success probability: ${Math.round(prob * 100)}% — below the recommended 60% threshold.`)
  }

  // Progress commentary
  lines.push(analysis.message)

  // Top risk
  const criticalRisk = risks.find(r => r.severity === 'critical') ?? risks.find(r => r.severity === 'high')
  if (criticalRisk) {
    lines.push(`Key risk: ${criticalRisk.description} Recommended action: ${criticalRisk.mitigation}`)
  }

  // Dependency conflicts
  const siblingGoals = allGoals.filter(g => g.id !== goal.id && g.status === 'active')
  if (siblingGoals.length > 3) {
    lines.push(`You currently have ${siblingGoals.length} active goals. Consider focusing on the top 3 to avoid resource dilution.`)
  }

  // KPI commentary
  const decliningKpis = goal.kpis.filter(k => k.trend === 'down')
  if (decliningKpis.length > 0) {
    lines.push(`${decliningKpis.length} KPI${decliningKpis.length > 1 ? 's are' : ' is'} declining: ${decliningKpis.map(k => k.name).join(', ')}. Address these before they compound.`)
  }

  return lines.join(' ')
}

// ── Roadmap Generator ────────────────────────────────────────────────────────

export interface RoadmapPhase {
  phase: number
  label: string
  timeframe: string
  goals: string[]
  kpis: string[]
  actions: string[]
  budget?: string
}

export function generateRoadmap(
  goals: GoalWithKpis[],
  horizon: '30d' | '90d' | '1y' | '5y',
): { title: string; horizon: string; phases: RoadmapPhase[]; executiveSummary: string } {
  const activeGoals = goals.filter(g => g.status === 'active')
  const critical = activeGoals.filter(g => g.priority === 'critical' || g.priority === 'high')
  const medium = activeGoals.filter(g => g.priority === 'medium')
  const low = activeGoals.filter(g => g.priority === 'low')

  const phases: RoadmapPhase[] = []

  if (horizon === '30d') {
    phases.push({
      phase: 1, label: 'Immediate Sprint', timeframe: 'Week 1-2',
      goals: critical.slice(0, 2).map(g => g.title),
      kpis: critical.slice(0, 2).flatMap(g => g.kpis.slice(0, 1).map(k => `${k.name}: ${k.current}${k.unit} → ${k.target}${k.unit}`)),
      actions: ['Complete critical pending approvals', 'Resolve at-risk KPIs', 'Clear milestone backlog'],
    })
    phases.push({
      phase: 2, label: 'Consolidation', timeframe: 'Week 3-4',
      goals: medium.slice(0, 2).map(g => g.title),
      kpis: ['Weekly progress check on all active goals'],
      actions: ['Review goal progress', 'Update KPI baselines', 'Plan next month'],
    })
  } else if (horizon === '90d') {
    phases.push({
      phase: 1, label: 'Foundation', timeframe: 'Month 1',
      goals: critical.slice(0, 3).map(g => g.title),
      kpis: critical.flatMap(g => g.kpis.slice(0, 1).map(k => `${k.name} → ${k.target}${k.unit}`)),
      actions: ['Establish KPI baselines', 'Assign goal owners', 'Remove blockers'],
    })
    phases.push({
      phase: 2, label: 'Execution', timeframe: 'Month 2',
      goals: [...critical.slice(0, 2), ...medium.slice(0, 2)].map(g => g.title),
      kpis: ['Mid-quarter review of all KPIs', 'Milestone completion rate > 70%'],
      actions: ['Accelerate high-priority goals', 'Hire if needed', 'Review budget allocation'],
    })
    phases.push({
      phase: 3, label: 'Review & Adjust', timeframe: 'Month 3',
      goals: activeGoals.map(g => g.title),
      kpis: ['Final KPI assessment', 'Success rate target: 80%+'],
      actions: ['Complete Q review', 'Document learnings', 'Set next quarter goals'],
    })
  } else if (horizon === '1y') {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const phases12: RoadmapPhase[] = quarters.map((q, i) => ({
      phase: i + 1,
      label: q,
      timeframe: `Months ${i * 3 + 1}-${i * 3 + 3}`,
      goals: activeGoals.slice(i * 2, i * 2 + 2).map(g => g.title),
      kpis: ['Quarterly KPI review', `${q} progress: ${25 * (i + 1)}% of annual targets`],
      actions: i === 0
        ? ['Set annual baselines', 'Kick off priority goals', 'Build tracking dashboards']
        : i === 3
          ? ['Annual review', 'Set next year strategy', 'Document achievements']
          : [`${q} execution`, 'Mid-year adjustment', 'Resource rebalancing'],
    }))
    phases.push(...phases12)
  } else {
    // 5 years
    for (let y = 1; y <= 5; y++) {
      phases.push({
        phase: y,
        label: `Year ${y}`,
        timeframe: `Year ${y}`,
        goals: y === 1 ? critical.map(g => g.title) : y <= 2 ? medium.map(g => g.title) : [`Scale and optimise year ${y - 1} gains`],
        kpis: [`Year ${y}: ${20 * y}% progress toward 5-year vision`],
        actions: y === 1
          ? ['Foundation', 'Quick wins', 'Team building']
          : y === 5
            ? ['Market leadership', 'Strategic review', 'Long-term sustainability']
            : [`Year ${y} execution`, 'Scale operations', 'Explore new opportunities'],
        budget: y <= 2 ? 'Investment phase' : 'Growth phase',
      })
    }
  }

  const onTrack = activeGoals.filter(g => (estimateSuccessProb(g) ?? 0) >= 0.6).length
  const executiveSummary = `${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}. ${onTrack} on track (≥60% success probability). ${critical.length} high-priority goal${critical.length !== 1 ? 's' : ''} require focused attention over the ${horizon} horizon.`

  return {
    title: `${horizon === '30d' ? '30-Day' : horizon === '90d' ? '90-Day' : horizon === '1y' ? '1-Year' : '5-Year'} Strategic Roadmap`,
    horizon,
    phases,
    executiveSummary,
  }
}

// ── Decision Impact Assessment ───────────────────────────────────────────────

export interface DecisionImpact {
  decision: string
  affectedGoals: { goalId: string; goalTitle: string; impact: 'positive' | 'neutral' | 'negative'; reason: string }[]
  overallRisk: 'low' | 'medium' | 'high'
  recommendation: string
  proceed: boolean
}

export function assessDecisionImpact(
  decision: string,
  goals: GoalWithKpis[],
): DecisionImpact {
  const dec = decision.toLowerCase()
  const impacts: DecisionImpact['affectedGoals'] = []
  let negativeCount = 0

  for (const goal of goals) {
    const title = goal.title.toLowerCase()
    const category = (goal as GoalWithKpis & { category?: string }).category?.toLowerCase() ?? ''

    let impact: 'positive' | 'neutral' | 'negative' = 'neutral'
    let reason = 'No direct impact detected.'

    // Pattern matching for common decisions
    if ((dec.includes('hire') || dec.includes('recruit')) && (title.includes('team') || title.includes('staff') || title.includes('employee') || category === 'hiring')) {
      impact = 'positive'
      reason = 'Adding team members directly supports this goal.'
    } else if ((dec.includes('cut') || dec.includes('reduce') || dec.includes('layoff')) && (title.includes('team') || category === 'hiring')) {
      impact = 'negative'
      reason = 'Reducing staff may set back team-related goals.'
      negativeCount++
    } else if ((dec.includes('budget') || dec.includes('invest') || dec.includes('spend')) && category === 'cost') {
      impact = 'negative'
      reason = 'Additional spending conflicts with cost-reduction goals.'
      negativeCount++
    } else if (dec.includes('automat') && (category === 'cost' || title.includes('efficiency'))) {
      impact = 'positive'
      reason = 'Automation supports cost and efficiency goals.'
    } else if ((dec.includes('delay') || dec.includes('postpone')) && goal.status === 'active') {
      impact = 'negative'
      reason = 'Any delay ripples into this goal\'s timeline.'
      negativeCount++
    } else if (dec.includes('market') || dec.includes('campaign') || dec.includes('promot')) {
      if (title.includes('sales') || title.includes('revenue') || category === 'sales') {
        impact = 'positive'
        reason = 'Marketing investment supports revenue and sales goals.'
      }
    }

    impacts.push({ goalId: goal.id, goalTitle: goal.title, impact, reason })
  }

  const negRatio = impacts.length > 0 ? negativeCount / impacts.length : 0
  const overallRisk: DecisionImpact['overallRisk'] = negRatio > 0.5 ? 'high' : negRatio > 0.2 ? 'medium' : 'low'

  const recommendation = overallRisk === 'high'
    ? `This decision negatively impacts ${negativeCount} of your active goals. Strongly reconsider or restructure the approach.`
    : overallRisk === 'medium'
      ? `This decision has moderate risk — ${negativeCount} goal${negativeCount !== 1 ? 's' : ''} may be affected. Proceed with a clear mitigation plan.`
      : `Low risk decision. Positive or neutral impact on most goals. Safe to proceed.`

  return {
    decision,
    affectedGoals: impacts,
    overallRisk,
    recommendation,
    proceed: overallRisk !== 'high',
  }
}

// ── Goal Tree builder ────────────────────────────────────────────────────────

export function buildGoalTree(goals: GoalWithKpis[]): GoalWithKpis[] {
  const map = new Map<string, GoalWithKpis>()
  const roots: GoalWithKpis[] = []

  for (const g of goals) {
    map.set(g.id, { ...g, children: [] })
  }

  for (const g of goals) {
    const node = map.get(g.id)!
    const parentId = (g as GoalWithKpis & { parentId?: string | null }).parentId
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

// ── KPI trend update ─────────────────────────────────────────────────────────

export function computeTrend(prev: number, current: number, target: number): 'up' | 'down' | 'stable' {
  const delta = current - prev
  if (Math.abs(delta) < 0.01 * target) return 'stable'
  return delta > 0 ? 'up' : 'down'
}
