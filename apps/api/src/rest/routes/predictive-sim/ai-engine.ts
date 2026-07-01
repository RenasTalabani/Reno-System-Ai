// Phase 44 — AI Predictive Simulation Engine
// All computation performed by Reno Brain (local deterministic + stochastic logic).

export type ScenarioType =
  | 'revenue_change' | 'cost_reduction' | 'new_branch' | 'hiring'
  | 'currency_change' | 'demand_loss' | 'warehouse_outage'
  | 'price_increase' | 'raw_material_spike' | 'investment'

export interface ScenarioParams {
  type: ScenarioType
  parameters: Record<string, number>
  baselineRevenue: number
  baselineCost: number
  baselineHeadcount: number
  timeHorizon: number  // months
}

export interface OutcomeMetrics {
  revenue: number
  cost: number
  profit: number
  margin: number        // profit / revenue
  cashFlow: number
  roi?: number          // for investment scenarios
  headcountCost?: number
  additionalRevenue?: number
  additionalCost?: number
  netImpact: number     // profit delta vs baseline
}

export interface SensitivityFactor {
  factor: string
  impactOnProfit: number  // absolute delta
  sensitivityScore: number  // 0-1 normalised
  direction: 'increases_profit' | 'decreases_profit'
}

export interface MonteCarloResult {
  p10: OutcomeMetrics
  p50: OutcomeMetrics
  p90: OutcomeMetrics
  successRate: number     // % iterations with positive profit delta
  meanProfit: number
  stdDevProfit: number
}

export interface SimulationResult {
  base: OutcomeMetrics
  pessimistic: OutcomeMetrics
  optimistic: OutcomeMetrics
  monteCarlo: MonteCarloResult
  sensitivityAnalysis: SensitivityFactor[]
  risks: string[]
  opportunities: string[]
  recommendation: string
  executiveSummary: string
  breakEvenMonths?: number
}

// ── Gaussian noise (Box-Muller transform) ─────────────────────────────────────

function gaussian(mean: number, stddev: number): number {
  const u1 = Math.max(Number.EPSILON, Math.random())
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stddev
}

// ── Outcome computation per scenario type ─────────────────────────────────────

