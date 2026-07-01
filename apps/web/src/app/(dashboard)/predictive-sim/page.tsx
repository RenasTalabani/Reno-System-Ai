'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

// ── Types ────────────────────────────────────────────────────────────────────

interface OutcomeMetrics {
  revenue: number; cost: number; profit: number; margin: number
  cashFlow: number; netImpact: number; roi?: number
}

interface Scenario {
  id: string; name: string; type: string; description: string | null
  baselineRevenue: number; baselineCost: number; timeHorizon: number
  parameters: Record<string, number>; status: string; createdAt: string
  _count?: { simulations: number }
}

interface SimResult {
  base: OutcomeMetrics
  pessimistic: OutcomeMetrics
  optimistic: OutcomeMetrics
  monteCarlo: { p10: OutcomeMetrics; p50: OutcomeMetrics; p90: OutcomeMetrics; successRate: number; meanProfit: number; stdDevProfit: number }
  sensitivityAnalysis: { factor: string; impactOnProfit: number; sensitivityScore: number; direction: string }[]
  risks: string[]; opportunities: string[]
  recommendation: string; executiveSummary: string; breakEvenMonths?: number
}

interface Simulation {
  id: string; scenarioId: string; iterations: number; successRate: number | null; ranAt: string
  recommendation: string | null; executiveSummary: string | null
  scenario?: { name: string; type: string }
}

interface ComparisonEntry {
  scenarioId: string; scenarioName: string; type: string
  base: OutcomeMetrics; successRate: number; rank: number
  verdict: string; notes: string
}

interface Comparison {
  id: string; name: string; createdAt: string
  result: { entries: ComparisonEntry[]; executiveRecommendation: string }
}

type Tab = 'dashboard' | 'scenarios' | 'run' | 'simulations' | 'compare' | 'quick'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SCENARIO_TYPES = [
  { value: 'revenue_change', label: '📈 Revenue Change', params: { change_pct: 0.2 } },
  { value: 'cost_reduction', label: '✂️ Cost Reduction', params: { reduction_pct: 0.15 } },
  { value: 'new_branch', label: '🏢 New Branch', params: { setup_cost: 150000, monthly_revenue: 60000, monthly_cost: 40000 } },
  { value: 'hiring', label: '👥 Hiring', params: { count: 10, avg_salary_monthly: 5000, productivity_factor: 1.5 } },
  { value: 'currency_change', label: '💱 Currency Change', params: { change_pct: 0.1, import_exposure: 0.3, export_exposure: 0.2 } },
  { value: 'demand_loss', label: '📉 Demand Loss', params: { loss_pct: 0.2 } },
  { value: 'warehouse_outage', label: '🏭 Warehouse Outage', params: { outage_days: 14, recovery_cost: 20000 } },
  { value: 'price_increase', label: '💰 Price Increase', params: { increase_pct: 0.1, demand_elasticity: -0.5 } },
  { value: 'raw_material_spike', label: '⛏️ Raw Material Spike', params: { spike_pct: 0.25, material_share: 0.35 } },
  { value: 'investment', label: '💼 Capital Investment', params: { investment_amount: 500000, expected_roi_pct: 0.25 } },
]

const VERDICT_STYLE: Record<string, string> = {
  recommended: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  viable: 'bg-blue-100 text-blue-700 border-blue-200',
  risky: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  not_recommended: 'bg-red-100 text-red-700 border-red-200',
}

function fmt(n: number | undefined) {
  if (n == null) return '—'
  return n >= 0 ? `+${n.toLocaleString()}` : n.toLocaleString()
}

