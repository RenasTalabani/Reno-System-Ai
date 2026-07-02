'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, BarChart3, Radar, Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

const API = (path: string) => `/api/proxy?path=${encodeURIComponent(path)}`

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function Badge({ v, map }: { v: string; map: Record<string, string> }) {
  const cls = map[v] ?? 'bg-gray-100 text-gray-700'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{v.replace(/_/g, ' ')}</span>
}

const STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700', achieved: 'bg-blue-100 text-blue-700',
  at_risk: 'bg-yellow-100 text-yellow-700', behind: 'bg-red-100 text-red-700',
  not_started: 'bg-gray-100 text-gray-600',
}
const TREND_COLORS: Record<string, string> = {
  outperforming: 'bg-green-100 text-green-700', on_target: 'bg-blue-100 text-blue-700',
  below_target: 'bg-yellow-100 text-yellow-700', underperforming: 'bg-red-100 text-red-700',
}
const URGENCY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700',
}
const IMPACT_COLORS: Record<string, string> = {
  transformative: 'bg-purple-100 text-purple-700', high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-600',
}

export default function ExecutiveAIPage() {
  const [tab, setTab] = useState<'dashboard' | 'goals' | 'metrics' | 'competitors' | 'insights'>('dashboard')
  const [data, setData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (section: string) => {
    setLoading(true)
    try {
      const res = await fetch(API(`/v1/ei/${section}`))
      const json = await res.json()
      setData(prev => ({ ...prev, [section]: json }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'dashboard') load('dashboard')
    else if (tab === 'goals') load('strategic-goals')
    else if (tab === 'metrics') load('board-metrics')
    else if (tab === 'competitors') load('competitor-signals')
    else if (tab === 'insights') load('insights')
  }, [tab, load])

  const post = async (path: string, body: Record<string, any>, successMsg: string) => {
    const res = await fetch(API(`/v1/ei/${path}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setMsg(successMsg)
      setShowForm(false)
      setForm({})
      if (tab === 'dashboard') load('dashboard')
      else if (tab === 'goals') load('strategic-goals')
      else if (tab === 'metrics') load('board-metrics')
      else if (tab === 'competitors') load('competitor-signals')
      else if (tab === 'insights') load('insights')
    } else {
      const err = await res.json()
      setMsg(`Error: ${err.message ?? 'Unknown error'}`)
    }
  }

  const del = async (path: string) => {
    const res = await fetch(API(`/v1/ei/${path}`), { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setMsg('Deleted')
      if (tab === 'goals') load('strategic-goals')
      else if (tab === 'competitors') load('competitor-signals')
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'goals', label: 'Strategic Goals', icon: Target },
    { id: 'metrics', label: 'Board Metrics', icon: TrendingUp },
    { id: 'competitors', label: 'Competitive Intel', icon: Radar },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
  ] as const

  const summary = data.dashboard?.summary ?? {}
  const goals: any[] = tab === 'dashboard' ? (data.dashboard?.goals ?? []) : (data['strategic-goals'] ?? [])
  const metrics: any[] = tab === 'dashboard' ? (data.dashboard?.metrics ?? []) : (data['board-metrics'] ?? [])
  const signals: any[] = data['competitor-signals'] ?? data.dashboard?.signals ?? []
  const insights: any[] = data.insights ?? data.dashboard?.insights ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Executive AI Intelligence</h1>
          <p className="text-sm text-muted-foreground">AI-powered strategy, board metrics, and competitive intelligence</p>
        </div>
        {msg && (
          <div className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">
            {msg}
            <button className="ml-3 text-green-500 hover:text-green-700" onClick={() => setMsg('')}>✕</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setShowForm(false); setMsg('') }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">Loading...</div>}

      {/* Dashboard */}
      {tab === 'dashboard' && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Goals" value={summary.totalGoals ?? 0} />
            <StatCard label="Goals Achieved" value={summary.achievedGoals ?? 0} color="text-green-600" />
            <StatCard label="At Risk" value={summary.atRisk ?? 0} color="text-red-600" />
            <StatCard label="Health Score" value={`${summary.healthScore ?? 0}%`} sub={`Avg attainment: ${summary.avgMetricAttainment ?? 0}%`} color="text-blue-600" />
          </div>

          {/* Recent Goals */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Strategic Goals Overview</h2>
            {goals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No goals yet.</p>
            ) : (
              <div className="space-y-2">
                {goals.slice(0, 5).map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{g.title}</p>
                      <p className="text-xs text-muted-foreground">{g.category} • Owner: {g.owner ?? 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{g.progress}%</p>
                        <p className="text-xs text-muted-foreground">AI: {Math.round(g.aiProbability * 100)}% likely</p>
                      </div>
                      <Badge v={g.status} map={STATUS_COLORS} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Insights */}
          {data.dashboard?.insights?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Latest AI Insights</h2>
              <div className="space-y-2">
                {data.dashboard.insights.map((ins: any) => (
                  <div key={ins.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{ins.title}</p>
                      <p className="text-xs text-muted-foreground">{ins.summary}</p>
                    </div>
                    <Badge v={ins.urgency} map={URGENCY_COLORS} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strategic Goals */}
      {tab === 'goals' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{goals.length} strategic goals</p>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              + Add Goal
            </button>
          </div>

          {showForm && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">New Strategic Goal</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'title', label: 'Title', placeholder: 'Increase ARR by 50%' },
                  { key: 'category', label: 'Category', placeholder: 'revenue' },
                  { key: 'owner', label: 'Owner', placeholder: 'CEO' },
                  { key: 'targetDate', label: 'Target Date', placeholder: '2026-12-31' },
                  { key: 'targetValue', label: 'Target Value', placeholder: '5000000' },
                  { key: 'currentValue', label: 'Current Value', placeholder: '3000000' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input
                      className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background mt-1"
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => post('strategic-goals', { ...form, targetValue: form.targetValue ? +form.targetValue : undefined, currentValue: form.currentValue ? +form.currentValue : 0 }, 'Goal created')}
                  className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg"
                >Save</button>
                <button onClick={() => setShowForm(false)} className="text-sm border border-border px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {goals.map((g: any) => (
              <div key={g.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{g.title}</h3>
                    <p className="text-xs text-muted-foreground">{g.category} • {g.owner ?? 'No owner'} • AI: {Math.round(g.aiProbability * 100)}% probability</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge v={g.status} map={STATUS_COLORS} />
                    <button onClick={() => post(`strategic-goals/${g.id}/analyze`, {}, 'Analyzed')} className="text-xs border border-border px-2 py-1 rounded hover:bg-muted">Analyze</button>
                    <button onClick={() => del(`strategic-goals/${g.id}`)} className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${g.progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress: {g.progress}%</span>
                  {g.targetDate && <span>Target: {new Date(g.targetDate).toLocaleDateString()}</span>}
                  {g.targetValue && <span>Target Value: {g.targetValue.toLocaleString()}</span>}
                </div>
                {Array.isArray(g.aiInsights) && g.aiInsights.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-xs text-blue-600 font-medium">AI Insights</p>
                    {g.aiInsights.map((ins: string, i: number) => (
                      <p key={i} className="text-xs text-blue-700">• {ins}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {goals.length === 0 && <p className="text-center text-muted-foreground py-8">No strategic goals yet.</p>}
          </div>
        </div>
      )}

      {/* Board Metrics */}
      {tab === 'metrics' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{metrics.length} board metrics</p>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              + Add / Upsert Metric
            </button>
          </div>

          {showForm && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Upsert Board Metric</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'metricCode', label: 'Metric Code', placeholder: 'ARR' },
                  { key: 'metricName', label: 'Metric Name', placeholder: 'Annual Recurring Revenue' },
                  { key: 'period', label: 'Period', placeholder: '2026-Q2' },
                  { key: 'actual', label: 'Actual', placeholder: '4500000' },
                  { key: 'target', label: 'Target', placeholder: '5000000' },
                  { key: 'benchmark', label: 'Benchmark (opt)', placeholder: '4000000' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input
                      className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background mt-1"
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => post('board-metrics/upsert', { ...form, actual: +form.actual, target: +form.target, benchmark: form.benchmark ? +form.benchmark : undefined }, 'Metric upserted')}
                  className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg"
                >Save</button>
                <button onClick={() => setShowForm(false)} className="text-sm border border-border px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map((m: any) => {
              const attainment = m.target > 0 ? Math.round((m.actual / m.target) * 100) : 0
              return (
                <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{m.metricName}</h3>
                      <p className="text-xs text-muted-foreground">{m.metricCode} • {m.period}</p>
                    </div>
                    <Badge v={m.aiTrend} map={TREND_COLORS} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-3">
                    <div className="bg-muted/30 rounded p-2">
                      <p className="text-xs text-muted-foreground">Actual</p>
                      <p className="font-bold text-sm">{m.actual.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/30 rounded p-2">
                      <p className="text-xs text-muted-foreground">Target</p>
                      <p className="font-bold text-sm">{m.target.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/30 rounded p-2">
                      <p className="text-xs text-muted-foreground">Attainment</p>
                      <p className={`font-bold text-sm ${attainment >= 100 ? 'text-green-600' : attainment >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{attainment}%</p>
                    </div>
                  </div>
                  {m.aiComment && <p className="text-xs text-muted-foreground mt-2 italic">{m.aiComment}</p>}
                  {m.benchmark && <p className="text-xs text-muted-foreground mt-1">Benchmark: {m.benchmark.toLocaleString()}</p>}
                </div>
              )
            })}
            {metrics.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-8">No board metrics yet.</p>}
          </div>
        </div>
      )}

      {/* Competitive Intelligence */}
      {tab === 'competitors' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{signals.length} competitor signals</p>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              + Add Signal
            </button>
          </div>

          {showForm && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">New Competitor Signal</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'competitor', label: 'Competitor', placeholder: 'Acme Corp' },
                  { key: 'signalType', label: 'Type', placeholder: 'product / pricing / talent / funding / partnership / market' },
                  { key: 'summary', label: 'Summary', placeholder: 'Launched competing feature X' },
                  { key: 'impact', label: 'Impact', placeholder: 'high / medium / low' },
                  { key: 'source', label: 'Source (opt)', placeholder: 'TechCrunch' },
                  { key: 'signalDate', label: 'Date (opt)', placeholder: '2026-07-01' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input
                      className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background mt-1"
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => post('competitor-signals', form, 'Signal created')}
                  className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg"
                >Save</button>
                <button onClick={() => setShowForm(false)} className="text-sm border border-border px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {signals.map((s: any) => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{s.competitor}</span>
                      <Badge v={s.signalType} map={{}} />
                      <Badge v={s.impact} map={IMPACT_COLORS} />
                    </div>
                    <p className="text-sm text-muted-foreground">{s.summary}</p>
                    {s.source && <p className="text-xs text-muted-foreground mt-1">Source: {s.source}</p>}
                    {s.aiResponse && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mt-2">
                        <p className="text-xs text-purple-600 font-medium">AI Response Strategy</p>
                        <p className="text-xs text-purple-700">{s.aiResponse}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => del(`competitor-signals/${s.id}`)} className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50 ml-3">Delete</button>
                </div>
              </div>
            ))}
            {signals.length === 0 && <p className="text-center text-muted-foreground py-8">No competitor signals yet.</p>}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {tab === 'insights' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{insights.length} AI insights</p>
            <button
              onClick={() => post('insights/generate', {}, 'Insights generated')}
              className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4" /> Generate AI Insights
            </button>
          </div>

          <div className="space-y-3">
            {insights.map((ins: any) => (
              <div key={ins.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm">{ins.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge v={ins.urgency} map={URGENCY_COLORS} />
                    <Badge v={ins.impact} map={IMPACT_COLORS} />
                    <span className="text-xs text-muted-foreground">{ins.type}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{ins.summary}</p>
                <p className="text-xs text-muted-foreground mt-1">AI Confidence: {Math.round(ins.confidence * 100)}%</p>
                {Array.isArray(ins.actionItems) && ins.actionItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-foreground">Action Items:</p>
                    <ul className="mt-1 space-y-0.5">
                      {ins.actionItems.map((a: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {insights.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No AI insights yet. Click "Generate AI Insights" to analyze your goals, metrics, and competitive signals.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
