// Phase 67 — Resilience simulation engine (no real infra ops; safe mode only)

export interface HealthResult {
  component: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  errorRate: number
  resilienceScore: number
  details: Record<string, unknown>
}

const COMPONENTS = [
  'database', 'redis', 'api', 'web', 'storage',
  'ai_providers', 'integration_hub', 'job_queue', 'backup',
]

const COMPONENT_WEIGHTS: Record<string, number> = {
  database: 25, redis: 10, api: 20, web: 15, storage: 10,
  ai_providers: 5, integration_hub: 5, job_queue: 5, backup: 5,
}

const LATENCY_PROFILES: Record<string, number> = {
  database: 12, redis: 2, api: 45, web: 120, storage: 30,
  ai_providers: 1200, integration_hub: 200, job_queue: 50, backup: 500,
}

export function simulateHealthCheck(component: string, forceStatus?: string): HealthResult {
  const baseLatency = LATENCY_PROFILES[component] ?? 100
  const roll = Math.random()

  let status: 'healthy' | 'degraded' | 'down'
  if (forceStatus === 'down') status = 'down'
  else if (forceStatus === 'degraded') status = 'degraded'
  else if (roll > 0.95) status = 'degraded'
  else status = 'healthy'

  const latencyMultiplier = status === 'degraded' ? 3.5 : status === 'down' ? 0 : 1
  const latencyMs = status === 'down' ? 0 : Math.round(baseLatency * latencyMultiplier + Math.random() * 20)
  const errorRate = status === 'down' ? 1.0 : status === 'degraded' ? 0.15 + Math.random() * 0.2 : Math.random() * 0.01

  const resilienceScore = status === 'down' ? 0 : status === 'degraded' ? 45 + Math.random() * 20 : 85 + Math.random() * 15

  return {
    component,
    status,
    latencyMs,
    errorRate: Math.round(errorRate * 1000) / 1000,
    resilienceScore: Math.round(resilienceScore * 10) / 10,
    details: buildDetails(component, status, latencyMs, errorRate),
  }
}

function buildDetails(component: string, status: string, latencyMs: number, errorRate: number): Record<string, unknown> {
  const base = { status, latencyMs, errorRate: Math.round(errorRate * 1000) / 1000 }
  switch (component) {
    case 'database':
      return { ...base, connections: status === 'down' ? 0 : Math.floor(5 + Math.random() * 45), queryTimeP99: latencyMs * 3, replicationLag: status === 'degraded' ? Math.floor(Math.random() * 5000) : 0 }
    case 'redis':
      return { ...base, connectedClients: status === 'down' ? 0 : Math.floor(10 + Math.random() * 90), memoryUsedMb: Math.floor(50 + Math.random() * 200), hitRate: status === 'degraded' ? 0.4 : 0.92 + Math.random() * 0.07 }
    case 'api':
      return { ...base, rps: status === 'down' ? 0 : Math.floor(80 + Math.random() * 420), p95LatencyMs: latencyMs * 2, activeRequests: Math.floor(Math.random() * 30) }
    case 'ai_providers':
      return { ...base, renoBrainStatus: status === 'down' ? 'down' : 'healthy', claudeStatus: status === 'degraded' ? 'degraded' : 'healthy', openaiStatus: 'healthy' }
    default:
      return base
  }
}

export function runAllHealthChecks(): HealthResult[] {
  return COMPONENTS.map(c => simulateHealthCheck(c))
}

export function computeResilienceScore(snapshots: HealthResult[]): number {
  const totalWeight = Object.values(COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0)
  let weighted = 0
  for (const snap of snapshots) {
    const w = COMPONENT_WEIGHTS[snap.component] ?? 5
    weighted += snap.resilienceScore * w
  }
  return Math.round((weighted / totalWeight) * 10) / 10
}