function computeOutcome(params: ScenarioParams, noiseMultiplier = 1): OutcomeMetrics {
  const { type, parameters: p, baselineRevenue: rev, baselineCost: cost, timeHorizon } = params
  const baselineProfit = rev - cost

  let newRevenue = rev
  let newCost = cost
  let additionalRevenue = 0
  let additionalCost = 0
  let roi: number | undefined
  let headcountCost: number | undefined
  let breakEvenMonths: number | undefined

  switch (type) {
    case 'revenue_change': {
      const changePct = (p.change_pct ?? 0.2) * noiseMultiplier
      additionalRevenue = rev * changePct
      newRevenue = rev + additionalRevenue
      // Variable costs scale with 30% of revenue change
      additionalCost = additionalRevenue * 0.3
      newCost = cost + additionalCost
      break
    }

    case 'cost_reduction': {
      const reductionPct = Math.min(0.5, (p.reduction_pct ?? 0.15) * noiseMultiplier)
      additionalCost = -(cost * reductionPct)
      newCost = cost + additionalCost
      break
    }

    case 'new_branch': {
      const setupCost = (p.setup_cost ?? 100000) * noiseMultiplier
      const monthlyRevenue = (p.monthly_revenue ?? 50000) * noiseMultiplier
      const monthlyCost = (p.monthly_cost ?? 35000) * (2 - noiseMultiplier + 0.5)  // costs have reverse noise
      const annualRevenue = monthlyRevenue * timeHorizon
      const annualCost = monthlyCost * timeHorizon + setupCost
      additionalRevenue = annualRevenue
      additionalCost = annualCost
      newRevenue = rev + annualRevenue
      newCost = cost + annualCost
      const monthlyProfit = monthlyRevenue - monthlyCost
      breakEvenMonths = monthlyProfit > 0 ? Math.ceil(setupCost / monthlyProfit) : undefined
      break
    }

    case 'hiring': {
      const count = Math.round((p.count ?? 10) * noiseMultiplier)
      const avgSalary = p.avg_salary_monthly ?? 5000
      const productivityFactor = p.productivity_factor ?? 1.5  // revenue generated per salary unit
      headcountCost = count * avgSalary * timeHorizon
      additionalRevenue = headcountCost * productivityFactor * noiseMultiplier
      additionalCost = headcountCost
      newRevenue = rev + additionalRevenue
      newCost = cost + additionalCost
      break
    }

    case 'currency_change': {
      const changePct = (p.change_pct ?? 0.1) * noiseMultiplier  // e.g. USD +10%
      const importExposure = p.import_exposure ?? 0.3   // 30% of costs are imports
      const exportExposure = p.export_exposure ?? 0.2   // 20% of revenue is exports
      additionalRevenue = rev * exportExposure * changePct
      additionalCost = cost * importExposure * changePct  // imports become more expensive
      newRevenue = rev + additionalRevenue
      newCost = cost + additionalCost
      break
    }

    case 'demand_loss': {
      const lossPct = Math.min(0.9, (p.loss_pct ?? 0.2) * noiseMultiplier)
      const revenueLoss = rev * lossPct
      // Costs don't drop immediately — only 40% variable
      const costSaving = cost * 0.4 * lossPct
      additionalRevenue = -revenueLoss
      additionalCost = -costSaving
      newRevenue = rev - revenueLoss
      newCost = cost - costSaving
      break
    }

    case 'warehouse_outage': {
      const days = (p.outage_days ?? 14) * noiseMultiplier
      const monthlyRevenue = rev / 12
      const dailyRevenue = monthlyRevenue / 30
      const lossRate = p.revenue_loss_rate ?? 0.7  // 70% of daily revenue lost
      additionalRevenue = -(dailyRevenue * days * lossRate)
      additionalCost = (p.recovery_cost ?? 20000) * noiseMultiplier
      newRevenue = rev + additionalRevenue
      newCost = cost + additionalCost
      break
    }

    case 'price_increase': {
      const increasePct = (p.increase_pct ?? 0.1) * noiseMultiplier
      const elasticity = p.demand_elasticity ?? -0.5
      const demandChange = 1 + elasticity * increasePct
      newRevenue = rev * (1 + increasePct) * demandChange
      additionalRevenue = newRevenue - rev
      break
    }

    case 'raw_material_spike': {
      const spikePct = (p.spike_pct ?? 0.2) * noiseMultiplier
      const materialShare = p.material_share ?? 0.35
      additionalCost = cost * materialShare * spikePct
      newCost = cost + additionalCost
      break
    }

    case 'investment': {
      const amount = (p.investment_amount ?? 500000) * noiseMultiplier
      const expectedRoiPct = (p.expected_roi_pct ?? 0.25) * noiseMultiplier
      const revenueBoost = amount * expectedRoiPct
      additionalRevenue = revenueBoost
      additionalCost = amount / timeHorizon  // amortised over horizon
      newRevenue = rev + additionalRevenue
      newCost = cost + (amount / timeHorizon)
      roi = (revenueBoost - amount) / amount
      break
    }
  }

  const newProfit = newRevenue - newCost
  const margin = newRevenue > 0 ? newProfit / newRevenue : 0
  const cashFlow = newProfit * 0.85  // 85% cash conversion assumption

  return {
    revenue: Math.round(newRevenue),
    cost: Math.round(newCost),
    profit: Math.round(newProfit),
    margin: Math.round(margin * 1000) / 1000,
    cashFlow: Math.round(cashFlow),
    netImpact: Math.round(newProfit - baselineProfit),
    additionalRevenue: additionalRevenue !== 0 ? Math.round(additionalRevenue) : undefined,
    additionalCost: additionalCost !== 0 ? Math.round(additionalCost) : undefined,
    roi,
    headcountCost,
  }
}

// ── Monte Carlo simulation ────────────────────────────────────────────────────

