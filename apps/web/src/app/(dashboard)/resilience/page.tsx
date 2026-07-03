'use client'

import { useState, useEffect, useCallback } from 'react'

const API = (p: string) => `/api/proxy?path=${encodeURIComponent(p)}`

function Badge({ value, map }: { value: string; map: Record<string, string> }) {
  const cls = map[value] ?? 'bg-gray-100 text-gray-700'
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{value}</span>
}

const STATUS_MAP: Record<string, string> = {
  healthy: 'bg-green-100 text-green-700',
  degraded: 'bg-yellow-100 text-yellow-700',
  down: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-700',
  closed: 'bg-green-100 text-green-700',
  open: 'bg-red-100 text-red-700',
  half_open: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">No data</span>
  const color = score >= 85 ? 'text-green-500' : score >= 65 ? 'text-yellow-500' : 'text-red-500'
  const label = score >= 85 ? 'EXCELLENT' : score >= 65 ? 'GOOD' : score >= 45 ? 'FAIR' : 'CRITICAL'
  return (
    <div className="flex flex-col items-center">
      <span className={`text-5xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number | null; sub?: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ResiliencePage() {
  const [tab, setTab] = useState('dashboard')
  const [summary, setSummary] = useState<any>(null)
  const [health, setHealth] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [cbs, setCbs] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [drSims, setDrSims] = useState<any[]>([])
  const [cache, setCache] = useState<any>(null)
  const [deploySims, setDeploySims] = useState<any[]>([])
  const [chaos, setChaos] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const get = useCallback(async (path: string) => {
    const r = await fetch(API(path), { headers: { 'Content-Type': 'application/json' } })
    return r.json()
  }, [])

  const post = useCallback(async (path: string, body: unknown) => {
    const r = await fetch(API(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.json()
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, h, a, c, p, d, ca, ds, ch, rp] = await Promise.all([
        get('/v1/resilience/summary'),
        get('/v1/resilience/health'),
        get('/v1/resilience/alerts'),
        get('/v1/resilience/circuit-breakers'),
        get('/v1/resilience/failover/plans'),
        get('/v1/resilience/dr/simulations'),
        get('/v1/resilience/cache'),
        get('/v1/resilience/deploy/simulations'),
        get('/v1/resilience/chaos/experiments'),
        get('/v1/resilience/reports'),
      ])
      setSummary(s)
      setHealth(h.snapshots ?? [])
      setAlerts(a.alerts ?? [])
      setCbs(c.circuitBreakers ?? [])
      setPlans(p.plans ?? [])
      setDrSims(d.simulations ?? [])
      setCache(ca)
      setDeploySims(ds.simulations ?? [])
      setChaos(ch.experiments ?? [])
      setReports(rp.reports ?? [])
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => { loadAll() }, [loadAll])

  const runHealth = async () => {
    setMsg('Running health check...')
    const r = await post('/v1/resilience/health/run', {})
    setMsg(`Health check complete — Overall score: ${r.overallScore}`)
    loadAll()
  }

  const resolveAlert = async (id: string) => {
    await post(`/v1/resilience/alerts/${id}/resolve`, {})
    setMsg('Alert resolved')
    loadAll()
  }

  const resetCb = async (id: string) => {
    await post(`/v1/resilience/circuit-breakers/${id}/reset`, {})
    setMsg('Circuit breaker reset')
    loadAll()
  }

  const runDr = async () => {
    setMsg('Running DR simulation...')
    const r = await post('/v1/resilience/dr/simulate', { scenarioType: 'database_outage', severity: 'critical' })
    setMsg(`DR simulation complete — Score: ${r.resilienceScore}`)
    loadAll()
  }

  const testCache = async () => {
    setMsg('Testing cache...')
    const r = await post('/v1/resilience/cache/test', { strategyKey: 'session' })
    setMsg(`Cache test: ${r.health} — Hit rate: ${((r.hitRate ?? 0) * 100).toFixed(1)}%`)
    loadAll()
  }

  const runDeploy = async (strategy: string) => {
    setMsg(`Simulating ${strategy} deployment...`)
    const r = await post('/v1/resilience/deploy/simulate', { strategy, version: 'v19.1.0', targetEnvironment: 'production' })
    setMsg(`Deploy sim: readiness ${r.readinessScore}% — ${r.rollbackRecommended ? 'ROLLBACK RECOMMENDED' : 'PASSED'}`)
    loadAll()
  }

  const runChaos = async () => {
    setMsg('Running chaos experiment...')
    const r = await post('/v1/resilience/chaos/run', { experimentType: 'redis_unavailable', targetComponent: 'redis', intensity: 'medium', durationSeconds: 60 })
    setMsg(`Chaos complete — Resilience score: ${r.resilienceScore}`)
    loadAll()
  }

  const createPlan = async () => {
    await post('/v1/resilience/failover/plans', {
      planName: 'Database Primary Failover', targetService: 'database',
      strategy: 'automatic', primaryTarget: 'primary-db-main',
      secondaryTarget: 'replica-db-standby', estimatedRtoSec: 120, estimatedRpoSec: 30,
    })
    setMsg('Failover plan created')
    loadAll()
  }

  const simulateFailover = async () => {
    setMsg('Simulating failover...')
    const r = await post('/v1/resilience/failover/simulate', {
      targetService: 'database', strategy: 'automatic',
      primaryTarget: 'primary-db', secondaryTarget: 'replica-db',
    })
    setMsg(`Failover sim: RTO ${r.achievedRtoSec}s — ${r.success ? 'SUCCESS' : 'FAILED'}`)
  }

  const tabs = [
    'dashboard', 'health', 'circuit-breakers', 'alerts',
    'failover', 'dr', 'cache', 'deployment', 'chaos', 'reports',
  ]

  // Get latest snapshot per component from health array
  const latestByComponent: Record<string, any> = {}
  for (const s of health) {
    if (!latestByComponent[s.component] || new Date(s.checkedAt) > new Date(latestByComponent[s.component].checkedAt)) {
      latestByComponent[s.component] = s
    }
  }
  const componentList = Object.values(latestByComponent)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">High Availability & Resilience</h1>
          <p className="text-sm text-gray-500 mt-1">Phase 67 — Circuit Breakers, Health Monitor, DR, Chaos Engineering</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runHealth} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Run Health Check</button>
          <button onClick={loadAll} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      {msg && <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{msg}</div>}

      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'circuit-breakers' ? 'Circuit Breakers' : t === 'dr' ? 'Disaster Recovery' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-6 flex items-center gap-8">
            <ScoreRing score={summary?.overallScore ?? null} />
            <div className="flex-1 grid grid-cols-3 gap-4">
              <Stat label="Active Alerts" value={summary?.activeAlerts ?? 0} sub="unresolved" />
              <Stat label="Open Breakers" value={summary?.openCircuitBreakers ?? 0} sub={`of ${summary?.totalCircuitBreakers ?? 0} total`} />
              <Stat label="Components" value={summary ? `${summary.healthyCount}/${summary.componentCount}` : '—'} sub="healthy" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {componentList.map((c: any) => (
              <div key={c.component} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm capitalize">{c.component.replace(/_/g, ' ')}</span>
                  <Badge value={c.status} map={STATUS_MAP} />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Latency: {c.latencyMs ?? '—'}ms</span>
                  <span>Score: {c.resilienceScore?.toFixed(0) ?? '—'}</span>
                </div>
              </div>
            ))}
            {componentList.length === 0 && (
              <div className="col-span-3 text-center text-gray-400 py-8 text-sm">
                No health data yet — click "Run Health Check" to start monitoring
              </div>
            )}
          </div>

          {summary?.latestReport && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Latest AI Summary</h3>
              <p className="text-sm text-gray-600">{summary.latestReport.executiveSummary}</p>
            </div>
          )}
        </div>
      )}

      {/* Health Monitor */}
      {tab === 'health' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={runHealth} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Run New Health Check</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {componentList.map((c: any) => (
              <div key={c.component} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold capitalize">{c.component.replace(/_/g, ' ')}</span>
                  <Badge value={c.status} map={STATUS_MAP} />
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between"><span>Latency</span><span>{c.latencyMs ?? '—'}ms</span></div>
                  <div className="flex justify-between"><span>Error Rate</span><span>{c.errorRate !== null ? `${((c.errorRate ?? 0) * 100).toFixed(2)}%` : '—'}</span></div>
                  <div className="flex justify-between"><span>Resilience Score</span><span>{c.resilienceScore?.toFixed(1) ?? '—'}/100</span></div>
                  <div className="flex justify-between"><span>Checked</span><span>{c.checkedAt ? new Date(c.checkedAt).toLocaleTimeString() : '—'}</span></div>
                </div>
              </div>
            ))}
          </div>
          {componentList.length === 0 && <p className="text-center text-gray-400 py-8">No health data — run a health check first.</p>}
        </div>
      )}

      {/* Circuit Breakers */}
      {tab === 'circuit-breakers' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Circuit breakers protect services from cascading failures. Run a health check to initialize them.</p>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Service', 'State', 'Failures', 'Threshold', 'Last Failure', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {cbs.map((cb: any) => (
                  <tr key={cb.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium capitalize">{cb.serviceName.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3"><Badge value={cb.state} map={STATUS_MAP} /></td>
                    <td className="px-4 py-3 text-red-600">{cb.failureCount}</td>
                    <td className="px-4 py-3">{cb.failureThreshold}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{cb.lastFailureAt ? new Date(cb.lastFailureAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3">
                      {cb.state !== 'closed' && (
                        <button onClick={() => resetCb(cb.id)} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">Reset</button>
                      )}
                    </td>
                  </tr>
                ))}
                {cbs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No circuit breakers — run a health check to initialize</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Component', 'Severity', 'Title', 'Message', 'Created', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {alerts.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 capitalize">{a.component.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3"><Badge value={a.severity} map={STATUS_MAP} /></td>
                    <td className="px-4 py-3 font-medium">{a.title}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{a.message}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {!a.isResolved && (
                        <button onClick={() => resolveAlert(a.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No active alerts — system is healthy</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failover */}
      {tab === 'failover' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={createPlan} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ Create Failover Plan</button>
            <button onClick={simulateFailover} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Simulate Failover</button>
          </div>
          <div className="grid gap-4">
            {plans.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{p.planName}</h3>
                  <Badge value={p.isActive ? 'active' : 'inactive'} map={{ active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-500' }} />
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs text-gray-600">
                  <div><p className="text-gray-400">Service</p><p className="font-medium">{p.targetService}</p></div>
                  <div><p className="text-gray-400">Strategy</p><p className="font-medium capitalize">{p.strategy}</p></div>
                  <div><p className="text-gray-400">Est. RTO</p><p className="font-medium">{p.estimatedRtoSec}s</p></div>
                  <div><p className="text-gray-400">Est. RPO</p><p className="font-medium">{p.estimatedRpoSec}s</p></div>
                </div>
                {p.lastScore && <p className="text-xs text-gray-500 mt-2">Last simulation score: <strong>{p.lastScore}</strong></p>}
              </div>
            ))}
            {plans.length === 0 && <p className="text-center text-gray-400 py-8">No failover plans — create one to get started</p>}
          </div>
        </div>
      )}

      {/* DR */}
      {tab === 'dr' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={runDr} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Run DR Simulation</button>
          </div>
          <div className="grid gap-4">
            {drSims.map((s: any) => (
              <div key={s.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold capitalize">{s.scenario?.scenarioType?.replace(/_/g, ' ') ?? 'DR Scenario'}</h3>
                  <Badge value={s.status} map={STATUS_MAP} />
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div><p className="text-gray-400">RTO</p><p className={s.rtoMet ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{s.actualRtoSec}s {s.rtoMet ? '✓' : '✗'}</p></div>
                  <div><p className="text-gray-400">RPO</p><p className={s.rpoMet ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{s.actualRpoSec}s {s.rpoMet ? '✓' : '✗'}</p></div>
                  <div><p className="text-gray-400">Score</p><p className="font-semibold">{s.resilienceScore?.toFixed(0)}/100</p></div>
                  <div><p className="text-gray-400">Severity</p><p className="capitalize">{s.scenario?.severity}</p></div>
                </div>
                {Array.isArray(s.findings) && s.findings.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                    {s.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {drSims.length === 0 && <p className="text-center text-gray-400 py-8">No DR simulations yet — run one to test your disaster recovery readiness</p>}
          </div>
        </div>
      )}

      {/* Cache */}
      {tab === 'cache' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={testCache} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Test Cache Health</button>
          </div>
          {cache && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Stat label="Total Hits" value={cache.summary?.totalHits} />
              <Stat label="Total Misses" value={cache.summary?.totalMisses} />
              <Stat label="Hit Rate" value={cache.summary?.hitRate !== null ? `${((cache.summary?.hitRate ?? 0) * 100).toFixed(1)}%` : '—'} />
            </div>
          )}
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Strategy', 'Layer', 'TTL', 'Hit Count', 'Miss Count', 'Health'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {(cache?.strategies ?? []).map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{s.strategyKey}</td>
                    <td className="px-4 py-3">{s.cacheLayer}</td>
                    <td className="px-4 py-3">{s.ttlSeconds}s</td>
                    <td className="px-4 py-3 text-green-600">{s.hitCount}</td>
                    <td className="px-4 py-3 text-red-500">{s.missCount}</td>
                    <td className="px-4 py-3"><Badge value={s.cacheHealth} map={STATUS_MAP} /></td>
                  </tr>
                ))}
                {!(cache?.strategies?.length) && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Run a health check to initialize cache strategies</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deployment */}
      {tab === 'deployment' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => runDeploy('rolling')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Simulate Rolling Deploy</button>
            <button onClick={() => runDeploy('blue_green')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Simulate Blue-Green</button>
          </div>
          <div className="grid gap-4">
            {deploySims.map((s: any) => (
              <div key={s.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{s.version} — <span className="capitalize">{s.strategy.replace(/_/g, ' ')}</span></h3>
                    <p className="text-xs text-gray-500">{s.targetEnvironment}</p>
                  </div>
                  <div className="flex gap-2">
                    {s.rollbackRecommended && <Badge value="rollback" map={{ rollback: 'bg-red-100 text-red-700' }} />}
                    <Badge value={s.status} map={STATUS_MAP} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div><p className="text-gray-400">Readiness Score</p><p className="font-bold text-lg">{s.readinessScore ?? '—'}%</p></div>
                  <div><p className="text-gray-400">Gates Passed</p><p className="font-semibold">{(s.healthGates ?? []).filter((g: any) => g.passed).length}/{(s.healthGates ?? []).length}</p></div>
                  <div><p className="text-gray-400">Completed</p><p>{s.completedAt ? new Date(s.completedAt).toLocaleString() : '—'}</p></div>
                </div>
                {Array.isArray(s.findings) && s.findings.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                    {s.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {deploySims.length === 0 && <p className="text-center text-gray-400 py-8">No deployment simulations — run one to validate your release readiness</p>}
          </div>
        </div>
      )}

      {/* Chaos Engineering */}
      {tab === 'chaos' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>Safe Mode Only:</strong> All chaos experiments run in simulation — no real infrastructure is affected.
          </div>
          <div className="flex gap-2">
            <button onClick={runChaos} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm">Run Chaos Experiment</button>
          </div>
          <div className="grid gap-4">
            {chaos.map((e: any) => (
              <div key={e.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold capitalize">{e.experimentType.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-gray-500">Target: {e.targetComponent} · Intensity: {e.intensity} · Duration: {e.durationSeconds}s</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge value={e.isSafeMode ? 'safe' : 'live'} map={{ safe: 'bg-green-100 text-green-700', live: 'bg-red-100 text-red-700' }} />
                    <Badge value={e.status} map={STATUS_MAP} />
                  </div>
                </div>
                {e.resilienceScore !== null && <p className="text-sm font-semibold mb-2">Resilience Score: {e.resilienceScore}/100</p>}
                {e.systemResponse && (
                  <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                    <p><strong>Impact:</strong> {(e.systemResponse as any).impact}</p>
                    <p><strong>Fallback:</strong> {(e.systemResponse as any).fallbackActivated}</p>
                  </div>
                )}
                {Array.isArray(e.recommendations) && e.recommendations.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                    {e.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {chaos.length === 0 && <p className="text-center text-gray-400 py-8">No chaos experiments yet — test your system resilience safely</p>}
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Resilience reports are generated automatically on each health check run.</p>
          <div className="grid gap-4">
            {reports.map((r: any) => (
              <div key={r.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">Resilience Report</h3>
                    <p className="text-xs text-gray-500">{new Date(r.generatedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{r.overallScore.toFixed(0)}</p>
                    <p className="text-xs text-gray-400">/ 100</p>
                  </div>
                </div>
                {r.executiveSummary && <p className="text-sm text-gray-600 mb-2">{r.executiveSummary}</p>}
                {Array.isArray(r.findings) && r.findings.length > 0 && (
                  <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                    {r.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {reports.length === 0 && <p className="text-center text-gray-400 py-8">No reports yet — run a health check to generate the first report</p>}
          </div>
        </div>
      )}
    </div>
  )
}