export function evaluateCircuitBreaker(current: {
  state: string; failureCount: number; failureThreshold: number; nextRetryAt: Date | null
}, componentStatus: 'healthy' | 'degraded' | 'down'): {
  newState: string; newFailureCount: number; newSuccessCount: number; reason: string
  openedAt: Date | null; nextRetryAt: Date | null
} {
  const now = new Date()

  if (componentStatus === 'down') {
    const newFailures = current.failureCount + 2
    if (current.state === 'closed' && newFailures >= current.failureThreshold) {
      const retry = new Date(now.getTime() + 60_000)
      return { newState: 'open', newFailureCount: newFailures, newSuccessCount: 0, reason: 'Component reported DOWN — circuit opened', openedAt: now, nextRetryAt: retry }
    }
    if (current.state === 'half_open') {
      const retry = new Date(now.getTime() + 60_000)
      return { newState: 'open', newFailureCount: newFailures, newSuccessCount: 0, reason: 'Half-open probe failed — circuit re-opened', openedAt: now, nextRetryAt: retry }
    }
    return { newState: current.state, newFailureCount: newFailures, newSuccessCount: 0, reason: 'Failure recorded', openedAt: null, nextRetryAt: current.nextRetryAt }
  }

  if (componentStatus === 'degraded') {
    const newFailures = current.failureCount + 1
    if (current.state === 'closed' && newFailures >= current.failureThreshold) {
      const retry = new Date(now.getTime() + 60_000)
      return { newState: 'open', newFailureCount: newFailures, newSuccessCount: 0, reason: 'Degraded failures exceeded threshold', openedAt: now, nextRetryAt: retry }
    }
    return { newState: current.state, newFailureCount: newFailures, newSuccessCount: 0, reason: 'Degraded signal recorded', openedAt: null, nextRetryAt: current.nextRetryAt }
  }

  // healthy
  if (current.state === 'open') {
    if (current.nextRetryAt && now >= current.nextRetryAt) {
      return { newState: 'half_open', newFailureCount: 0, newSuccessCount: 1, reason: 'Recovery timeout elapsed — probing half-open', openedAt: null, nextRetryAt: null }
    }
    return { newState: 'open', newFailureCount: current.failureCount, newSuccessCount: 0, reason: 'Still in recovery window', openedAt: null, nextRetryAt: current.nextRetryAt }
  }
  if (current.state === 'half_open') {
    return { newState: 'closed', newFailureCount: 0, newSuccessCount: current.failureCount + 1, reason: 'Probe succeeded — circuit closed', openedAt: null, nextRetryAt: null }
  }
  return { newState: 'closed', newFailureCount: Math.max(0, current.failureCount - 1), newSuccessCount: current.failureCount + 1, reason: 'Healthy', openedAt: null, nextRetryAt: current.nextRetryAt }
}

export interface FailoverSimResult {
  success: boolean
  achievedRtoSec: number
  achievedRpOSec: number
  steps: Array<{ step: string; status: string; durationSec: number; notes: string }>
  score: number
  recommendation: string
}

export function simulateFailover(plan: {
  targetService: string; strategy: string; primaryTarget: string
  secondaryTarget: string | null; estimatedRtoSec: number; estimatedRpoSec: number
  steps: unknown[]
}): FailoverSimResult {
  const baseSteps = [
    { step: 'Detect primary failure', status: 'completed', durationSec: 5, notes: `${plan.primaryTarget} unresponsive after 3 retries` },
    { step: 'Notify on-call team', status: 'completed', durationSec: 2, notes: 'PagerDuty alert dispatched' },
    { step: 'Validate secondary target', status: 'completed', durationSec: 8, notes: `${plan.secondaryTarget ?? 'backup'} health check passed` },
    { step: 'Redirect traffic', status: 'completed', durationSec: plan.strategy === 'automatic' ? 12 : 30, notes: plan.strategy === 'automatic' ? 'Auto-switch via load balancer' : 'Manual DNS update required' },
    { step: 'Verify data integrity', status: 'completed', durationSec: 15, notes: 'Checksum validated — no data loss detected' },
    { step: 'Confirm service restored', status: 'completed', durationSec: 5, notes: 'Health endpoints returning 200' },
  ]

  const totalSec = baseSteps.reduce((s, x) => s + x.durationSec, 0)
  const jitter = Math.floor(Math.random() * 20)
  const achievedRtoSec = totalSec + jitter
  const achievedRpoSec = plan.estimatedRpoSec + (Math.random() > 0.7 ? Math.floor(Math.random() * 60) : 0)
  const rtoOk = achievedRtoSec <= plan.estimatedRtoSec
  const rpoOk = achievedRpoSec <= plan.estimatedRpoSec
  const score = Math.round((rtoOk ? 50 : 25) + (rpoOk ? 40 : 10) + (plan.strategy === 'automatic' ? 10 : 0))

  return {
    success: rtoOk && rpoOk,
    achievedRtoSec,
    achievedRpOSec: achievedRpoSec,
    steps: baseSteps,
    score,
    recommendation: rtoOk && rpoOk
      ? 'Failover plan meets RTO/RPO targets. Consider automating for faster switching.'
      : `${!rtoOk ? 'RTO exceeded — pre-warm standby to reduce switch time. ' : ''}${!rpoOk ? 'RPO at risk — increase replication frequency.' : ''}`,
  }
}