export function runMonteCarlo(params: ScenarioParams, iterations = 1000): MonteCarloResult {
  const results: number[] = []  // track profit outcomes
  const allOutcomes: OutcomeMetrics[] = []

  for (let i = 0; i < iterations; i++) {
    const noise = gaussian(1, 0.12)  // mean 1, 12% std dev
    const clampedNoise = Math.max(0.4, Math.min(2.0, noise))
    const outcome = computeOutcome(params, clampedNoise)
    results.push(outcome.profit)
    allOutcomes.push(outcome)
  }

  results.sort((a, b) => a - b)

  const p10Idx = Math.floor(iterations * 0.1)
  const p50Idx = Math.floor(iterations * 0.5)
  const p90Idx = Math.floor(iterations * 0.9)

  const baselineProfit = params.baselineRevenue - params.baselineCost
  const successCount = results.filter(p => p > baselineProfit).length
  const mean = results.reduce((s, v) => s + v, 0) / results.length
  const variance = results.reduce((s, v) => s + (v - mean) ** 2, 0) / results.length

  return {
    p10: allOutcomes.sort((a, b) => a.profit - b.profit)[p10Idx],
    p50: allOutcomes.sort((a, b) => a.profit - b.profit)[p50Idx],
    p90: allOutcomes.sort((a, b) => a.profit - b.profit)[p90Idx],
    successRate: successCount / iterations,
    meanProfit: Math.round(mean),
    stdDevProfit: Math.round(Math.sqrt(variance)),
  }
}

// ── Sensitivity analysis ──────────────────────────────────────────────────────

export function runSensitivityAnalysis(params: ScenarioParams): SensitivityFactor[] {
  const base = computeOutcome(params, 1)
  const paramKeys = Object.keys(params.parameters)
  const factors: SensitivityFactor[] = []

  // Vary each parameter ±10% and measure profit impact
  for (const key of paramKeys) {
    const original = params.parameters[key]
    if (typeof original !== 'number') continue

    // High value
    const highParams = { ...params, parameters: { ...params.parameters, [key]: original * 1.1 } }
    const highOutcome = computeOutcome(highParams, 1)

    // Low value
    const lowParams = { ...params, parameters: { ...params.parameters, [key]: original * 0.9 } }
    const lowOutcome = computeOutcome(lowParams, 1)

    const swing = Math.abs(highOutcome.profit - lowOutcome.profit)
    const impactOnProfit = highOutcome.profit - base.profit

    factors.push({
      factor: key.replace(/_/g, ' '),
      impactOnProfit: Math.round(impactOnProfit),
      sensitivityScore: swing,
      direction: impactOnProfit >= 0 ? 'increases_profit' : 'decreases_profit',
    })
  }

  // Normalise sensitivity scores
  const maxSwing = Math.max(...factors.map(f => f.sensitivityScore), 1)
  for (const f of factors) {
    f.sensitivityScore = Math.round((f.sensitivityScore / maxSwing) * 100) / 100
  }

  return factors.sort((a, b) => b.sensitivityScore - a.sensitivityScore)
}

// ── Risk & opportunity text ───────────────────────────────────────────────────

const SCENARIO_RISKS: Record<string, string[]> = {
  revenue_change: [
    'Revenue increase assumptions may not materialise if market conditions change.',
    'Higher revenue may require proportional increase in operational capacity.',
    'Customer acquisition costs could offset new revenue gains.',
  ],
  cost_reduction: [
    'Aggressive cost cutting may impact product/service quality.',
    'Employee morale and retention could be affected by cuts.',
    'Savings may not be fully realisable due to fixed commitments.',
  ],
  new_branch: [
    'Local market demand may be lower than projected.',
    'Setup costs often exceed initial estimates by 20-30%.',
    'Operational complexity increases with multi-location management.',
    'Break-even timeline may extend if ramp-up is slower than expected.',
  ],
  hiring: [
    'New employees take 3-6 months to reach full productivity.',
    'Recruitment and onboarding costs are often underestimated.',
    'Poor culture fit can lead to costly turnover.',
  ],
  currency_change: [
    'Currency movements are inherently unpredictable and can reverse quickly.',
    'Hedging strategies add cost and complexity.',
    'Second-order effects on supplier pricing may be delayed.',
  ],
  demand_loss: [
    'Customer recovery is typically slow and expensive.',
    'Fixed costs remain even as revenue drops.',
    'Reputation damage may extend beyond the immediate client loss.',
    'Competitors may rapidly capture lost market share.',
  ],
  warehouse_outage: [
    'Customer delivery failures may trigger contract penalties.',
    'Insurance recovery timelines are uncertain.',
    'Supply chain disruptions may cascade beyond the outage period.',
  ],
  price_increase: [
    'Demand elasticity estimates may understate customer churn.',
    'Competitors may not follow price increases, weakening position.',
    'Key account renegotiation risk increases at contract renewal.',
  ],
  raw_material_spike: [
    'Ability to pass cost increases to customers is limited.',
    'Margin compression may be prolonged if the spike persists.',
    'Inventory hedging decisions must be made quickly.',
  ],
  investment: [
    'ROI realisation is typically delayed by 12-24 months.',
    'Capital tied up reduces financial flexibility.',
    'Integration or execution risk may reduce actual returns.',
  ],
}

