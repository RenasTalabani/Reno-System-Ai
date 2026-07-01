'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Source {
  id: string; name: string; type: string; category: string; url: string | null; enabled: boolean; createdAt: string
}

interface Signal {
  id: string; type: string; title: string; summary: string | null; value: number | null; unit: string | null
  sentiment: string | null; relevance: number | null; tags: string[]; signalDate: string; source?: { name: string; type: string } | null
}

interface Alert {
  id: string; severity: string; title: string; message: string; dismissed: boolean; createdAt: string
  signal: { type: string; title: string; signalDate: string }
}

interface DashboardStats {
  sources: number; signals: number; activeAlerts: number; insights: number
  marketSentiment: string; signalBreakdown: { positive: number; negative: number; neutral: number }
}

interface Briefing {
  marketOverview: string; topRisks: string[]; opportunities: string[]
  goalAdjustments: { goalTitle: string; baseSuccessProb: number; adjustedSuccessProb: number; adjustment: number; drivers: string[] }[]
  executiveSummary: string; recommendedActions: string[]
}

interface Insight {
  id: string; type: string; title: string; content: string; generatedAt: string
}

type Tab = 'dashboard' | 'signals' | 'alerts' | 'sources' | 'briefing' | 'insights'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'bg-green-100 text-green-700 border-green-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

const TYPE_ICON: Record<string, string> = {
  currency: '💱', commodity: '📦', news: '📰', regulation: '⚖️',
  economic: '📈', competitor: '🏢', security: '🔒', shipping: '🚢', energy: '⚡',
}