export interface DrSimResult {
  actualRtoSec: number
  actualRpoSec: number
  rtoMet: boolean
  rpoMet: boolean
  resilienceScore: number
  findings: string[]
  recommendations: string[]
  report: Record<string, unknown>
}

const DR_RECOVERY_TIMES: Record<string, { rtoBase: number; rpoBase: number }> = {
  database_outage: { rtoBase: 1200, rpoBase: 300 },
  redis_outage: { rtoBase: 120, rpoBase: 30 },
  api_outage: { rtoBase: 90, rpoBase: 0 },
  region_outage: { rtoBase: 3600, rpoBase: 900 },
  storage_outage: { rtoBase: 1800, rpoBase: 600 },
  ai_provider_outage: { rtoBase: 60, rpoBase: 0 },
}

export function simulateDrScenario(scenario: {
  scenarioType: string; name: string; severity: string
  estimatedRtoSec: number; estimatedRpoSec: number
}): DrSimResult {
  const profile = DR_RECOVERY_TIMES[scenario.scenarioType] ?? { rtoBase: 600, rpoBase: 120 }
  const jitter = Math.random() * 0.3
  const actualRtoSec = Math.round(profile.rtoBase * (0.85 + jitter))
  const actualRpoSec = Math.round(profile.rpoBase * (0.8 + jitter))
  const rtoMet = actualRtoSec <= scenario.estimatedRtoSec
  const rpoMet = actualRpoSec <= scenario.estimatedRpoSec

  const findings: string[] = []
  const recommendations: string[] = []

  if (!rtoMet) findings.push(`Recovery exceeded RTO target by ${actualRtoSec - scenario.estimatedRtoSec}s`)
  if (!rpoMet) findings.push(`Data exposure window exceeded RPO target`)
  if (scenario.scenarioType === 'region_outage') findings.push('Cross-region replication lag detected during failover')
  if (scenario.scenarioType === 'database_outage') findings.push('Read replica promotion took longer than expected')
  if (findings.length === 0) findings.push('All recovery steps completed within targets')

  if (!rtoMet) recommendations.push('Pre-warm standby instances to reduce cold-start penalty')
  if (!rpoMet) recommendations.push('Increase replication frequency or enable synchronous replication')
  recommendations.push('Run monthly DR drills to maintain team readiness')
  recommendations.push('Document runbook for ' + scenario.scenarioType.replace(/_/g, ' '))

  const resilienceScore = Math.round(
    ((rtoMet ? 50 : 25) + (rpoMet ? 40 : 20) + (scenario.severity === 'critical' ? 0 : 10)) * 0.9 + Math.random() * 9
  )

  return {
    actualRtoSec, actualRpoSec, rtoMet, rpoMet, resilienceScore, findings, recommendations,
    report: {
      scenario: scenario.scenarioType, severity: scenario.severity,
      targetRto: scenario.estimatedRtoSec, targetRpo: scenario.estimatedRpoSec,
      actualRto: actualRtoSec, actualRpo: actualRpoSec,
      passed: rtoMet && rpoMet, score: resilienceScore,
    },
  }
}

export interface CacheTestResult {
  strategyKey: string
  redisAvailable: boolean
  latencyMs: number
  hitRate: number
  missRate: number
  degradedModeActive: boolean
  fallbackActive: boolean
  health: 'healthy' | 'degraded' | 'down'
  recommendation: string
}

export function testCacheHealth(strategyKey: string): CacheTestResult {
  const redisAvailable = Math.random() > 0.1
  const latencyMs = redisAvailable ? Math.round(1 + Math.random() * 5) : 0
  const hitRate = redisAvailable ? 0.82 + Math.random() * 0.15 : 0
  const missRate = 1 - hitRate
  const health: 'healthy' | 'degraded' | 'down' = redisAvailable
    ? (hitRate > 0.85 ? 'healthy' : 'degraded')
    : 'down'

  return {
    strategyKey, redisAvailable, latencyMs,
    hitRate: Math.round(hitRate * 1000) / 1000,
    missRate: Math.round(missRate * 1000) / 1000,
    degradedModeActive: !redisAvailable,
    fallbackActive: !redisAvailable,
    health,
    recommendation: health === 'healthy'
      ? 'Cache is performing optimally'
      : health === 'degraded'
        ? 'Low hit rate — review TTL and invalidation strategy'
        : 'Redis unreachable — database fallback active; investigate Redis connectivity',
  }
}

export interface DeploySimResult {
  readinessScore: number
  rollbackRecommended: boolean
  rollbackReason: string | null
  steps: Array<{ phase: string; status: string; durationSec: number; gateResult: string }>
  healthGates: Array<{ gate: string; passed: boolean; value: string; threshold: string }>
  findings: string[]
}

