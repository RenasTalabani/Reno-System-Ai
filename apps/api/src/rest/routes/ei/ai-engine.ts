// Phase 65 — Executive Intelligence AI Engine (Final Phase)

export function analyzeStrategicGoal(goal: {
  title: string
  category: string
  progress: number
  targetDate?: Date | null
  targetValue?: number | null
  currentValue: number
  status: string
}) {
  // AI probability of achieving by target date
  let aiProbability = goal.progress / 100

  if (goal.targetDate) {
    const totalDays = goal.targetDate.getTime() - new Date().getTime()
    const daysLeft = totalDays / (1000 * 60 * 60 * 24)
    if (daysLeft < 0) aiProbability *= 0.3 // target date passed
    else if (daysLeft < 30 && goal.progress < 80) aiProbability *= 0.5
    else if (goal.status === 'on_track') aiProbability = Math.min(0.95, aiProbability + 0.1)
    else if (goal.status === 'at_risk') aiProbability *= 0.7
    else if (goal.status === 'behind') aiProbability *= 0.4
    else if (goal.status === 'achieved') aiProbability = 1.0
  }

  aiProbability = Math.max(0.05, Math.min(0.99, aiProbability))

  // Projected completion date
  const velocityPct = goal.progress / 100
  const aiProjectedDate = goal.targetDate && velocityPct > 0
    ? new Date(Date.now() + ((1 - velocityPct) / velocityPct) * (goal.targetDate.getTime() - Date.now() + Date.now()) * 0.1)
    : null

  const insights: string[] = []
  if (goal.progress >= 90) insights.push('Near completion — finalize and prepare for goal closure')
  else if (goal.progress >= 70) insights.push('Good progress — maintain current momentum')
  else if (goal.progress >= 40) insights.push('Mid-journey — validate key results are on track')
  else if (goal.status === 'behind') insights.push('Behind schedule — escalate to leadership and review blockers')
  else insights.push('Early stage — ensure resources are allocated and milestones defined')

  if (aiProbability < 0.5) insights.push(`AI predicts ${(aiProbability * 100).toFixed(0)}% chance of on-time achievement — consider scope adjustment`)

  const keyResults = [
    `Progress: ${goal.progress.toFixed(0)}%`,
    goal.targetValue ? `Target: ${goal.targetValue} | Current: ${goal.currentValue}` : `Status: ${goal.status}`,
    `AI confidence: ${(aiProbability * 100).toFixed(0)}%`,
  ]

  return { aiProbability: Math.round(aiProbability * 100) / 100, aiProjectedDate, insights, keyResults }
}

export function analyzeBoardMetric(metric: { metricCode: string; metricName: string; actual: number; target: number; benchmark?: number | null }) {
  const attainment = metric.target > 0 ? (metric.actual / metric.target) * 100 : 0
  const vsBenchmark = metric.benchmark ? ((metric.actual - metric.benchmark) / metric.benchmark) * 100 : null

  const aiTrend = attainment >= 105 ? 'outperforming' : attainment >= 95 ? 'on_target' : attainment >= 80 ? 'below_target' : 'underperforming'
  const aiPredicted = Math.max(0, metric.actual * (1 + (attainment >= 100 ? 0.05 : attainment >= 85 ? 0.02 : -0.02)))

  let aiComment = `${metric.metricName} at ${attainment.toFixed(0)}% of target. `
  if (vsBenchmark !== null) aiComment += `${vsBenchmark > 0 ? '+' : ''}${vsBenchmark.toFixed(0)}% vs benchmark. `
  aiComment += `AI projection: ${aiPredicted.toFixed(1)} next period. Trend: ${aiTrend}.`

  return { aiPredicted: Math.round(aiPredicted * 100) / 100, aiTrend, aiComment }
}

export function processCompetitorSignal(signal: { signalType: string; summary: string; competitor: string; impact: string }) {
  const responseMap: Record<string, string> = {
    product: `Counter-strategy: Accelerate your product roadmap differentiation and highlight unique value props vs ${signal.competitor}`,
    pricing: `Pricing alert: Review your pricing strategy — consider value-based pricing to defend against ${signal.competitor}'s move`,
    talent: `Talent risk: Audit retention risks in key teams — ${signal.competitor} may be targeting your talent pool`,
    market: `Market shift: Monitor ${signal.competitor}'s expansion carefully — consider pre-emptive customer success outreach`,
    partnership: `Partnership signal: Evaluate partnership opportunities to match or outflank ${signal.competitor}'s new alliance`,
    funding: `Funding alert: ${signal.competitor} has new capital. Accelerate strategic initiatives before they scale`,
  }

  return responseMap[signal.signalType] ?? `Monitor ${signal.competitor}'s ${signal.signalType} activity and prepare competitive response`
}