const SIGNAL_TYPES = ['currency', 'commodity', 'news', 'regulation', 'economic', 'competitor', 'security', 'shipping', 'energy']

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const r = await fetch(`/api/proxy?path=/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
  })
  return r.json()
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col gap-1">
      <div className="text-sm text-gray-500 font-medium">{label}</div>
      <div className={`text-3xl font-bold ${color ?? 'text-gray-800'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2">
          <span className="text-xl shrink-0">{TYPE_ICON[signal.type] ?? '📡'}</span>
          <div className="font-medium text-gray-800 text-sm leading-tight">{signal.title}</div>
        </div>
        {signal.sentiment && (
          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${SENTIMENT_COLOR[signal.sentiment] ?? SENTIMENT_COLOR.neutral}`}>
            {signal.sentiment}
          </span>
        )}
      </div>
      {signal.summary && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{signal.summary}</p>}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="font-medium text-gray-600 capitalize">{signal.type}</span>
        {signal.value != null && <span className="font-semibold text-gray-700">{signal.value} {signal.unit}</span>}
        <span className="ml-auto">{new Date(signal.signalDate).toLocaleDateString()}</span>
      </div>
      {signal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {signal.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExternalIntelligencePage() {
  const { data: session } = useSession()
  const token = (session as { accessToken?: string })?.accessToken ?? ''

  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(false)

  // Signal filter
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>('')

  // Source form
  const [showSourceForm, setShowSourceForm] = useState(false)
  const [sourceForm, setSourceForm] = useState({ name: '', type: 'news', category: 'sales', url: '' })

  // Manual signal form
  const [showSignalForm, setShowSignalForm] = useState(false)
  const [signalForm, setSignalForm] = useState({ type: 'news', title: '', summary: '', value: '', unit: '', sentiment: 'neutral', tags: '' })

  // Simulate
  const [simulateType, setSimulateType] = useState('currency')
  const [simulateResult, setSimulateResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const path = signalTypeFilter ? `/external-intelligence/signals?type=${signalTypeFilter}` : '/external-intelligence/signals'
      const [s, sg, al, src, ins] = await Promise.all([
        apiFetch('/external-intelligence/dashboard', token),
        apiFetch(path, token),
        apiFetch('/external-intelligence/alerts', token),
        apiFetch('/external-intelligence/sources', token),
        apiFetch('/external-intelligence/insights', token),
      ])
      if (s.success) setStats(s.data)
      if (sg.success) setSignals(sg.data)
      if (al.success) setAlerts(al.data)
      if (src.success) setSources(src.data)
      if (ins.success) setInsights(ins.data)
    } finally {
      setLoading(false)
    }
  }, [token, signalTypeFilter])

  useEffect(() => { load() }, [load])

  async function createSource() {
    if (!sourceForm.name.trim()) return
    const r = await apiFetch('/external-intelligence/sources', token, { method: 'POST', body: JSON.stringify(sourceForm) })
    if (r.success) { setShowSourceForm(false); setSourceForm({ name: '', type: 'news', category: 'sales', url: '' }); load() }
  }

  async function addSignal() {
    if (!signalForm.title.trim()) return
    const payload = {
      ...signalForm,
      value: signalForm.value ? parseFloat(signalForm.value) : undefined,
      tags: signalForm.tags ? signalForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      signalDate: new Date().toISOString(),
    }
    const r = await apiFetch('/external-intelligence/signals', token, { method: 'POST', body: JSON.stringify(payload) })
    if (r.success) {
      setShowSignalForm(false)
      setSignalForm({ type: 'news', title: '', summary: '', value: '', unit: '', sentiment: 'neutral', tags: '' })
      load()
    }
  }

  async function simulate() {
    setSimulateResult(null)
    const r = await apiFetch('/external-intelligence/signals/simulate', token, { method: 'POST', body: JSON.stringify({ type: simulateType }) })
    if (r.success) { setSimulateResult(`Created ${r.data.created} ${simulateType} signal(s).`); load() }
    else setSimulateResult(r.error ?? 'Error')
  }

  async function dismissAlert(id: string) {
    await apiFetch(`/external-intelligence/alerts/${id}/dismiss`, token, { method: 'PATCH', body: '{}' })
    load()
  }

  async function loadBriefing() {
    setBriefingLoading(true)
    setBriefing(null)
    const r = await apiFetch('/external-intelligence/executive-briefing', token)
    if (r.success) setBriefing(r.data)
    setBriefingLoading(false)
    load()
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'signals', label: `Signals${signals.length ? ` (${signals.length})` : ''}` },
    { id: 'alerts', label: `Alerts${alerts.length ? ` (${alerts.length})` : ''}` },
    { id: 'sources', label: 'Sources' },
    { id: 'briefing', label: 'Executive Briefing' },
    { id: 'insights', label: 'Insights' },
  ]

  const sentimentColor = stats?.marketSentiment === 'positive' ? 'text-emerald-600' : stats?.marketSentiment === 'negative' ? 'text-red-600' : 'text-yellow-600'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI External Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">Market Signals · Currency · Commodities · Competitors · Regulations · Security</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Refresh</button>
          <button onClick={() => setShowSignalForm(true)} className="px-3 py-1.5 text-sm border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">+ Signal</button>
          <button onClick={() => setShowSourceForm(true)} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">+ Source</button>
        </div>
      </div>

      {/* Tabs */}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Sources" value={stats.sources} />
            <StatCard label="Total Signals" value={stats.signals} />
            <StatCard label="Active Alerts" value={stats.activeAlerts} color={stats.activeAlerts > 0 ? 'text-red-600' : 'text-gray-800'} />
            <StatCard label="Insights Generated" value={stats.insights} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Market Sentiment</div>
            <div className={`text-2xl font-bold capitalize mb-1 ${sentimentColor}`}>{stats.marketSentiment}</div>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">↑ {stats.signalBreakdown.positive} positive</span>
              <span className="text-red-500">↓ {stats.signalBreakdown.negative} negative</span>
              <span className="text-gray-400">→ {stats.signalBreakdown.neutral} neutral</span>
            </div>
          </div>

          {/* Simulate panel */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5">
            <div className="text-sm font-semibold text-indigo-800 mb-3">Simulate Market Signal</div>
            <div className="flex gap-2 flex-wrap mb-3">
              {SIGNAL_TYPES.map(t => (
                <button key={t} onClick={() => setSimulateType(t)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1 ${simulateType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}>
                  {TYPE_ICON[t]} {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={simulate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                Simulate {simulateType} signals
              </button>
              {simulateResult && <span className="text-sm text-indigo-700">{simulateResult}</span>}
            </div>
          </div>

          {/* Recent alerts preview */}
          {alerts.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="text-sm font-semibold text-red-800 mb-2">{alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}</div>
              {alerts.slice(0, 2).map(a => (
                <div key={a.id} className={`text-sm p-2 rounded-lg border mb-1 ${SEVERITY_COLOR[a.severity] ?? SEVERITY_COLOR.medium}`}>
                  {a.title}
                </div>
              ))}
              <button onClick={() => setTab('alerts')} className="text-xs text-red-600 underline mt-1">View all alerts →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Signals ── */}
      {tab === 'signals' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSignalTypeFilter('')}
              className={`px-3 py-1.5 text-sm rounded-lg border ${!signalTypeFilter ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              All
            </button>
            {SIGNAL_TYPES.map(t => (
              <button key={t} onClick={() => setSignalTypeFilter(t)}
                className={`px-3 py-1.5 text-sm rounded-lg border flex items-center gap-1 ${signalTypeFilter === t ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {TYPE_ICON[t]} {t}
              </button>
            ))}
          </div>
          {signals.length === 0 && <div className="text-sm text-gray-400">No signals yet. Use simulate to add demo data, or add signals manually.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {signals.map(s => <SignalCard key={s.id} signal={s} />)}
          </div>
        </div>
      )}

      {/* ── Alerts ── */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 && <div className="text-sm text-gray-400">No active alerts. The system will automatically generate alerts when critical signals are detected.</div>}
          {alerts.map(a => (
            <div key={a.id} className={`border rounded-xl p-4 flex items-start justify-between gap-3 ${SEVERITY_COLOR[a.severity] ?? SEVERITY_COLOR.medium}`}>
              <div>
                <div className="font-semibold text-sm mb-1">{a.title}</div>
                <div className="text-sm opacity-80">{a.message}</div>
                <div className="text-xs opacity-60 mt-1">{a.signal.title} · {new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <button onClick={() => dismissAlert(a.id)} className="shrink-0 text-xs border border-current rounded px-2 py-0.5 opacity-70 hover:opacity-100">
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Sources ── */}
      {tab === 'sources' && (
        <div className="space-y-3">
          {sources.length === 0 && <div className="text-sm text-gray-400">No sources configured. Add intelligence sources to begin automated monitoring.</div>}
          {sources.map(s => (
            <div key={s.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-3 ${s.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{TYPE_ICON[s.type] ?? '📡'}</span>
                <div>
                  <div className="font-medium text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.type} · {s.category} {s.url ? `· ${s.url}` : ''}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {s.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Executive Briefing ── */}
      {tab === 'briefing' && (
        <div className="space-y-5">
          <button onClick={loadBriefing} disabled={briefingLoading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {briefingLoading ? 'Generating...' : 'Generate Executive Briefing'}
          </button>

          {briefing && (
            <>
              {/* Market overview */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
                <div className="text-sm font-semibold text-blue-800 mb-2">Market Overview</div>
                <p className="text-sm text-blue-700">{briefing.marketOverview}</p>
              </div>

              {/* Executive summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2">Executive Summary</div>
                <p className="text-sm text-gray-700 leading-relaxed">{briefing.executiveSummary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risks */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="text-sm font-semibold text-red-800 mb-2">Top Risks</div>
                  <ul className="space-y-1">
                    {briefing.topRisks.map((r, i) => (
                      <li key={i} className="text-sm text-red-700 flex gap-2"><span className="text-red-400">▼</span>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <div className="text-sm font-semibold text-green-800 mb-2">Opportunities</div>
                  <ul className="space-y-1">
                    {briefing.opportunities.map((o, i) => (
                      <li key={i} className="text-sm text-green-700 flex gap-2"><span className="text-green-400">▲</span>{o}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended actions */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-3">Recommended Actions</div>
                <ol className="space-y-2">
                  {briefing.recommendedActions.map((a, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-bold text-blue-600 shrink-0">{i + 1}.</span>
                      <span className="text-gray-700">{a}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Goal adjustments */}
              {briefing.goalAdjustments.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Goal Success Probability Adjustments</div>
                  <div className="space-y-3">
                    {briefing.goalAdjustments.map((adj, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{adj.goalTitle}</div>
                          <div className="text-xs text-gray-400">{adj.drivers[0]}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-gray-400">{Math.round(adj.baseSuccessProb * 100)}%</span>
                            <span className="mx-1 text-gray-300">→</span>
                            <span className={`font-bold ${adj.adjustment >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {Math.round(adj.adjustedSuccessProb * 100)}%
                            </span>
                          </div>
                          <div className={`text-xs ${adj.adjustment >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {adj.adjustment >= 0 ? '+' : ''}{adj.adjustment}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Insights ── */}
      {tab === 'insights' && (
        <div className="space-y-3">
          {insights.length === 0 && <div className="text-sm text-gray-400">No insights generated yet. Run the executive briefing or request a goal impact analysis.</div>}
          {insights.map(ins => (
            <div key={ins.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-semibold text-sm text-gray-800">{ins.title}</div>
                <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full shrink-0">{ins.type.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-gray-600">{ins.content}</p>
              <div className="text-xs text-gray-400 mt-2">{new Date(ins.generatedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Source Modal ── */}
      {showSourceForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="font-bold text-gray-800 mb-4">Add Intelligence Source</div>
            <div className="space-y-3">
              <input value={sourceForm.name} onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })} placeholder="Source name" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <div className="grid grid-cols-2 gap-3">
                <select value={sourceForm.type} onChange={e => setSourceForm({ ...sourceForm, type: e.target.value })} className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none">
                  {SIGNAL_TYPES.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t}</option>)}
                </select>
                <select value={sourceForm.category} onChange={e => setSourceForm({ ...sourceForm, category: e.target.value })} className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none">
                  {['sales', 'growth', 'hiring', 'cost', 'product', 'finance', 'regulation'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input value={sourceForm.url} onChange={e => setSourceForm({ ...sourceForm, url: e.target.value })} placeholder="URL (optional)" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowSourceForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={createSource} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Source</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Signal Modal ── */}
      {showSignalForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="font-bold text-gray-800 mb-4">Add Manual Signal</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={signalForm.type} onChange={e => setSignalForm({ ...signalForm, type: e.target.value })} className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none">
                  {SIGNAL_TYPES.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t}</option>)}
                </select>
                <select value={signalForm.sentiment} onChange={e => setSignalForm({ ...signalForm, sentiment: e.target.value })} className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none">
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <input value={signalForm.title} onChange={e => setSignalForm({ ...signalForm, title: e.target.value })} placeholder="Signal title" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <textarea value={signalForm.summary} onChange={e => setSignalForm({ ...signalForm, summary: e.target.value })} placeholder="Summary (optional)" rows={2} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={signalForm.value} onChange={e => setSignalForm({ ...signalForm, value: e.target.value })} placeholder="Value (optional)" type="number" className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
                <input value={signalForm.unit} onChange={e => setSignalForm({ ...signalForm, unit: e.target.value })} placeholder="Unit (e.g. USD, %)" className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
              </div>
              <input value={signalForm.tags} onChange={e => setSignalForm({ ...signalForm, tags: e.target.value })} placeholder="Tags (comma-separated)" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowSignalForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={addSignal} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Signal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