const SCENARIO_OPPORTUNITIES: Record<string, string[]> = {
  revenue_change: [
    'Economies of scale reduce per-unit cost as revenue grows.',
    'Stronger market position enables premium pricing over time.',
    'Improved cash flow supports further growth initiatives.',
  ],
  cost_reduction: [
    'Improved margins create buffer for price competition.',
    'Freed capital can be redeployed into growth initiatives.',
    'Operational efficiency often improves service speed and quality.',
  ],
  new_branch: [
    'Geographic diversification reduces single-market risk.',
    'New branch builds brand awareness in target market.',
    'Cross-selling between locations can accelerate growth.',
  ],
  hiring: [
    'Right talent can unlock capabilities not currently available.',
    'Team expansion enables handling of larger client accounts.',
    'Culture investment now reduces future turnover costs.',
  ],
  currency_change: [
    'Export revenue benefits from weaker home currency.',
    'Favourable exchange rate window for capital equipment imports.',
    'Competitive advantage vs local-only competitors in target markets.',
  ],
  demand_loss: [
    'Triggers strategic review that often finds efficiency improvements.',
    'Opportunity to diversify customer base to reduce concentration risk.',
    'Pricing and product strategy refinement driven by feedback.',
  ],
  warehouse_outage: [
    'Opportunity to review and upgrade warehouse systems post-recovery.',
    'Insurance claim may partially offset financial impact.',
    'Triggers business continuity planning improvements.',
  ],
  price_increase: [
    'Margin improvement funds product investment and quality improvements.',
    'Signals market leadership position if demand holds.',
    'Revenue per customer increases without proportional cost increase.',
  ],
  raw_material_spike: [
    'Opportunity to negotiate long-term supply contracts at current prices.',
    'Drives innovation in material substitution and efficiency.',
    'Forces review of product mix to prioritise higher-margin items.',
  ],
  investment: [
    'Compound returns over multi-year horizon typically exceed short-term costs.',
    'Strategic assets create barriers to entry for competitors.',
    'Early mover advantage in new capabilities or markets.',
  ],
}

function buildRecommendation(params: ScenarioParams, base: OutcomeMetrics, mc: MonteCarloResult): string {
  const positive = base.netImpact > 0
  const successPct = Math.round(mc.successRate * 100)
  const impact = Math.abs(base.netImpact).toLocaleString()

  if (positive && successPct >= 70) {
    return `This scenario shows a net positive impact of ${impact} on annual profit with ${successPct}% probability of success across Monte Carlo iterations. The risk-adjusted case supports moving forward. Focus on the high-sensitivity factors from the analysis to maximise outcome.`
  }
  if (positive && successPct >= 50) {
    return `The base case shows a positive impact of ${impact}, but Monte Carlo analysis yields only ${successPct}% success probability. Proceed with caution — implement in phases and establish clear exit criteria if early KPIs underperform.`
  }
  if (!positive && successPct >= 70) {
    return `Paradoxically, the base case shows a negative impact of ${impact}, but ${successPct}% of Monte Carlo scenarios achieve positive outcomes. This suggests high variability — the actual result depends heavily on execution quality and market conditions.`
  }
  return `The base case and Monte Carlo both indicate elevated risk. Net impact is ${positive ? '+' : '-'}${impact} with only ${successPct}% success probability. Consider alternative scenarios or risk mitigation before committing.`
}