export function generateExecutiveInsights(
  goals: Array<{ title: string; status: string; aiProbability: number; category: string }>,
  metrics: Array<{ metricName: string; actual: number; target: number; aiTrend: string }>,
  competitors: Array<{ competitor: string; signalType: string; impact: string }>,
) {
  const insights: Array<{ type: string; title: string; summary: string; urgency: string; impact: string; confidence: number; actionItems: string[] }> = []

  // Goal health
  const atRisk = goals.filter(g => g.status === 'at_risk' || g.status === 'behind')
  const achieved = goals.filter(g => g.status === 'achieved')
  if (atRisk.length > 0) {
    insights.push({
      type: 'strategic',
      title: `${atRisk.length} Strategic Goal(s) At Risk`,
      summary: `${atRisk.map(g => g.title).join(', ')} require executive intervention to get back on track.`,
      urgency: 'high', impact: 'high', confidence: 0.85,
      actionItems: ['Schedule emergency strategy review', 'Reassign resources to at-risk goals', 'Set 2-week recovery milestones'],
    })
  }
  if (achieved.length > 0) {
    insights.push({
      type: 'opportunity',
      title: `${achieved.length} Goal(s) Achieved — Expand Ambition`,
      summary: `${achieved.map(g => g.title).join(', ')} reached their targets. Now set stretch goals.`,
      urgency: 'low', impact: 'medium', confidence: 0.9,
      actionItems: ['Celebrate wins with the team', 'Set next-level targets', 'Document success playbooks'],
    })
  }

  // Financial performance
  const underperforming = metrics.filter(m => m.aiTrend === 'underperforming' || m.aiTrend === 'below_target')
  if (underperforming.length > 0) {
    insights.push({
      type: 'financial',
      title: `${underperforming.length} Board Metric(s) Below Target`,
      summary: `${underperforming.map(m => m.metricName).join(', ')} are underperforming. Board briefing recommended.`,
      urgency: 'high', impact: 'high', confidence: 0.8,
      actionItems: ['Prepare board briefing with root causes', 'Initiate performance improvement plans', 'Review budget reallocation options'],
    })
  }

  // Competitive intelligence
  if (competitors.filter(c => c.impact === 'high').length > 0) {
    const highImpact = competitors.filter(c => c.impact === 'high')
    insights.push({
      type: 'market',
      title: `High-Impact Competitive Signals Detected`,
      summary: `${[...new Set(highImpact.map(c => c.competitor))].join(', ')} made significant moves requiring response.`,
      urgency: 'high', impact: 'transformative', confidence: 0.75,
      actionItems: ['Convene competitive strategy session', 'Brief customer-facing teams', 'Review go-to-market positioning'],
    })
  }

  return insights
}

export function computeExecutiveSummary(goals: Array<{ status: string; aiProbability: number; progress: number }>, metrics: Array<{ actual: number; target: number }>) {
  const totalGoals = goals.length
  const achievedGoals = goals.filter(g => g.status === 'achieved').length
  const onTrack = goals.filter(g => g.status === 'on_track').length
  const atRisk = goals.filter(g => g.status === 'at_risk' || g.status === 'behind').length
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / totalGoals) : 0
  const avgProbability = totalGoals > 0 ? Math.round(goals.reduce((s, g) => s + g.aiProbability, 0) / totalGoals * 100) : 0

  const totalTarget = metrics.reduce((s, m) => s + m.target, 0)
  const totalActual = metrics.reduce((s, m) => s + m.actual, 0)
  const avgMetricAttainment = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  return {
    totalGoals, achievedGoals, onTrack, atRisk,
    avgProgress, avgProbability,
    totalMetrics: metrics.length,
    avgMetricAttainment,
    healthScore: Math.round((onTrack / Math.max(1, totalGoals)) * 50 + (avgMetricAttainment / 200) * 50),
  }
}