export function simulateDeployment(strategy: string, version: string): DeploySimResult {
  const errorRateOk = Math.random() > 0.15
  const latencyOk = Math.random() > 0.1
  const cpuOk = Math.random() > 0.1
  const memOk = Math.random() > 0.05

  const gates = [
    { gate: 'Error rate < 1%', passed: errorRateOk, value: errorRateOk ? `${(Math.random() * 0.8).toFixed(2)}%` : `${(1 + Math.random() * 2).toFixed(2)}%`, threshold: '1%' },
    { gate: 'P95 latency < 500ms', passed: latencyOk, value: latencyOk ? `${Math.round(200 + Math.random() * 250)}ms` : `${Math.round(500 + Math.random() * 300)}ms`, threshold: '500ms' },
    { gate: 'CPU usage < 80%', passed: cpuOk, value: cpuOk ? `${Math.round(40 + Math.random() * 35)}%` : `${Math.round(82 + Math.random() * 15)}%`, threshold: '80%' },
    { gate: 'Memory usage < 85%', passed: memOk, value: memOk ? `${Math.round(50 + Math.random() * 30)}%` : `${Math.round(87 + Math.random() * 10)}%`, threshold: '85%' },
  ]

  const allPassed = gates.every(g => g.passed)
  const readinessScore = Math.round(gates.filter(g => g.passed).length / gates.length * 100)

  const rollingSteps = [
    { phase: 'Pre-deploy checks', status: 'completed', durationSec: 10, gateResult: 'PASSED' },
    { phase: 'Deploy canary (10%)', status: 'completed', durationSec: 30, gateResult: 'PASSED' },
    { phase: `Deploy ${version} (50%)`, status: 'completed', durationSec: 45, gateResult: allPassed ? 'PASSED' : 'FAILED' },
    { phase: `Deploy ${version} (100%)`, status: allPassed ? 'completed' : 'skipped', durationSec: allPassed ? 60 : 0, gateResult: allPassed ? 'PASSED' : 'SKIPPED' },
    { phase: 'Post-deploy validation', status: allPassed ? 'completed' : 'skipped', durationSec: allPassed ? 20 : 0, gateResult: allPassed ? 'PASSED' : 'SKIPPED' },
  ]

  const bgSteps = [
    { phase: 'Provision green environment', status: 'completed', durationSec: 60, gateResult: 'PASSED' },
    { phase: `Deploy ${version} to green`, status: 'completed', durationSec: 90, gateResult: 'PASSED' },
    { phase: 'Health check green environment', status: 'completed', durationSec: 30, gateResult: allPassed ? 'PASSED' : 'FAILED' },
    { phase: 'Switch traffic to green', status: allPassed ? 'completed' : 'aborted', durationSec: allPassed ? 5 : 0, gateResult: allPassed ? 'PASSED' : 'ABORTED' },
    { phase: 'Monitor and confirm', status: allPassed ? 'completed' : 'skipped', durationSec: allPassed ? 30 : 0, gateResult: allPassed ? 'PASSED' : 'SKIPPED' },
  ]

  const steps = strategy === 'blue_green' ? bgSteps : rollingSteps

  const findings: string[] = []
  if (!errorRateOk) findings.push('Elevated error rate detected during deploy — rollback recommended')
  if (!latencyOk) findings.push('P95 latency exceeded threshold — possible resource contention')
  if (!cpuOk) findings.push('CPU spike observed — consider scaling before deploy')
  if (!memOk) findings.push('Memory pressure detected — investigate memory leak or resize')
  if (allPassed) findings.push(`${strategy === 'blue_green' ? 'Blue-green' : 'Rolling'} deployment simulation passed all gates`)

  return {
    readinessScore,
    rollbackRecommended: !allPassed,
    rollbackReason: !allPassed ? findings[0] ?? 'Health gate failure' : null,
    steps,
    healthGates: gates,
    findings,
  }
}

export interface ChaosResult {
  systemResponse: Record<string, unknown>
  resilienceScore: number
  recommendations: string[]
}

