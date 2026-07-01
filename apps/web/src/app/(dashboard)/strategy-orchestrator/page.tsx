'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'

type Tab = 'dashboard' | 'initiatives' | 'portfolio' | 'conflicts' | 'calendar' | 'kpi-cascade' | 'strategy-review' | 'decision-board'

interface Initiative {
  id: string
  title: string
  type: string
  department: string
  status: string
  priority: string
  portfolioScore: number | null
  estimatedBudget: number | null
  estimatedRoi: number | null
  riskScore: number | null
  urgencyScore: number | null
  strategicScore: number | null
  timeHorizon: string
  createdAt: string
}

interface Conflict {
  id: string
  resolved: boolean
  conflictType: string
  severity: string
  description: string
  initiativeA?: { id: string; title: string }
  initiativeB?: { id: string; title: string }
}

interface CalendarPhase {
  horizon: string
  label: string
  totalBudget: number
  initiativeCount: number
  milestones: Array<{ initiative: string; milestone: string; dueDate: string }>
}

interface DecisionEntry {
  title: string
  urgency: string
  type: string
  reason: string
  recommendation: string
  suggestedAction: string
  estimatedRoi: number | null
  riskScore: number | null
}

function useApi(path: string) {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else setError(json.error?.message ?? 'Unknown error')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

async function apiPost(path: string, body: unknown = {}) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiPatch(path: string, body: unknown = {}) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function Badge({ value, map }: { value: string; map: Record<string, string> }) {
  const color = map[value] ?? 'bg-gray-100 text-gray-700'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{value}</span>
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  planning: 'bg-gray-100 text-gray-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700',
}
const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}
const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-green-500 text-white',
}

