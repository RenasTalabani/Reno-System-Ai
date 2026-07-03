'use client'
import { useState, useEffect, useCallback } from 'react'
import { Braces, Plus, Trash2, RefreshCw, Key, FileText, Activity } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as HeadersInit }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as HeadersInit }).then(r => r.json())
  const patch = (url: string, body: unknown) => fetch(API + url, { method: 'PATCH', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  return { get, post, remove, patch }
}

const TABS = ['Clients', 'Keys & Usage', 'Docs', 'Status', 'Stats']

export default function PublicApiPage() {
  const api = useApi()
  const [tab, setTab] = useState('Clients')
  const [clients, setClients] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [keys, setKeys] = useState<any[]>([])
  const [usage, setUsage] = useState<any>(null)
  const [quotas, setQuotas] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [status, setStatus] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  const load = useCallback(async () => {
    if (tab === 'Clients') { const d = await api.get('/public-api/clients'); setClients(d.clients ?? []) }
    if (tab === 'Keys & Usage' && selected) {
      const k = await api.get('/public-api/clients/' + selected.id + '/keys'); setKeys(k.keys ?? [])
      const u = await api.get('/public-api/clients/' + selected.id + '/usage'); setUsage(u)
      const q = await api.get('/public-api/clients/' + selected.id + '/quotas'); setQuotas(q.quotas ?? [])
    }
    if (tab === 'Docs') { const d = await api.get('/public-api/docs'); setDocs(d.pages ?? []) }
    if (tab === 'Status') { const d = await api.get('/public-api/status'); setStatus(d) }
    if (tab === 'Stats') { const d = await api.get('/public-api/stats'); setStats(d) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  const tierColor = (t: string) => {
    const m: Record<string, string> = { free: 'bg-gray-100 text-gray-600', starter: 'bg-blue-100 text-blue-700', pro: 'bg-purple-100 text-purple-700', enterprise: 'bg-amber-100 text-amber-700' }
    return m[t] ?? 'bg-gray-100'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-100 rounded-xl flex items-center justify-center">
            <Braces className="w-5 h-5 text-lime-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Public API Portal</h1>
            <p className="text-sm text-gray-500">API clients, keys, quotas, docs, and status page</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-lime-50 border border-lime-200 text-lime-800 rounded-lg px-4 py-3 text-sm font-mono break-all">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-lime-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-lime-50 border border-lime-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.name} <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor(selected.tier)}`}>{selected.tier}</span></span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-lime-600">Clear</button>
        </div>
      )}

      {tab === 'Clients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">API Clients ({clients.length})</h2>
            <button type="button" onClick={() => api.post('/public-api/clients', { name: 'Client ' + Date.now(), clientType: 'server', tier: 'starter', contactEmail: 'dev@example.com' }).then(() => { notify('Client registered with default quota'); load() })} className="flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Register Client</button>
          </div>
          <div className="grid gap-2">
            {clients.map((c: any) => (
              <div key={c.id} onClick={() => setSelected(c)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === c.id ? 'border-lime-400 bg-lime-50' : 'hover:border-lime-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor(c.tier)}`}>{c.tier}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.clientType}</span>
                    </div>
                    <p className="text-xs text-gray-400">{c._count?.keys ?? 0} keys · {c._count?.usageRecords ?? 0} requests</p>
                  </div>
                  <div className="flex gap-1">
                    {c.status === 'active'
                      ? <button type="button" onClick={e => { e.stopPropagation(); api.post('/public-api/clients/' + c.id + '/suspend', {}).then(() => { notify('Suspended'); load() }) }} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Suspend</button>
                      : <button type="button" onClick={e => { e.stopPropagation(); api.post('/public-api/clients/' + c.id + '/reactivate', {}).then(() => { notify('Reactivated'); load() }) }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Reactivate</button>}
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/public-api/clients/' + c.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {clients.length === 0 && <div className="text-center py-12 text-gray-400">No API clients</div>}
          </div>
        </div>
      )}

      {tab === 'Keys & Usage' && (
        <div className="space-y-6">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a client first</div> : (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Key className="w-5 h-5" /> API Keys ({keys.length})</h2>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => api.post('/public-api/clients/' + selected.id + '/keys', { label: 'key-' + Date.now(), scopes: ['read'] }).then((r: any) => { notify('KEY (shown once): ' + r.apiKey); load() })} className="px-3 py-2 bg-lime-600 text-white rounded-lg text-sm">Issue Key</button>
                    <button type="button" onClick={() => api.post('/public-api/clients/' + selected.id + '/simulate-traffic', { count: 20 }).then((r: any) => { notify('Simulated ' + r.created + ' requests'); load() })} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Simulate Traffic</button>
                  </div>
                </div>
                {keys.map((k: any) => (
                  <div key={k.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{k.keyPrefix}…</span>
                        <span className="text-xs text-gray-500">{k.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${k.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{k.isActive ? 'active' : 'revoked'}</span>
                      </div>
                      <p className="text-xs text-gray-400">{k.lastUsedAt ? 'Last used ' + new Date(k.lastUsedAt).toLocaleString() : 'Never used'}</p>
                    </div>
                    <div className="flex gap-1">
                      {k.isActive && <button type="button" onClick={() => api.post('/public-api/keys/' + k.id + '/revoke', {}).then(() => { notify('Revoked'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Revoke</button>}
                      <button type="button" onClick={() => api.remove('/public-api/keys/' + k.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {usage && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border rounded-xl p-4 text-center"><p className="text-xl font-bold">{usage.total}</p><p className="text-xs text-gray-500">Requests (recent)</p></div>
                  <div className="bg-white border rounded-xl p-4 text-center"><p className="text-xl font-bold">{(usage.errorRate * 100).toFixed(1)}%</p><p className="text-xs text-gray-500">Error rate</p></div>
                  <div className="bg-white border rounded-xl p-4 text-center"><p className="text-xl font-bold">{usage.avgLatencyMs}ms</p><p className="text-xs text-gray-500">Avg latency</p></div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold">Quotas</h3>
                {quotas.map((q: any) => (
                  <div key={q.id} className="bg-white border rounded-xl p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>{q.quotaType}</span>
                      <span>{q.usedValue.toLocaleString()} / {q.limitValue.toLocaleString()} ({q.pctUsed}%)</span>
                    </div>
                    <div className="mt-2 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${q.pctUsed > 90 ? 'bg-red-500' : q.pctUsed > 70 ? 'bg-yellow-500' : 'bg-lime-500'}`} style={{ width: Math.min(100, q.pctUsed) + '%' }} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => api.post('/public-api/clients/' + selected.id + '/quotas/reset', {}).then(() => { notify('Quotas reset'); load() })} className="text-xs bg-gray-100 px-3 py-2 rounded-lg">Reset Quotas</button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Docs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5" /> Documentation ({docs.length})</h2>
            <button type="button" onClick={() => api.post('/public-api/docs', { title: 'Guide ' + Date.now(), slug: 'guide-' + Date.now(), content: '# Getting Started\n\nWelcome to the Reno API.', category: 'getting-started' }).then(() => { notify('Doc created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Page</button>
          </div>
          <div className="grid gap-2">
            {docs.map((d: any) => (
              <div key={d.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{d.title}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{d.isPublished ? 'published' : 'draft'}</span>
                </div>
                <div className="flex gap-1">
                  {!d.isPublished && <button type="button" onClick={() => api.post('/public-api/docs/' + d.id + '/publish', {}).then(() => { notify('Published'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish</button>}
                  <button type="button" onClick={() => api.remove('/public-api/docs/' + d.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {docs.length === 0 && <div className="text-center py-8 text-gray-400">No doc pages</div>}
          </div>
        </div>
      )}

      {tab === 'Status' && status && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-6 text-center border ${status.overall === 'operational' ? 'bg-green-50 border-green-300' : status.overall === 'degraded' ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'}`}>
            <Activity className="w-8 h-8 mx-auto mb-2" />
            <p className="text-2xl font-bold uppercase">{status.overall}</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => api.post('/public-api/status/incidents', { title: 'Elevated latency on /v1/reports', severity: 'minor', affectedApis: ['/v1/reports'] }).then(() => { notify('Incident opened'); load() })} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm">Open Test Incident</button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Open Incidents ({status.openIncidents?.length ?? 0})</h3>
            {(status.openIncidents ?? []).map((i: any) => (
              <div key={i.id} className="bg-white border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{i.title}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{i.severity}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{i.status}</span>
                    </div>
                    <p className="text-xs text-gray-400">Since {new Date(i.startedAt).toLocaleString()} · {(i.updates ?? []).length} updates</p>
                  </div>
                  <button type="button" onClick={() => api.post('/public-api/status/incidents/' + i.id + '/update', { status: 'resolved', note: 'Issue resolved' }).then(() => { notify('Resolved'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolve</button>
                </div>
              </div>
            ))}
            {(status.openIncidents ?? []).length === 0 && <p className="text-sm text-gray-400">All systems operational</p>}
          </div>
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Public API Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Clients', stats.clients], ['Keys', stats.keys], ['Requests', stats.usageRecords], ['Quotas', stats.quotas], ['Doc Pages', stats.docPages], ['Incidents', stats.incidents]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