const CHAOS_PROFILES: Record<string, { impact: string; fallback: string; circuitBreakerTripped: boolean }> = {
  database_latency: { impact: 'API P99 latency increased 4x. Query timeouts detected.', fallback: 'Read replicas promoted. Cache served stale reads.', circuitBreakerTripped: false },
  redis_unavailable: { impact: 'Cache hit rate dropped to 0%. DB load increased 8x.', fallback: 'In-memory fallback cache activated. DB handled full load.', circuitBreakerTripped: true },
  ai_provider_timeout: { impact: 'AI-dependent endpoints degraded. Non-AI paths unaffected.', fallback: 'LLMOps router switched to Reno Brain (local).', circuitBreakerTripped: false },
  integration_failure: { impact: 'Integration Hub endpoints returned 503. Data sync paused.', fallback: 'Async queue buffered 847 events. Will drain when integration recovers.', circuitBreakerTripped: true },
  job_queue_delay: { impact: 'Background jobs delayed by 90s average. No data loss detected.', fallback: 'Priority queue drained critical jobs first.', circuitBreakerTripped: false },
}

export function runChaosExperiment(
  experimentType: string, targetComponent: string, intensity: string, durationSeconds: number
): ChaosResult {
  const profile = CHAOS_PROFILES[experimentType] ?? {
    impact: 'Component under test showed degraded response.',
    fallback: 'System continued operating with reduced capacity.',
    circuitBreakerTripped: false,
  }

  const intensityMultiplier = intensity === 'high' ? 1.5 : intensity === 'medium' ? 1.0 : 0.6
  const baseScore = 75 - (intensity === 'high' ? 20 : intensity === 'medium' ? 10 : 5)
  const resilienceScore = Math.round(Math.max(30, baseScore + Math.random() * 15) * intensityMultiplier * 0.8)

  return {
    systemResponse: {
      experimentType, targetComponent, intensity, durationSeconds,
      impact: profile.impact,
      fallbackActivated: profile.fallback,
      circuitBreakerTripped: profile.circuitBreakerTripped,
      systemStability: intensity === 'high' ? 'degraded' : 'maintained',
      recoveryTimeSec: Math.round(durationSeconds * 0.4 + 10),
      isSafeMode: true,
      note: 'SIMULATION ONLY — no real infrastructure affected',
    },
    resilienceScore: Math.min(95, Math.max(20, resilienceScore)),
    recommendations: [
      `Improve ${targetComponent} fault tolerance — add retry with exponential backoff`,
      profile.circuitBreakerTripped ? 'Circuit breaker triggered as expected — consider tuning threshold' : 'Circuit breaker did not trip — verify threshold configuration',
      intensity === 'high' ? 'High-intensity test passed — system shows good resilience' : 'Run higher-intensity test to validate system limits',
      'Document incident response runbook for ' + experimentType.replace(/_/g, ' '),
    ],
  }
}

export function generateResilienceReport(
  snapshots: HealthResult[], activeAlerts: number, openCircuitBreakers: number
): { findings: string[]; recommendations: string[]; executiveSummary: string } {
  const overallScore = computeResilienceScore(snapshots)
  const degraded = snapshots.filter(s => s.status === 'degraded')
  const down = snapshots.filter(s => s.status === 'down')

  const findings: string[] = []
  const recommendations: string[] = []

  if (down.length > 0) findings.push(`${down.length} component(s) are DOWN: ${down.map(s => s.component).join(', ')}`)
  if (degraded.length > 0) findings.push(`${degraded.length} component(s) are DEGRADED: ${degraded.map(s => s.component).join(', ')}`)
  if (openCircuitBreakers > 0) findings.push(`${openCircuitBreakers} circuit breaker(s) are OPEN — fast-fail protection active`)
  if (activeAlerts > 0) findings.push(`${activeAlerts} active alert(s) require attention`)
  if (findings.length === 0) findings.push('All components are healthy — resilience platform operating normally')

  if (down.length > 0) recommendations.push('Immediately investigate and restore DOWN components')
  if (degraded.length > 0) recommendations.push('Investigate DEGRADED components; check resource utilization and error logs')
  if (openCircuitBreakers > 0) recommendations.push('Review open circuit breakers and resolve underlying failures before resetting')
  recommendations.push('Schedule monthly DR simulation drills')
  recommendations.push('Review failover plans for all critical services quarterly')

  const statusLabel = overallScore >= 90 ? 'EXCELLENT' : overallScore >= 75 ? 'GOOD' : overallScore >= 60 ? 'FAIR' : 'CRITICAL'
  const executiveSummary = `Reno Platform Resilience Score: ${overallScore}/100 (${statusLabel}). ` +
    `${snapshots.filter(s => s.status === 'healthy').length}/${snapshots.length} components healthy. ` +
    `${activeAlerts} active alerts, ${openCircuitBreakers} open circuit breakers. ` +
    (overallScore >= 85 ? 'Platform is operating within acceptable resilience parameters.' : 'Immediate action required to restore full platform resilience.')

  return { findings, recommendations, executiveSummary }
}