function pct(n: number | undefined) {
  if (n == null) return '—'
  return `${(n * 100).toFixed(1)}%`
}

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const r = await fetch(`/api/proxy?path=/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
  })
  return r.json()
}

// ── Components ────────────────────────────────────────────────────────────────

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color ?? 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

function OutcomeRow({ label, outcome, color }: { label: string; outcome: OutcomeMetrics; color: string }) {
  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className={`text-xs font-semibold mb-2 ${color}`}>{label}</div>
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Revenue" value={outcome.revenue.toLocaleString()} />
        <MetricBox label="Profit" value={outcome.profit.toLocaleString()} color={outcome.profit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <MetricBox label="Net Impact" value={fmt(outcome.netImpact)} color={outcome.netImpact >= 0 ? 'text-emerald-600' : 'text-red-600'} />
      </div>
    </div>
  )
}

function SensitivityBar({ factor, score, direction }: { factor: string; score: number; direction: string }) {
  const width = `${Math.round(score * 100)}%`
  const color = direction === 'increases_profit' ? 'bg-emerald-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="text-xs text-gray-600 w-40 shrink-0 capitalize">{factor}</div>
      <div className="flex-1 bg-gray-100 rounded h-2">
        <div className={`h-2 rounded ${color}`} style={{ width }} />
      </div>
      <div className="text-xs text-gray-500 w-8 text-right">{Math.round(score * 100)}%</div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PredictiveSimPage() {
  const { data: session } = useSession()
  const token = (session as { accessToken?: string })?.accessToken ?? ''

  const [tab, setTab] = useState<Tab>('dashboard')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [stats, setStats] = useState<{ scenarios: number; simulations: number; comparisons: number } | null>(null)
  const [loading, setLoading] = useState(false)

  // Active simulation result
  const [activeResult, setActiveResult] = useState<SimResult | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runLoading, setRunLoading] = useState(false)

  // Create scenario form
  const [showCreate, setShowCreate] = useState(false)
  const [selectedType, setSelectedType] = useState(SCENARIO_TYPES[0])
  const [form, setForm] = useState({ name: '', description: '', baselineRevenue: '1000000', baselineCost: '700000', timeHorizon: '12' })
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(SCENARIO_TYPES[0].params).map(([k, v]) => [k, String(v)]))
  )

  // Quick what-if
  const [quickType, setQuickType] = useState(SCENARIO_TYPES[0])
  const [quickParams, setQuickParams] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(SCENARIO_TYPES[0].params).map(([k, v]) => [k, String(v)]))
  )
  const [quickBase, setQuickBase] = useState({ revenue: '1000000', cost: '700000' })
  const [quickResult, setQuickResult] = useState<SimResult | null>(null)
  const [quickLoading, setQuickLoading] = useState(false)

  // Compare
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [compareName, setCompareName] = useState('')
  const [compareResult, setCompareResult] = useState<{ entries: ComparisonEntry[]; executiveRecommendation: string } | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [st, sc, si, cmp] = await Promise.all([
        apiFetch('/predictive-sim/dashboard', token),
        apiFetch('/predictive-sim/scenarios', token),
        apiFetch('/predictive-sim/simulations', token),
        apiFetch('/predictive-sim/comparisons', token),
      ])
      if (st.success) setStats(st.data)
      if (sc.success) setScenarios(sc.data)
      if (si.success) setSimulations(si.data)
      if (cmp.success) setComparisons(cmp.data)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  function handleTypeChange(typeVal: string) {
    const t = SCENARIO_TYPES.find(x => x.value === typeVal) ?? SCENARIO_TYPES[0]
    setSelectedType(t)
    setParamValues(Object.fromEntries(Object.entries(t.params).map(([k, v]) => [k, String(v)])))
  }

  async function createScenario() {
    if (!form.name.trim()) return
    const parameters = Object.fromEntries(Object.entries(paramValues).map(([k, v]) => [k, parseFloat(v)]))
    const body = {
      name: form.name, description: form.description || undefined,
      type: selectedType.value, parameters,
      baselineRevenue: parseFloat(form.baselineRevenue),
      baselineCost: parseFloat(form.baselineCost),
      timeHorizon: parseInt(form.timeHorizon),
    }
    const r = await apiFetch('/predictive-sim/scenarios', token, { method: 'POST', body: JSON.stringify(body) })
    if (r.success) { setShowCreate(false); load() }
  }

  async function runSim(scenarioId: string) {
    setRunLoading(true)
    setRunningId(scenarioId)
    setActiveResult(null)
    const r = await apiFetch(`/predictive-sim/scenarios/${scenarioId}/run`, token, { method: 'POST', body: JSON.stringify({ iterations: 1000 }) })
    if (r.success) { setActiveResult(r.data.result); setTab('run') }
    setRunLoading(false)
    load()
  }

  async function runQuickWhatIf() {
    setQuickLoading(true)
    setQuickResult(null)
    const parameters = Object.fromEntries(Object.entries(quickParams).map(([k, v]) => [k, parseFloat(v)]))
    const body = {
      type: quickType.value, parameters,
      baselineRevenue: parseFloat(quickBase.revenue),
      baselineCost: parseFloat(quickBase.cost),
      baselineHeadcount: 0, timeHorizon: 12, iterations: 1000,
    }
    const r = await apiFetch('/predictive-sim/quick-what-if', token, { method: 'POST', body: JSON.stringify(body) })
    if (r.success) setQuickResult(r.data)
    setQuickLoading(false)
  }

  async function runComparison() {
    if (selectedForCompare.length < 2 || !compareName.trim()) return
    const r = await apiFetch('/predictive-sim/comparisons', token, { method: 'POST', body: JSON.stringify({ name: compareName, scenarioIds: selectedForCompare }) })
    if (r.success) { setCompareResult(r.data.result); load() }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'quick', label: 'Quick What-If' },
    { id: 'run', label: activeResult ? 'Simulation Result ✓' : 'Simulation Result' },
    { id: 'simulations', label: 'History' },
    { id: 'compare', label: 'Compare' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Predictive Simulation</h1>
          <p className="text-sm text-gray-500 mt-0.5">What-If · Monte Carlo · Sensitivity Analysis · Decision Comparison</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Refresh</button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">+ Scenario</button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-400 mb-4">Loading...</div>}

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.scenarios}</div>
              <div className="text-sm text-gray-500 mt-1">Scenarios</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.simulations}</div>
              <div className="text-sm text-gray-500 mt-1">Simulations Run</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
              <div className="text-3xl font-bold text-emerald-600">{stats.comparisons}</div>
              <div className="text-sm text-gray-500 mt-1">Comparisons</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-5">
            <div className="font-semibold text-purple-800 mb-2">Available Scenario Types</div>
            <div className="flex flex-wrap gap-2">
              {SCENARIO_TYPES.map(t => (
                <span key={t.value} className="text-sm px-3 py-1 bg-white border border-purple-200 rounded-full text-purple-700">{t.label}</span>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">How It Works</div>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="font-bold text-blue-600">1.</span> Create a What-If scenario with your business parameters</li>
              <li className="flex gap-2"><span className="font-bold text-blue-600">2.</span> Run the simulation — Reno Brain runs 1000 Monte Carlo iterations</li>
              <li className="flex gap-2"><span className="font-bold text-blue-600">3.</span> Review P10/P50/P90 outcomes, sensitivity analysis, and risks</li>
              <li className="flex gap-2"><span className="font-bold text-blue-600">4.</span> Compare multiple scenarios side-by-side to pick the best decision</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Scenarios ── */}
      {tab === 'scenarios' && (
        <div className="space-y-3">
          {scenarios.length === 0 && <div className="text-sm text-gray-400">No scenarios yet. Create your first What-If scenario.</div>}
          {scenarios.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-800">{s.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {SCENARIO_TYPES.find(t => t.value === s.type)?.label ?? s.type} ·
                  Baseline: {s.baselineRevenue.toLocaleString()} rev / {s.baselineCost.toLocaleString()} cost ·
                  {s._count?.simulations ?? 0} sim{s._count?.simulations !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setSelectedForCompare(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id]) }}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${selectedForCompare.includes(s.id) ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {selectedForCompare.includes(s.id) ? '✓ Selected' : 'Compare'}
                </button>
                <button
                  onClick={() => runSim(s.id)}
                  disabled={runLoading && runningId === s.id}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {runLoading && runningId === s.id ? 'Running...' : 'Run ▶'}
                </button>
              </div>
            </div>
          ))}
          {selectedForCompare.length >= 2 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-sm text-purple-700">{selectedForCompare.length} scenarios selected for comparison</span>
              <button onClick={() => setTab('compare')} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Go to Compare →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Quick What-If ── */}
      {tab === 'quick' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="font-semibold text-gray-700 mb-4">Quick What-If Simulator</div>
            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Scenario Type</label>
                <select
                  value={quickType.value}
                  onChange={e => {
                    const t = SCENARIO_TYPES.find(x => x.value === e.target.value) ?? SCENARIO_TYPES[0]
                    setQuickType(t)
                    setQuickParams(Object.fromEntries(Object.entries(t.params).map(([k, v]) => [k, String(v)])))
                    setQuickResult(null)
                  }}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {SCENARIO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {/* Baselines */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Annual Revenue</label>
                  <input type="number" value={quickBase.revenue} onChange={e => setQuickBase(b => ({ ...b, revenue: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Annual Cost</label>
                  <input type="number" value={quickBase.cost} onChange={e => setQuickBase(b => ({ ...b, cost: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
                </div>
              </div>
              {/* Parameters */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Scenario Parameters</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(quickParams).map(([k, v]) => (
                    <div key={k}>
                      <label className="text-xs text-gray-400 mb-1 block capitalize">{k.replace(/_/g, ' ')}</label>
                      <input type="number" value={v} step="any" onChange={e => setQuickParams(p => ({ ...p, [k]: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={runQuickWhatIf} disabled={quickLoading} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {quickLoading ? 'Simulating 1000 iterations...' : 'Run Simulation'}
              </button>
            </div>
          </div>

          {quickResult && <SimResultDisplay result={quickResult} />}
        </div>
      )}

      {/* ── Simulation Result ── */}
      {tab === 'run' && activeResult && <SimResultDisplay result={activeResult} />}
      {tab === 'run' && !activeResult && (
        <div className="text-sm text-gray-400">No simulation result yet. Select a scenario and click Run.</div>
      )}

      {/* ── History ── */}
      {tab === 'simulations' && (
        <div className="space-y-3">
          {simulations.length === 0 && <div className="text-sm text-gray-400">No simulations run yet.</div>}
          {simulations.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-medium text-gray-800">{s.scenario?.name ?? 'Unknown'}</div>
                <span className="text-xs text-gray-400">{new Date(s.ranAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{s.iterations.toLocaleString()} iterations</span>
                {s.successRate != null && <span className={s.successRate >= 0.5 ? 'text-emerald-600' : 'text-red-500'}>{Math.round(s.successRate * 100)}% success rate</span>}
              </div>
              {s.recommendation && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{s.recommendation}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Compare ── */}
      {tab === 'compare' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="font-semibold text-gray-700 mb-4">Decision Comparison</div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Comparison Name</label>
              <input value={compareName} onChange={e => setCompareName(e.target.value)} placeholder="e.g. Q3 Strategic Options" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">Select Scenarios to Compare ({selectedForCompare.length} selected)</label>
              <div className="space-y-2">
                {scenarios.map(s => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedForCompare.includes(s.id)}
                      onChange={() => setSelectedForCompare(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{s.name}</span>
                    <span className="text-xs text-gray-400">({s.type})</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={runComparison}
              disabled={selectedForCompare.length < 2 || !compareName.trim()}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              Compare {selectedForCompare.length} Scenarios
            </button>
          </div>

          {compareResult && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                <div className="text-sm font-semibold text-purple-800 mb-2">Executive Recommendation</div>
                <p className="text-sm text-purple-700">{compareResult.executiveRecommendation}</p>
              </div>
              <div className="space-y-3">
                {compareResult.entries.map(e => (
                  <div key={e.scenarioId} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-gray-300">#{e.rank}</span>
                      <div>
                        <div className="font-semibold text-gray-800">{e.scenarioName}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${VERDICT_STYLE[e.verdict] ?? VERDICT_STYLE.risky}`}>
                          {e.verdict.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="ml-auto text-right">
                        <div className={`text-lg font-bold ${e.base.netImpact >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {fmt(e.base.netImpact)}
                        </div>
                        <div className="text-xs text-gray-400">{pct(e.successRate)} success</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{e.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {comparisons.length > 0 && !compareResult && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-3">Past Comparisons</div>
              {comparisons.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-700">{c.name}</span>
                  <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Scenario Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4">
            <div className="font-bold text-gray-800 mb-4">Create What-If Scenario</div>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Scenario name" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <select value={selectedType.value} onChange={e => handleTypeChange(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none">
                {SCENARIO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Annual Revenue</label>
                  <input type="number" value={form.baselineRevenue} onChange={e => setForm(f => ({ ...f, baselineRevenue: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Annual Cost</label>
                  <input type="number" value={form.baselineCost} onChange={e => setForm(f => ({ ...f, baselineCost: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Scenario Parameters</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(paramValues).map(([k, v]) => (
                    <div key={k}>
                      <label className="text-xs text-gray-400 mb-0.5 block capitalize">{k.replace(/_/g, ' ')}</label>
                      <input type="number" value={v} step="any" onChange={e => setParamValues(p => ({ ...p, [k]: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={createScenario} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Simulation result display (shared between run and quick) ──────────────────

function SimResultDisplay({ result }: { result: SimResult }) {
  return (
    <div className="space-y-5">
      {/* Executive summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
        <div className="text-sm font-semibold text-blue-800 mb-2">Executive Summary</div>
        <p className="text-sm text-blue-700">{result.executiveSummary}</p>
      </div>

      {/* Recommendation */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-gray-700 mb-2">AI Recommendation</div>
        <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
      </div>

      {/* Scenarios */}
      <div className="space-y-2">
        <OutcomeRow label="🔴 Pessimistic Case" outcome={result.pessimistic} color="text-red-600" />
        <OutcomeRow label="🟡 Base Case" outcome={result.base} color="text-yellow-600" />
        <OutcomeRow label="🟢 Optimistic Case" outcome={result.optimistic} color="text-emerald-600" />
      </div>

      {/* Monte Carlo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-gray-700 mb-3">Monte Carlo Results (1000 iterations)</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <MetricBox label="P10 Profit" value={result.monteCarlo.p10.profit.toLocaleString()} color="text-red-500" />
          <MetricBox label="P50 Profit" value={result.monteCarlo.p50.profit.toLocaleString()} color="text-blue-600" />
          <MetricBox label="P90 Profit" value={result.monteCarlo.p90.profit.toLocaleString()} color="text-emerald-600" />
          <MetricBox label="Success Rate" value={`${Math.round(result.monteCarlo.successRate * 100)}%`} color={result.monteCarlo.successRate >= 0.5 ? 'text-emerald-600' : 'text-red-500'} />
        </div>
        {result.breakEvenMonths && (
          <div className="text-sm text-gray-600">Break-even: <span className="font-semibold text-blue-600">{result.breakEvenMonths} months</span></div>
        )}
      </div>

      {/* Sensitivity */}
      {result.sensitivityAnalysis.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-3">Sensitivity Analysis (Tornado Chart)</div>
          {result.sensitivityAnalysis.map(f => (
            <SensitivityBar key={f.factor} factor={f.factor} score={f.sensitivityScore} direction={f.direction} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risks */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-800 mb-2">Risks</div>
          <ul className="space-y-1">
            {result.risks.map((r, i) => <li key={i} className="text-sm text-red-700 flex gap-2"><span className="text-red-400 shrink-0">▼</span>{r}</li>)}
          </ul>
        </div>
        {/* Opportunities */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="text-sm font-semibold text-green-800 mb-2">Opportunities</div>
          <ul className="space-y-1">
            {result.opportunities.map((o, i) => <li key={i} className="text-sm text-green-700 flex gap-2"><span className="text-green-400 shrink-0">▲</span>{o}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color ?? 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

function SensitivityBar({ factor, score, direction }: { factor: string; score: number; direction: string }) {
  const width = `${Math.round(score * 100)}%`
  const color = direction === 'increases_profit' ? 'bg-emerald-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="text-xs text-gray-600 w-44 shrink-0 capitalize">{factor}</div>
      <div className="flex-1 bg-gray-100 rounded h-2">
        <div className={`h-2 rounded ${color}`} style={{ width }} />
      </div>
      <div className="text-xs text-gray-500 w-8 text-right">{Math.round(score * 100)}%</div>
    </div>
  )
}