function buildExecutiveSummary(params: ScenarioParams, base: OutcomeMetrics, pessimistic: OutcomeMetrics, optimistic: OutcomeMetrics, mc: MonteCarloResult): string {
  const scenarioLabel = params.type.replace(/_/g, ' ')
  const baseline = params.baselineRevenue - params.baselineCost
  return [
    `What-if scenario: "${scenarioLabel}" over a ${params.timeHorizon}-month horizon.`,
    `Baseline profit: ${baseline.toLocaleString()} → Base case: ${base.profit.toLocaleString()} (${base.netImpact >= 0 ? '+' : ''}${base.netImpact.toLocaleString()}).`,
    `Range: Pessimistic ${pessimistic.profit.toLocaleString()} | Base ${base.profit.toLocaleString()} | Optimistic ${optimistic.profit.toLocaleString()}.`,
    `Monte Carlo (1000 iterations): P50 ${mc.p50.profit.toLocaleString()}, ${Math.round(mc.successRate * 100)}% of scenarios beat baseline.`,
  ].join(' ')
}

// ── Main simulate function ────────────────────────────────────────────────────

export function simulate(params: ScenarioParams, iterations = 1000): SimulationResult {
  const base = computeOutcome(params, 1)
  const pessimistic = computeOutcome(params, 0.6)  // 60% of expected uplift
  const optimistic = computeOutcome(params, 1.5)   // 150% of expected uplift

  const monteCarlo = runMonteCarlo(params, iterations)
  const sensitivityAnalysis = runSensitivityAnalysis(params)

  const risks = SCENARIO_RISKS[params.type] ?? []
  const opportunities = SCENARIO_OPPORTUNITIES[params.type] ?? []
  const recommendation = buildRecommendation(params, base, monteCarlo)
  const executiveSummary = buildExecutiveSummary(params, base, pessimistic, optimistic, monteCarlo)

  const result: SimulationResult = {
    base, pessimistic, optimistic, monteCarlo, sensitivityAnalysis,
    risks, opportunities, recommendation, executiveSummary,
  }

  // Break-even for branch/investment scenarios
  if (params.type === 'new_branch') {
    const monthlyProfit = (params.parameters.monthly_revenue ?? 50000) - (params.parameters.monthly_cost ?? 35000)
    if (monthlyProfit > 0) result.breakEvenMonths = Math.ceil((params.parameters.setup_cost ?? 100000) / monthlyProfit)
  }
  if (params.type === 'investment') {
    const annual = params.parameters.investment_amount ?? 500000
    const annualReturn = annual * (params.parameters.expected_roi_pct ?? 0.25)
    if (annualReturn > 0) result.breakEvenMonths = Math.ceil((annual / annualReturn) * 12)
  }

  return result
}

// ── Decision comparison ────────────────────────────────────────────────────────

export interface ComparisonEntry {
  scenarioId: string
  scenarioName: string
  type: string
  base: OutcomeMetrics
  successRate: number
  rank: number
  verdict: 'recommended' | 'viable' | 'risky' | 'not_recommended'
  notes: string
}

export function compareScenarios(scenarios: { id: string; name: string; params: ScenarioParams }[]): ComparisonEntry[] {
  const results = scenarios.map(s => {
    const result = simulate(s.params, 500)  // fewer iterations for comparison speed
    return { scenarioId: s.id, scenarioName: s.name, type: s.params.type, result }
  })

  // Sort by Monte Carlo P50 profit descending
  results.sort((a, b) => b.result.monteCarlo.p50.profit - a.result.monteCarlo.p50.profit)

  return results.map((r, i) => {
    const successPct = Math.round(r.result.monteCarlo.successRate * 100)
    const netImpact = r.result.base.netImpact

    let verdict: ComparisonEntry['verdict']
    if (successPct >= 70 && netImpact > 0) verdict = 'recommended'
    else if (successPct >= 50 && netImpact > 0) verdict = 'viable'
    else if (successPct >= 30) verdict = 'risky'
    else verdict = 'not_recommended'

    const notes = `Net impact: ${netImpact >= 0 ? '+' : ''}${netImpact.toLocaleString()}. Success rate: ${successPct}%.`

    return {
      scenarioId: r.scenarioId,
      scenarioName: r.scenarioName,
      type: r.type,
      base: r.result.base,
      successRate: r.result.monteCarlo.successRate,
      rank: i + 1,
      verdict,
      notes,
    }
  })
}
