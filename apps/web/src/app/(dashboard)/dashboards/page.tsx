'use client'

import { useState, useEffect, useCallback } from 'react'

const API = (p: string) => `/api/proxy?path=${encodeURIComponent(p)}`

function Badge({ v, map }: { v: string; map?: Record<string, string> }) {
  const cls = map?.[v] ?? 'bg-gray-100 text-gray-700'
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{v}</span>
}

function Stat({ label, value, sub }: { label: string; value: string | number | null | undefined; sub?: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function KpiCard({ data }: { data: any }) {
  const trend = data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'
  const color = data.trend === 'up' ? 'text-green-600' : data.trend === 'down' ? 'text-red-500' : 'text-gray-500'
  const val = data.unit === 'USD' ? `$${Number(data.value).toLocaleString()}` : data.unit === 'score' ? `${data.value}/100` : String(data.value)
  return (
    <div className="h-full">
      <p className="text-xs text-gray-400 mb-1">{data.period ?? ''}</p>
      <p className="text-2xl font-bold text-gray-900">{val}</p>
      {data.change !== undefined && (
        <p className={`text-sm mt-1 ${color}`}>{trend} {Math.abs(data.change)}%</p>
      )}
    </div>
  )
}

function ChartBar({ data }: { data: any }) {
  const vals: number[] = data.datasets?.[0]?.data ?? []
  const max = Math.max(...vals, 1)
  return (
    <div className="h-full">
      <div className="flex items-end gap-1 h-16 mt-2">
        {vals.map((v: number, i: number) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-indigo-500 rounded-sm" style={{ height: `${(v / max) * 60}px` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {(data.labels ?? []).slice(0, 6).map((l: string, i: number) => (
          <span key={i} className="flex-1 text-center text-xs text-gray-400 truncate">{l}</span>
        ))}
      </div>
    </div>
  )
}

function AiCard({ data }: { data: any }) {
  if (data.items) {
    return (
      <ul className="space-y-1">
        {(data.items ?? []).slice(0, 3).map((item: any, i: number) => (
          <li key={i} className="text-xs">
            <span className={`font-semibold ${item.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`}>{item.severity?.toUpperCase()}</span>
            {' '}{item.title} <span className="text-gray-400">— {item.description}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p className="text-xs text-gray-600 leading-relaxed line-clamp-5">{data.summary}</p>
}

function TableCard({ data }: { data: any }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead><tr className="border-b">{(data.columns ?? []).map((c: string, i: number) => <th key={i} className="pb-1 text-left font-medium text-gray-500 pr-2">{c}</th>)}</tr></thead>
        <tbody>{(data.rows ?? []).slice(0, 3).map((row: string[], i: number) => <tr key={i} className="border-b last:border-0">{row.map((cell: string, j: number) => <td key={j} className="py-1 pr-2 text-gray-700">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function WidgetRenderer({ widget, data }: { widget: any; data: any }) {
  if (!data) return <div className="animate-pulse bg-gray-100 rounded h-12" />
  const { type, chartType } = data
  if (type === 'kpi' || type === 'gauge') return <KpiCard data={data} />
  if (type === 'chart' && (chartType === 'line' || chartType === 'bar' || chartType === 'area')) return <ChartBar data={data} />
  if (type === 'ai') return <AiCard data={data} />
  if (type === 'list') return <AiCard data={data} />
  if (type === 'table') return <TableCard data={data} />
  return <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
}

const CATEGORY_COLOR: Record<string, string> = {
  kpi: 'bg-indigo-100 text-indigo-700',
  chart: 'bg-purple-100 text-purple-700',
  ai: 'bg-emerald-100 text-emerald-700',
  table: 'bg-orange-100 text-orange-700',
}

export default function DashboardsPage() {
  const [tab, setTab] = useState('my-dashboards')
  const [dashboards, setDashboards] = useState<any>(null)
  const [registry, setRegistry] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [activeDash, setActiveDash] = useState<any>(null)
  const [activeDashWidgets, setActiveDashWidgets] = useState<any[]>([])
  const [widgetData, setWidgetData] = useState<Record<string, any>>({})
  const [versions, setVersions] = useState<any[]>([])
  const [shares, setShares] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [aiRecs, setAiRecs] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const get = useCallback(async (path: string) => {
    const r = await fetch(API(path))
    return r.json()
  }, [])

  const post = useCallback(async (path: string, body: unknown) => {
    const r = await fetch(API(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.json()
  }, [])

  const patch = useCallback(async (path: string, body: unknown) => {
    const r = await fetch(API(path), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.json()
  }, [])

  const del = useCallback(async (path: string) => {
    const r = await fetch(API(path), { method: 'DELETE' })
    return r.json()
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [d, r, t] = await Promise.all([
        get('/v1/dashboards'),
        get('/v1/dashboards/registry'),
        get('/v1/dashboards/templates'),
      ])
      setDashboards(d)
      setRegistry(r)
      setTemplates(t.templates ?? [])
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => { loadAll() }, [loadAll])

  const openDash = async (id: string) => {
    setLoading(true)
    const [d, w] = await Promise.all([
      get(`/v1/dashboards/${id}`),
      get(`/v1/dashboards/${id}/widgets`),
    ])
    setActiveDash(d)
    setActiveDashWidgets(w.widgets ?? [])
    await post(`/v1/dashboards/${id}/track-view`, {})
    // Fetch data for all widgets
    const data: Record<string, any> = {}
    await Promise.all((w.widgets ?? []).map(async (wid: any) => {
      const r = await get(`/v1/dashboards/${id}/data/${wid.id}`)
      data[wid.id] = r.data
    }))
    setWidgetData(data)
    setTab('builder')
    setLoading(false)
  }

  const createDash = async () => {
    const r = await post('/v1/dashboards', { name: 'My New Dashboard', description: 'Custom dashboard', theme: 'default' })
    setMsg(`Dashboard created: ${r.name}`)
    loadAll()
  }

  const createFromTemplate = async (tid: string, name: string) => {
    const r = await post(`/v1/dashboards/from-template/${tid}`, { name })
    setMsg(`Dashboard created from template: ${r.name}`)
    loadAll()
  }

  const addWidget = async (defKey: string) => {
    if (!activeDash) return
    const count = activeDashWidgets.length
    const r = await post(`/v1/dashboards/${activeDash.id}/widgets`, {
      definitionKey: defKey, x: (count % 3) * 4, y: Math.floor(count / 3) * 3, w: 4, h: 3,
    })
    setMsg(`Widget added: ${r.title}`)
    const w = await get(`/v1/dashboards/${activeDash.id}/widgets`)
    setActiveDashWidgets(w.widgets ?? [])
    // Fetch data for new widget
    const data = await get(`/v1/dashboards/${activeDash.id}/data/${r.id}`)
    setWidgetData(prev => ({ ...prev, [r.id]: data.data }))
  }

  const removeWidget = async (wid: string) => {
    if (!activeDash) return
    await del(`/v1/dashboards/${activeDash.id}/widgets/${wid}`)
    setActiveDashWidgets(prev => prev.filter(w => w.id !== wid))
    setMsg('Widget removed')
  }

  const saveVersion = async () => {
    if (!activeDash) return
    const r = await post(`/v1/dashboards/${activeDash.id}/versions`, { label: `Snapshot ${new Date().toLocaleTimeString()}` })
    setMsg(`Version saved: ${r.label}`)
    const v = await get(`/v1/dashboards/${activeDash.id}/versions`)
    setVersions(v.versions ?? [])
  }

  const loadVersions = async () => {
    if (!activeDash) return
    const v = await get(`/v1/dashboards/${activeDash.id}/versions`)
    setVersions(v.versions ?? [])
  }

  const loadShares = async () => {
    if (!activeDash) return
    const s = await get(`/v1/dashboards/${activeDash.id}/shares`)
    setShares(s.shares ?? [])
  }

  const shareDash = async () => {
    if (!activeDash) return
    const r = await post(`/v1/dashboards/${activeDash.id}/shares`, { sharedWithRole: 'admin', canEdit: false })
    setMsg(`Shared with role: ${r.sharedWithRole}`)
    loadShares()
  }

  const loadMetrics = async () => {
    if (!activeDash) return
    const m = await get(`/v1/dashboards/${activeDash.id}/metrics`)
    setMetrics(m)
  }

  const getAiRecs = async () => {
    if (!activeDash) return
    setMsg('Generating AI recommendations...')
    const r = await post(`/v1/dashboards/${activeDash.id}/ai-recommend`, {})
    setAiRecs(r.recommendations ?? [])
    setMsg(`${r.count} AI recommendations generated`)
  }

  const tabs = ['my-dashboards', 'builder', 'widget-gallery', 'templates', 'sharing', 'analytics']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Dashboards</h1>
          <p className="text-sm text-gray-500 mt-1">Phase 68 — Build, customize and share role-based dashboards with AI-powered widgets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={createDash} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Dashboard</button>
          <button onClick={loadAll} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      {msg && <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{msg}</div>}

      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'my-dashboards' ? 'My Dashboards' : t === 'widget-gallery' ? 'Widget Gallery' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* My Dashboards */}
      {tab === 'my-dashboards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="My Dashboards" value={dashboards?.mine?.length ?? 0} />
            <Stat label="Shared With Me" value={dashboards?.shared?.length ?? 0} />
            <Stat label="Total Widgets" value={(dashboards?.mine ?? []).reduce((s: number, d: any) => s + (d._count?.widgets ?? 0), 0)} sub="across all dashboards" />
          </div>
          <h3 className="font-semibold text-gray-900">My Dashboards</h3>
          <div className="grid grid-cols-2 gap-4">
            {(dashboards?.mine ?? []).map((d: any) => (
              <div key={d.id} className="bg-white border rounded-xl p-4 hover:shadow-sm cursor-pointer" onClick={() => openDash(d.id)}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{d.icon ?? '📊'}</span>
                  <div>
                    <h3 className="font-semibold">{d.name}</h3>
                    <p className="text-xs text-gray-400">{d.description ?? 'No description'}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{d._count?.widgets ?? 0} widgets</span>
                  <span>{d.metrics?.viewCount ?? 0} views</span>
                  <span className="capitalize">{d.theme}</span>
                </div>
              </div>
            ))}
            {(dashboards?.mine ?? []).length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <p className="text-lg mb-2">No dashboards yet</p>
                <p className="text-sm">Click "+ New Dashboard" or start from a template</p>
              </div>
            )}
          </div>
          {(dashboards?.shared ?? []).length > 0 && (
            <>
              <h3 className="font-semibold text-gray-900 mt-6">Shared With Me</h3>
              <div className="grid grid-cols-2 gap-4">
                {(dashboards.shared ?? []).map((d: any) => (
                  <div key={d.id} className="bg-white border border-dashed rounded-xl p-4 cursor-pointer hover:shadow-sm" onClick={() => openDash(d.id)}>
                    <h3 className="font-semibold">{d.name}</h3>
                    <p className="text-xs text-gray-400">{d._count?.widgets ?? 0} widgets</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Builder */}
      {tab === 'builder' && (
        <div className="space-y-4">
          {!activeDash ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg mb-2">No dashboard open</p>
              <p className="text-sm">Select a dashboard from "My Dashboards" or create a new one</p>
              <button onClick={createDash} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Create Dashboard</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">{activeDash.name}</h2>
                  <p className="text-sm text-gray-400">{activeDashWidgets.length} widgets • 12-col grid</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveVersion} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Save Version</button>
                  <button onClick={getAiRecs} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">AI Recommend</button>
                </div>
              </div>

              {aiRecs.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-800 mb-2">AI Recommendations ({aiRecs.length})</h4>
                  <div className="space-y-2">
                    {aiRecs.map((r: any) => (
                      <div key={r.id} className="bg-white rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge v={r.type} map={{ widget: 'bg-indigo-100 text-indigo-700', layout: 'bg-purple-100 text-purple-700', insight: 'bg-emerald-100 text-emerald-700' }} />
                          <span className="font-medium text-sm">{r.title}</span>
                          <span className="text-xs text-gray-400 ml-auto">{(r.confidence * 100).toFixed(0)}% confidence</span>
                        </div>
                        <p className="text-xs text-gray-600">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Widget canvas */}
              <div className="grid grid-cols-3 gap-4 min-h-48">
                {activeDashWidgets.map((w: any) => (
                  <div key={w.id} className="bg-white border rounded-lg p-4 hover:shadow-sm relative group">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-gray-700">{w.title}</h4>
                      <button onClick={() => removeWidget(w.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity">✕</button>
                    </div>
                    <div className="min-h-16">
                      <WidgetRenderer widget={w} data={widgetData[w.id]} />
                    </div>
                    <p className="text-xs text-gray-300 mt-2 font-mono">{w.definitionKey}</p>
                  </div>
                ))}
                {activeDashWidgets.length === 0 && (
                  <div className="col-span-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center py-16 text-gray-400">
                    <div className="text-center">
                      <p className="mb-2">Empty dashboard</p>
                      <p className="text-sm">Go to "Widget Gallery" to add widgets</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Widget Gallery */}
      {tab === 'widget-gallery' && (
        <div className="space-y-4">
          {!activeDash && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">Open a dashboard in the Builder tab first to add widgets.</div>}
          {Object.entries(registry?.byCategory ?? {}).map(([cat, defs]: [string, any]) => (
            <div key={cat}>
              <h3 className="font-semibold text-gray-700 capitalize mb-3 flex items-center gap-2">
                <Badge v={cat} map={CATEGORY_COLOR} />
                <span>{(defs as any[]).length} widgets</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(defs as any[]).map((d: any) => (
                  <div key={d.key} className="bg-white border rounded-lg p-4 hover:shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{d.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{d.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge v={d.chartType} map={{ number: 'bg-blue-50 text-blue-600', line: 'bg-purple-50 text-purple-600', bar: 'bg-orange-50 text-orange-600', pie: 'bg-pink-50 text-pink-600', gauge: 'bg-green-50 text-green-600', text: 'bg-gray-100 text-gray-600', list: 'bg-yellow-50 text-yellow-700', table: 'bg-indigo-50 text-indigo-600', area: 'bg-teal-50 text-teal-600' }} />
                      {activeDash && (
                        <button onClick={() => addWidget(d.key)} className="ml-auto text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">+ Add</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Pre-built dashboards for each department. One-click to create a fully configured dashboard.</p>
          <div className="grid grid-cols-2 gap-4">
            {templates.map((t: any) => (
              <div key={t.id} className="bg-white border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{t.icon ?? '📊'}</span>
                  <div>
                    <h3 className="font-bold">{t.name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{t.department}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">{t.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{(t.widgets ?? []).length} widgets pre-configured</span>
                  <button onClick={() => createFromTemplate(t.id, t.name)} className="ml-auto px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Use Template</button>
                </div>
              </div>
            ))}
            {templates.length === 0 && <p className="col-span-2 text-center text-gray-400 py-8">No templates loaded yet</p>}
          </div>
        </div>
      )}

      {/* Sharing */}
      {tab === 'sharing' && (
        <div className="space-y-4">
          {!activeDash ? (
            <p className="text-center text-gray-400 py-8">Open a dashboard in the Builder tab to manage sharing</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Sharing: <span className="text-indigo-600">{activeDash.name}</span></h3>
                <div className="flex gap-2">
                  <button onClick={loadShares} className="px-3 py-1.5 border rounded text-sm">Load Shares</button>
                  <button onClick={shareDash} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">Share with Admin Role</button>
                </div>
              </div>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Shared With', 'Type', 'Permission', 'Created'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {shares.map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{s.sharedWithUserId ?? s.sharedWithRole ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{s.sharedWithRole ? 'Role' : 'User'}</td>
                        <td className="px-4 py-3"><Badge v={s.canEdit ? 'edit' : 'view'} map={{ edit: 'bg-yellow-100 text-yellow-700', view: 'bg-gray-100 text-gray-600' }} /></td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {shares.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No shares yet — click "Share with Admin Role" to test</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {!activeDash ? (
            <p className="text-center text-gray-400 py-8">Open a dashboard in the Builder tab to view analytics</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Analytics: <span className="text-indigo-600">{activeDash.name}</span></h3>
                <div className="flex gap-2">
                  <button onClick={loadMetrics} className="px-3 py-1.5 border rounded text-sm">Load Metrics</button>
                  <button onClick={loadVersions} className="px-3 py-1.5 border rounded text-sm">Load Versions</button>
                </div>
              </div>
              {metrics && (
                <div className="grid grid-cols-4 gap-4">
                  <Stat label="Total Views" value={metrics.viewCount} />
                  <Stat label="Unique Viewers" value={metrics.viewerCount} />
                  <Stat label="Avg Load Time" value={`${Math.round(metrics.avgLoadMs)}ms`} />
                  <Stat label="Widgets" value={metrics.widgetCount} />
                </div>
              )}
              <h4 className="font-semibold mt-4">Version History</h4>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Version', 'Label', 'Created'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {versions.map((v: any) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">v{v.version}</td>
                        <td className="px-4 py-3">{v.label}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(v.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {versions.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No versions saved — use "Save Version" in the Builder</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