// ── Dashboard Tab ──────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data: dash, loading } = useApi('/strategy-orchestrator/dashboard')
  const d = dash as { total: number; active: number; atRisk: number; completed: number; activeConflicts: number; reviews: number; byDepartment: Array<{ department: string; _count: number }> } | null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Initiatives', value: d?.total ?? 0, color: 'text-blue-600' },
          { label: 'Active', value: d?.active ?? 0, color: 'text-green-600' },
          { label: 'At Risk', value: d?.atRisk ?? 0, color: 'text-red-600' },
          { label: 'Completed', value: d?.completed ?? 0, color: 'text-gray-600' },
          { label: 'Open Conflicts', value: d?.activeConflicts ?? 0, color: 'text-orange-600' },
          { label: 'Strategy Reviews', value: d?.reviews ?? 0, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {d?.byDepartment && d.byDepartment.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Active Initiatives by Department</h3>
          <div className="flex flex-wrap gap-3">
            {d.byDepartment.map((b) => (
              <div key={b.department} className="bg-blue-50 rounded-lg px-4 py-2 text-center">
                <div className="text-lg font-bold text-blue-700">{b._count}</div>
                <div className="text-xs text-blue-600 capitalize">{b.department}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
        <h3 className="font-semibold text-indigo-800 mb-1">Enterprise Strategy Orchestrator</h3>
        <p className="text-sm text-indigo-600">
          Manage strategic initiatives across all departments. Use Portfolio to prioritize, detect conflicts, cascade KPIs, and run weekly strategy reviews. The Decision Board surfaces the most urgent actions.
        </p>
      </div>
    </div>
  )
}

// ── Initiatives Tab ────────────────────────────────────────────────────────────

function InitiativesTab() {
  const { data, loading, reload } = useApi('/strategy-orchestrator/initiatives')
  const initiatives = (data ?? []) as Initiative[]
  const [generating, setGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'growth', department: 'finance', priority: 'medium', estimatedBudget: '', estimatedRoi: '', timeHorizon: '90d', description: '' })
  const [saving, setSaving] = useState(false)

  const generate = async () => {
    setGenerating(true)
    await apiPost('/strategy-orchestrator/initiatives/generate')
    await reload()
    setGenerating(false)
  }

  const save = async () => {
    setSaving(true)
    await apiPost('/strategy-orchestrator/initiatives', {
      ...form,
      estimatedBudget: form.estimatedBudget ? Number(form.estimatedBudget) : undefined,
      estimatedRoi: form.estimatedRoi ? Number(form.estimatedRoi) : undefined,
    })
    await reload()
    setSaving(false)
    setShowForm(false)
    setForm({ title: '', type: 'growth', department: 'finance', priority: 'medium', estimatedBudget: '', estimatedRoi: '', timeHorizon: '90d', description: '' })
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading initiatives...</div>

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          + New Initiative
        </button>
        <button onClick={generate} disabled={generating} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          {generating ? 'Generating...' : '✨ AI Generate from Goals'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">New Strategic Initiative</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Initiative title" />
            </div>
            {[
              { key: 'type', label: 'Type', options: ['growth', 'cost', 'risk', 'product', 'hiring', 'process', 'technology', 'market'] },
              { key: 'department', label: 'Department', options: ['finance', 'hr', 'sales', 'marketing', 'operations', 'product', 'technology', 'all'] },
              { key: 'priority', label: 'Priority', options: ['low', 'medium', 'high', 'critical'] },
              { key: 'timeHorizon', label: 'Time Horizon', options: ['30d', '90d', '1y', '5y'] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <select value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estimated Budget ($)</label>
              <input type="number" value={form.estimatedBudget} onChange={e => setForm(f => ({ ...f, estimatedBudget: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estimated ROI ($)</label>
              <input type="number" value={form.estimatedRoi} onChange={e => setForm(f => ({ ...f, estimatedRoi: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={!form.title || saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Initiative'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {initiatives.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No initiatives yet. Create one or AI-generate from your goals.</div>
      ) : (
        <div className="space-y-3">
          {initiatives.map(ini => (
            <div key={ini.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 truncate">{ini.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-gray-400 capitalize">{ini.type}</span>
                    <span className="text-xs text-gray-400 capitalize">{ini.department}</span>
                    <span className="text-xs text-gray-400">{ini.timeHorizon}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <Badge value={ini.priority} map={PRIORITY_COLORS} />
                  <Badge value={ini.status} map={STATUS_COLORS} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-50">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">{ini.portfolioScore !== null ? ini.portfolioScore.toFixed(1) : '—'}</div>
                  <div className="text-xs text-gray-400">Portfolio Score</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">{ini.estimatedBudget !== null ? `$${(ini.estimatedBudget / 1000).toFixed(0)}k` : '—'}</div>
                  <div className="text-xs text-gray-400">Budget</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">{ini.estimatedRoi !== null ? `$${(ini.estimatedRoi / 1000).toFixed(0)}k` : '—'}</div>
                  <div className="text-xs text-gray-400">Est. ROI</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Portfolio Tab ──────────────────────────────────────────────────────────────

function PortfolioTab() {
  const { data, loading, reload } = useApi('/strategy-orchestrator/portfolio')
  const items = (data ?? []) as Array<{ initiativeId: string; totalScore: number; roiScore: number; riskScore: number; urgencyScore: number; strategicScore: number; rank: number; recommendation: string; initiative?: { title: string; type: string; department: string; priority: string } }>
  const [prioritizing, setPrioritizing] = useState(false)

  const prioritize = async () => {
    setPrioritizing(true)
    await apiPost('/strategy-orchestrator/portfolio/prioritize')
    await reload()
    setPrioritizing(false)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading portfolio...</div>

  const RECOMMENDATION_COLORS: Record<string, string> = {
    'Must Do': 'bg-green-100 text-green-700 border border-green-200',
    'Should Do': 'bg-blue-100 text-blue-700 border border-blue-200',
    'Consider': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    'Deprioritize': 'bg-red-100 text-red-700 border border-red-200',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} items scored · sorted by portfolio priority</p>
        <button onClick={prioritize} disabled={prioritizing} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {prioritizing ? 'Recalculating...' : '⚡ Re-prioritize Portfolio'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No portfolio items. Click Re-prioritize to score all initiatives.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.initiativeId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-gray-200 w-10 text-center shrink-0">#{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 truncate">{item.initiative?.title ?? item.initiativeId}</h4>
                  <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                    <span className="capitalize">{item.initiative?.type}</span>
                    <span>·</span>
                    <span className="capitalize">{item.initiative?.department}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-indigo-600">{item.totalScore.toFixed(1)}</div>
                  <div className="text-xs text-gray-400">total score</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-50">
                {[
                  { label: 'ROI', value: item.roiScore.toFixed(1) },
                  { label: 'Risk', value: item.riskScore.toFixed(1) },
                  { label: 'Urgency', value: item.urgencyScore.toFixed(1) },
                  { label: 'Strategic', value: item.strategicScore.toFixed(1) },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <div className="text-sm font-medium text-gray-700">{m.value}</div>
                    <div className="text-xs text-gray-400">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${RECOMMENDATION_COLORS[item.recommendation] ?? 'bg-gray-100 text-gray-600'}`}>
                  {item.recommendation}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Conflicts Tab ──────────────────────────────────────────────────────────────

function ConflictsTab() {
  const { data, loading, reload } = useApi('/strategy-orchestrator/conflicts')
  const conflicts = (data ?? []) as Conflict[]
  const [detecting, setDetecting] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)
  const [resText, setResText] = useState('')

  const detect = async () => {
    setDetecting(true)
    await apiPost('/strategy-orchestrator/conflicts/detect')
    await reload()
    setDetecting(false)
  }

  const resolve = async (id: string) => {
    if (!resText.trim()) return
    setResolving(id)
    await apiPatch(`/strategy-orchestrator/conflicts/${id}/resolve`, { resolution: resText })
    setResText('')
    setResolving(null)
    await reload()
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading conflicts...</div>

  const open = conflicts.filter(c => !c.resolved)
  const resolved = conflicts.filter(c => c.resolved)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{open.length} open · {resolved.length} resolved</p>
        <button onClick={detect} disabled={detecting} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
          {detecting ? 'Scanning...' : '🔍 Detect Conflicts'}
        </button>
      </div>

      {conflicts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No conflicts found. Click Detect Conflicts to run a cross-initiative scan.</div>
      ) : (
        <div className="space-y-3">
          {[...open, ...resolved].map(c => (
            <div key={c.id} className={`bg-white rounded-xl border shadow-sm p-4 ${c.resolved ? 'opacity-60 border-gray-100' : 'border-orange-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap mb-2">
                    <Badge value={c.severity} map={SEVERITY_COLORS} />
                    <span className="text-xs text-gray-500 capitalize">{c.conflictType?.replace(/_/g, ' ')}</span>
                    {c.resolved && <span className="text-xs text-green-600 font-medium">✓ Resolved</span>}
                  </div>
                  <p className="text-sm text-gray-700">{c.description}</p>
                  {(c.initiativeA || c.initiativeB) && (
                    <div className="flex gap-2 mt-2 text-xs text-gray-400">
                      <span>{c.initiativeA?.title ?? '—'}</span>
                      <span>⟷</span>
                      <span>{c.initiativeB?.title ?? '—'}</span>
                    </div>
                  )}
                </div>
              </div>
              {!c.resolved && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={resolving === c.id ? resText : ''}
                    onChange={e => { setResText(e.target.value) }}
                    onFocus={() => setResolving(c.id)}
                    placeholder="Describe resolution..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
                  />
                  <button onClick={() => resolve(c.id)} disabled={!resText.trim() && resolving !== c.id} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40">
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Calendar Tab ───────────────────────────────────────────────────────────────

function CalendarTab() {
  const { data, loading } = useApi('/strategy-orchestrator/calendar')
  const phases = (data ?? []) as CalendarPhase[]

  if (loading) return <div className="text-center py-20 text-gray-400">Loading calendar...</div>

  const HORIZON_COLORS: Record<string, string> = {
    '30d': 'border-blue-300 bg-blue-50',
    '90d': 'border-purple-300 bg-purple-50',
    '1y': 'border-indigo-300 bg-indigo-50',
    '5y': 'border-gray-300 bg-gray-50',
  }

  return (
    <div className="space-y-4">
      {phases.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No initiatives found to build a calendar from.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phases.map(phase => (
            <div key={phase.horizon} className={`rounded-xl border-2 p-5 ${HORIZON_COLORS[phase.horizon] ?? 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{phase.label}</h3>
                  <div className="text-xs text-gray-500">{phase.initiativeCount} initiatives · ${(phase.totalBudget / 1000).toFixed(0)}k budget</div>
                </div>
                <div className="text-2xl font-black text-gray-200 uppercase">{phase.horizon}</div>
              </div>
              <div className="space-y-2">
                {phase.milestones.slice(0, 4).map((m, i) => (
                  <div key={i} className="bg-white bg-opacity-70 rounded-lg px-3 py-2">
                    <div className="text-xs font-medium text-gray-700 truncate">{m.milestone}</div>
                    <div className="text-xs text-gray-400 truncate">{m.initiative}</div>
                    <div className="text-xs text-gray-400">{new Date(m.dueDate).toLocaleDateString()}</div>
                  </div>
                ))}
                {phase.milestones.length > 4 && (
                  <div className="text-xs text-center text-gray-400 pt-1">+{phase.milestones.length - 4} more milestones</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── KPI Cascade Tab ────────────────────────────────────────────────────────────

function KpiCascadeTab() {
  const [initiativeType, setInitiativeType] = useState('growth')
  const [result, setResult] = useState<null | { company: Array<{ metric: string; target: string; frequency: string }>; departments: Array<{ dept: string; kpis: Array<{ metric: string; target: string }> }>; individual: Array<{ role: string; kpis: Array<{ metric: string; target: string }> }> }>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    const r = await apiPost('/strategy-orchestrator/kpi-cascade', { initiativeType })
    if (r.success) setResult(r.data)
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Generate KPI Cascade</h3>
        <div className="flex gap-3">
          <select value={initiativeType} onChange={e => setInitiativeType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {['growth', 'cost', 'risk', 'product', 'hiring', 'process', 'technology', 'market'].map(t => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>
          <button onClick={run} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Generating...' : '⚡ Generate KPI Cascade'}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5">
            <h4 className="font-semibold text-indigo-700 mb-3">Company Level KPIs</h4>
            <div className="space-y-2">
              {result.company.map((kpi, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-lg">
                  <span className="text-sm font-medium text-indigo-800">{kpi.metric}</span>
                  <div className="flex gap-3 text-xs text-indigo-600">
                    <span>{kpi.target}</span>
                    <span className="text-indigo-400">·</span>
                    <span>{kpi.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.departments.length > 0 && (
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-5">
              <h4 className="font-semibold text-purple-700 mb-3">Department Level KPIs</h4>
              <div className="space-y-3">
                {result.departments.map((dept, i) => (
                  <div key={i}>
                    <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1.5">{dept.dept}</div>
                    <div className="space-y-1.5">
                      {dept.kpis.map((kpi, j) => (
                        <div key={j} className="flex items-center justify-between px-3 py-1.5 bg-purple-50 rounded-lg">
                          <span className="text-sm text-purple-800">{kpi.metric}</span>
                          <span className="text-xs text-purple-600">{kpi.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.individual.length > 0 && (
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
              <h4 className="font-semibold text-green-700 mb-3">Individual Level KPIs</h4>
              <div className="space-y-3">
                {result.individual.map((role, i) => (
                  <div key={i}>
                    <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1.5">{role.role}</div>
                    <div className="space-y-1.5">
                      {role.kpis.map((kpi, j) => (
                        <div key={j} className="flex items-center justify-between px-3 py-1.5 bg-green-50 rounded-lg">
                          <span className="text-sm text-green-800">{kpi.metric}</span>
                          <span className="text-xs text-green-600">{kpi.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Strategy Review Tab ────────────────────────────────────────────────────────

function StrategyReviewTab() {
  const { data: reviews, loading: loadingList, reload } = useApi('/strategy-orchestrator/strategy-reviews')
  const reviewList = (reviews ?? []) as Array<{ id: string; createdAt: string; details: { summary: string; onTrackCount: number; atRiskCount: number; completedCount: number; recommendations: string[] } }>
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    await apiPost('/strategy-orchestrator/strategy-review')
    await reload()
    setRunning(false)
  }

  if (loadingList) return <div className="text-center py-20 text-gray-400">Loading reviews...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{reviewList.length} strategy reviews on record</p>
        <button onClick={run} disabled={running} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          {running ? 'Running Review...' : '📊 Run Strategy Review'}
        </button>
      </div>

      {reviewList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No reviews yet. Click Run Strategy Review to generate your first AI analysis.</div>
      ) : (
        <div className="space-y-3">
          {reviewList.map(review => {
            const d = review.details
            const isOpen = expanded === review.id
            return (
              <div key={review.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <button className="w-full text-left p-4" onClick={() => setExpanded(isOpen ? null : review.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-700">{new Date(review.createdAt).toLocaleString()}</div>
                      <div className="flex gap-4 mt-1 text-xs">
                        <span className="text-green-600">✓ {d?.onTrackCount ?? 0} on track</span>
                        <span className="text-orange-600">⚠ {d?.atRiskCount ?? 0} at risk</span>
                        <span className="text-blue-600">★ {d?.completedCount ?? 0} completed</span>
                      </div>
                    </div>
                    <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                    <p className="text-sm text-gray-700">{d?.summary}</p>
                    {d?.recommendations && d.recommendations.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1.5">AI Recommendations</div>
                        <ul className="space-y-1.5">
                          {d.recommendations.map((rec, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700">
                              <span className="text-purple-400 shrink-0">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Decision Board Tab ─────────────────────────────────────────────────────────

function DecisionBoardTab() {
  const { data, loading } = useApi('/strategy-orchestrator/decision-board')
  const board = data as { entries: DecisionEntry[]; generatedAt: string } | null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading decision board...</div>

  const entries = board?.entries ?? []

  return (
    <div className="space-y-4">
      {board && (
        <p className="text-xs text-gray-400">Last generated: {new Date(board.generatedAt).toLocaleString()}</p>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No decisions pending. Add initiatives or signals to populate the board.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge value={entry.urgency} map={URGENCY_COLORS} />
                    <span className="text-xs text-gray-500 capitalize">{entry.type?.replace(/_/g, ' ')}</span>
                  </div>
                  <h4 className="font-medium text-gray-800">{entry.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{entry.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  {entry.estimatedRoi !== null && (
                    <div className="text-sm font-medium text-green-600">${(entry.estimatedRoi / 1000).toFixed(0)}k ROI</div>
                  )}
                  {entry.riskScore !== null && (
                    <div className="text-xs text-orange-500">Risk: {entry.riskScore}</div>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <div className="text-xs text-gray-500 mb-0.5">Recommendation</div>
                <p className="text-sm text-indigo-700 font-medium">{entry.recommendation}</p>
                {entry.suggestedAction && (
                  <p className="text-xs text-gray-500 mt-1">Action: {entry.suggestedAction}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'initiatives', label: 'Initiatives' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'conflicts', label: 'Conflicts' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'kpi-cascade', label: 'KPI Cascade' },
  { key: 'strategy-review', label: 'Strategy Review' },
  { key: 'decision-board', label: 'Decision Board' },
]

export default function StrategyOrchestratorPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Enterprise Strategy Orchestrator</h1>
        <p className="text-sm text-gray-500 mt-1">Strategic initiative management · Portfolio prioritization · Conflict detection · KPI cascade · Executive calendar</p>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'initiatives' && <InitiativesTab />}
        {tab === 'portfolio' && <PortfolioTab />}
        {tab === 'conflicts' && <ConflictsTab />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'kpi-cascade' && <KpiCascadeTab />}
        {tab === 'strategy-review' && <StrategyReviewTab />}
        {tab === 'decision-board' && <DecisionBoardTab />}
      </div>
    </div>
  )
}
