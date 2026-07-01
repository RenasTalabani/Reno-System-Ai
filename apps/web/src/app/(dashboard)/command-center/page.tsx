'use client'

import { useState, useEffect, useCallback } from 'react'

async function apiGet(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`)
  return r.json()
}
async function apiPost(path: string, body?: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return r.json()
}
async function apiPatch(path: string, body: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}
async function apiDelete(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return r.json()
}

interface HealthCheck { module: string; status: string; responseMs: number; details: Record<string, unknown> }
interface Alert { id: string; module: string; alertType: string; severity: string; title: string; message: string; isRead: boolean; isResolved: boolean; createdAt: string }
interface MetricSnapshot { id: string; period: string; capturedAt: string; aiScore: number; trend: string; metrics: Record<string, unknown> }
interface Insight { type: string; title: string; description: string; impact: string; module: string; actionable: boolean }
interface Module { id: string; name: string; icon: string; category: string }
interface PlatformMetrics { aiScore: number; trend: string; modules: { totalModules: number; healthyModules: number; degradedModules: number; downModules: number }; ai: { totalAgentTasks: number; totalToolCalls: number; totalLearningEvents: number; avgTaskSuccessRate: number; totalEventsProcessed: number }; business: { totalDocumentsProcessed: number; totalMessagesSent: number; totalWorkflowRuns: number }; costSummary: { totalAiCost: number; budgetUsedPct: number } }
interface OverviewData { summary: string; metrics: PlatformMetrics; healthChecks: HealthCheck[]; suggestedAlerts: Alert[]; insights: Insight[]; recentAlerts: Alert[]; activeAlertCount: number; modules: Module[] }

const TABS = ['Overview', 'Health', 'Alerts', 'Metrics', 'Insights', 'Modules'] as const
type Tab = typeof TABS[number]

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700', warning: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700', error: 'bg-red-100 text-red-700',
}
const HEALTH_COLORS: Record<string, string> = {
  healthy: 'bg-green-100 text-green-700', degraded: 'bg-yellow-100 text-yellow-700', down: 'bg-red-100 text-red-700',
}
const INSIGHT_COLORS: Record<string, string> = {
  achievement: 'bg-green-50 border-green-200', risk: 'bg-red-50 border-red-200',
  opportunity: 'bg-blue-50 border-blue-200', recommendation: 'bg-amber-50 border-amber-200',
}
const INSIGHT_ICONS: Record<string, string> = { achievement: '🏆', risk: '⚠️', opportunity: '💡', recommendation: '📋' }
const TREND_ICONS: Record<string, string> = { improving: '↑', stable: '→', declining: '↓' }
const TREND_COLORS: Record<string, string> = { improving: 'text-green-600', stable: 'text-gray-600', declining: 'text-red-600' }

export default function CommandCenterPage() {
  const [tab, setTab] = useState<Tab>('Overview')
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [health, setHealth] = useState<{ checks: HealthCheck[]; summary: Record<string, number>; overallStatus: string } | null>(null)
  const [alerts, setAlerts] = useState<{ alerts: Alert[]; severityCounts: Record<string, number> }>({ alerts: [], severityCounts: {} })
  const [snapshots, setSnapshots] = useState<MetricSnapshot[]>([])
  const [insights, setInsights] = useState<{ insights: Insight[]; metrics: PlatformMetrics } | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadOverview = useCallback(async () => { const d = await apiGet('/v1/pcc/overview'); setOverview(d) }, [])
  const loadHealth = useCallback(async () => { const d = await apiGet('/v1/pcc/health'); setHealth(d) }, [])
  const loadAlerts = useCallback(async () => { const d = await apiGet('/v1/pcc/alerts'); setAlerts(d) }, [])
  const loadMetrics = useCallback(async () => { const d = await apiGet('/v1/pcc/metrics'); setSnapshots(d.snapshots ?? []) }, [])
  const loadInsights = useCallback(async () => { const d = await apiGet('/v1/pcc/insights'); setInsights(d) }, [])
  const loadModules = useCallback(async () => { const d = await apiGet('/v1/pcc/modules'); setModules(d.modules ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Overview: loadOverview, Health: loadHealth, Alerts: loadAlerts,
      Metrics: loadMetrics, Insights: loadInsights, Modules: loadModules,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadOverview, loadHealth, loadAlerts, loadMetrics, loadInsights, loadModules])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadOverview, 15_000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadOverview])

  const runHealthCheck = async () => {
    flash('Running health checks...')
    await apiPost('/v1/pcc/health/run')
    await loadHealth(); flash('Health checks complete')
  }

  const captureMetrics = async () => {
    const r = await apiPost('/v1/pcc/metrics/capture', { period: 'hourly' })
    flash(`Metrics captured — AI Score: ${r.aiScore}/100 (${r.trend})`); await loadMetrics()
  }

  const generateAlerts = async () => {
    const r = await apiPost('/v1/pcc/alerts/generate')
    flash(`${r.generated} alert${r.generated !== 1 ? 's' : ''} generated`); await loadAlerts()
  }

  const resolveAlert = async (id: string) => {
    await apiPatch(`/v1/pcc/alerts/${id}/resolve`, {}); await loadAlerts()
  }

  const markRead = async (id: string) => {
    await apiPatch(`/v1/pcc/alerts/${id}/read`, {}); await loadAlerts()
  }

  const deleteAlert = async (id: string) => {
    await apiDelete(`/v1/pcc/alerts/${id}`); await loadAlerts()
  }

  const aiScoreColor = (score: number) => score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Platform Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">Master control room for all Reno AI modules · Health · Alerts · KPIs · Insights</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
          Auto-refresh (15s)
        </label>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* Overview */}
      {!loading && tab === 'Overview' && overview && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wide mb-1">Platform AI Score</p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-bold ${aiScoreColor(overview.metrics.aiScore)}`}>{overview.metrics.aiScore}</span>
                  <span className="text-2xl text-slate-400">/100</span>
                  <span className={`text-xl font-medium ${TREND_COLORS[overview.metrics.trend] ?? 'text-gray-400'}`}>
                    {TREND_ICONS[overview.metrics.trend] ?? '→'} {overview.metrics.trend}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-sm">Active Alerts</div>
                <div className={`text-3xl font-bold ${overview.activeAlertCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{overview.activeAlertCount}</div>
              </div>
            </div>
            <p className="text-slate-300 text-sm mt-4">{overview.summary}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Healthy Modules', value: overview.metrics.modules.healthyModules, of: overview.metrics.modules.totalModules, color: 'text-green-600' },
              { label: 'Agent Tasks', value: overview.metrics.ai.totalAgentTasks, color: 'text-blue-600' },
              { label: 'Tool Calls', value: overview.metrics.ai.totalToolCalls, color: 'text-purple-600' },
              { label: 'AI Cost', value: `$${overview.metrics.costSummary.totalAiCost.toFixed(3)}`, color: 'text-orange-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}{s.of !== undefined && <span className="text-gray-400 text-lg">/{s.of}</span>}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Module Health Grid */}
            <div className="bg-white rounded-xl border p-4 md:col-span-2">
              <h3 className="font-semibold text-gray-700 mb-3">Module Health</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {overview.healthChecks.map(h => {
                  const mod = overview.modules.find(m => m.id === h.module)
                  return (
                    <div key={h.module} className={`rounded-lg p-2 text-center text-xs border ${h.status === 'healthy' ? 'bg-green-50 border-green-200' : h.status === 'degraded' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-lg">{mod?.icon ?? '⚙️'}</div>
                      <div className="font-medium text-gray-700 leading-tight">{mod?.name ?? h.module}</div>
                      <div className={`text-xs mt-1 ${h.status === 'healthy' ? 'text-green-600' : h.status === 'degraded' ? 'text-yellow-700' : 'text-red-600'}`}>{h.responseMs}ms</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Insights */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Top Insights</h3>
              <div className="space-y-2">
                {overview.insights.slice(0, 4).map((ins, i) => (
                  <div key={i} className={`border rounded-lg p-2 text-xs ${INSIGHT_COLORS[ins.type] ?? 'bg-gray-50 border-gray-200'}`}>
                    <div className="font-medium">{INSIGHT_ICONS[ins.type] ?? '•'} {ins.title}</div>
                    <div className="text-gray-600 mt-0.5 leading-tight">{ins.description.substring(0, 80)}...</div>
                  </div>
                ))}
                {overview.insights.length === 0 && <p className="text-sm text-gray-400">No insights yet. Capture metrics first.</p>}
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          {overview.recentAlerts.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Recent Alerts</h3>
              <div className="space-y-2">
                {overview.recentAlerts.slice(0, 5).map(a => (
                  <div key={a.id} className={`flex items-start justify-between p-2 rounded-lg border ${a.isResolved ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${SEVERITY_COLORS[a.severity] ?? 'bg-gray-100 text-gray-600'}`}>{a.severity}</span>
                      <div><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-gray-400">{a.module} · {new Date(a.createdAt).toLocaleTimeString()}</div></div>
                    </div>
                    {!a.isResolved && <button onClick={() => resolveAlert(a.id)} className="text-xs text-green-600 hover:underline">Resolve</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Health */}
      {!loading && tab === 'Health' && health && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">{health.summary.healthy ?? 0} Healthy</span>
              <span className="text-yellow-600 font-medium">{health.summary.degraded ?? 0} Degraded</span>
              <span className="text-red-600 font-medium">{health.summary.down ?? 0} Down</span>
            </div>
            <button onClick={runHealthCheck} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">🔍 Run Checks</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {health.checks.map(h => (
              <div key={h.module} className={`bg-white rounded-xl border p-4 space-y-2 ${h.status === 'healthy' ? 'border-green-200' : h.status === 'degraded' ? 'border-yellow-300' : 'border-red-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold capitalize">{h.module.replace('_', ' ')}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${HEALTH_COLORS[h.status] ?? 'bg-gray-100 text-gray-600'}`}>{h.status}</span>
                </div>
                <div className="text-xs text-gray-500">Response: {h.responseMs}ms</div>
                {h.details.warning && <div className="text-xs text-yellow-600">⚠️ {h.details.warning as string}</div>}
                {h.details.error && <div className="text-xs text-red-600">❌ {h.details.error as string}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {!loading && tab === 'Alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {Object.entries(alerts.severityCounts).map(([sev, count]) => (
                <span key={sev} className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[sev] ?? 'bg-gray-100 text-gray-600'}`}>{sev}: {count}</span>
              ))}
            </div>
            <button onClick={generateAlerts} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">⚡ Generate Alerts</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Severity','Module','Title','Status','Time','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.alerts.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${a.isResolved ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${SEVERITY_COLORS[a.severity] ?? 'bg-gray-100 text-gray-600'}`}>{a.severity}</span></td>
                    <td className="px-4 py-3 text-gray-500">{a.module}</td>
                    <td className="px-4 py-3"><div className="font-medium">{a.title}</div><div className="text-xs text-gray-400">{a.message.substring(0, 60)}</div></td>
                    <td className="px-4 py-3">{a.isResolved ? <span className="text-green-600 text-xs">Resolved</span> : a.isRead ? <span className="text-gray-400 text-xs">Read</span> : <span className="text-blue-600 text-xs">New</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(a.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!a.isRead && <button onClick={() => markRead(a.id)} className="text-blue-600 hover:underline text-xs">Read</button>}
                        {!a.isResolved && <button onClick={() => resolveAlert(a.id)} className="text-green-600 hover:underline text-xs">Resolve</button>}
                        <button onClick={() => deleteAlert(a.id)} className="text-red-500 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {alerts.alerts.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No alerts. Click "Generate Alerts" to scan platform state.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metrics */}
      {!loading && tab === 'Metrics' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{snapshots.length} snapshots</p>
            <button onClick={captureMetrics} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">📊 Capture Now</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Period','AI Score','Trend','Agent Tasks','Tool Calls','AI Cost','Time'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {snapshots.map(s => {
                  const m = s.metrics as { ai?: { totalAgentTasks?: number; totalToolCalls?: number }; costSummary?: { totalAiCost?: number } }
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{s.period}</td>
                      <td className="px-4 py-3"><span className={aiScoreColor(s.aiScore)}>{s.aiScore}</span></td>
                      <td className="px-4 py-3"><span className={TREND_COLORS[s.trend] ?? 'text-gray-600'}>{TREND_ICONS[s.trend] ?? '→'} {s.trend}</span></td>
                      <td className="px-4 py-3">{m.ai?.totalAgentTasks ?? 0}</td>
                      <td className="px-4 py-3">{m.ai?.totalToolCalls ?? 0}</td>
                      <td className="px-4 py-3">${(m.costSummary?.totalAiCost ?? 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.capturedAt).toLocaleString()}</td>
                    </tr>
                  )
                })}
                {snapshots.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No metrics captured yet. Click "Capture Now".</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      {!loading && tab === 'Insights' && insights && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{insights.insights.length} insights from current platform state</p>
          <div className="grid md:grid-cols-2 gap-4">
            {insights.insights.map((ins, i) => (
              <div key={i} className={`border rounded-xl p-4 space-y-2 ${INSIGHT_COLORS[ins.type] ?? 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{INSIGHT_ICONS[ins.type] ?? '•'}</span>
                    <div><div className="font-semibold">{ins.title}</div><div className="text-xs text-gray-400">{ins.module} · {ins.impact} impact</div></div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ins.type === 'risk' ? 'bg-red-100 text-red-700' : ins.type === 'achievement' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ins.type}</span>
                </div>
                <p className="text-sm text-gray-700">{ins.description}</p>
                {ins.actionable && <span className="text-xs text-indigo-600">⚡ Actionable</span>}
              </div>
            ))}
            {insights.insights.length === 0 && (
              <div className="md:col-span-2 bg-white rounded-xl border p-8 text-center text-gray-400">
                <p className="text-2xl mb-2">🔍</p>
                <p>No insights yet. Use platform modules to generate data.</p>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Current Platform Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
              <div><div className={`text-2xl font-bold ${aiScoreColor(insights.metrics.aiScore)}`}>{insights.metrics.aiScore}</div><div className="text-xs text-gray-500">AI Score</div></div>
              <div><div className="text-2xl font-bold text-blue-600">{insights.metrics.ai.totalAgentTasks}</div><div className="text-xs text-gray-500">Agent Tasks</div></div>
              <div><div className="text-2xl font-bold text-purple-600">{insights.metrics.ai.totalToolCalls}</div><div className="text-xs text-gray-500">Tool Calls</div></div>
              <div><div className="text-2xl font-bold text-orange-600">${insights.metrics.costSummary.totalAiCost.toFixed(3)}</div><div className="text-xs text-gray-500">AI Cost</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Modules */}
      {!loading && tab === 'Modules' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{modules.length} registered modules across {[...new Set(modules.map(m => m.category))].length} categories</p>
          {[...new Set(modules.map(m => m.category))].map(cat => (
            <div key={cat} className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3 capitalize">{cat}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {modules.filter(m => m.category === cat).map(mod => (
                  <div key={mod.id} className="bg-gray-50 rounded-lg p-3 text-center hover:bg-indigo-50 transition-colors cursor-pointer">
                    <div className="text-2xl">{mod.icon}</div>
                    <div className="text-xs font-medium text-gray-700 mt-1">{mod.name}</div>
                    <div className="text-xs text-gray-400">{mod.id}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
