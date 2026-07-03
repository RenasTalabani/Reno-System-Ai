'use client'
import { useState, useEffect, useCallback } from 'react'
import { Globe, Plus, Trash2, RefreshCw, Key, Activity } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as any }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as any, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as any }).then(r => r.json())
  return { get, post, remove }
}

const TABS = ['APIs', 'Routes', 'Consumers', 'Logs', 'Stats']

export default function ApiGatewayPage() {
  const api = useApi()
  const [tab, setTab] = useState('APIs')
  const [apis, setApis] = useState<any[]>([])
  const [selectedApi, setSelectedApi] = useState<any>(null)
  const [routes, setRoutes] = useState<any[]>([])
  const [consumers, setConsumers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [registry, setRegistry] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [apiForm, setApiForm] = useState({ name: '', basePath: '/api/v1', upstreamUrl: 'https://api.example.com', version: 'v1', authType: 'api_key', rateLimit: 1000 })
  const [routeForm, setRouteForm] = useState({ method: 'GET', path: '/users' })
  const [consumerForm, setConsumerForm] = useState({ name: '', quota: 10000 })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'APIs') { const data = await api.get('/api-gateway/apis'); setApis(data.apis ?? []) }
      if (tab === 'Routes' && selectedApi) { const data = await api.get('/api-gateway/apis/' + selectedApi.id + '/routes'); setRoutes(data.routes ?? []) }
      if (tab === 'Consumers' && selectedApi) { const data = await api.get('/api-gateway/apis/' + selectedApi.id + '/consumers'); setConsumers(data.consumers ?? []) }
      if (tab === 'Logs') { const data = await api.get('/api-gateway/logs?limit=50'); setLogs(data.logs ?? []) }
      if (tab === 'Stats') { const data = await api.get('/api-gateway/stats'); setStats(data) }
    } finally { setLoading(false) }
  }, [tab, selectedApi])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/api-gateway/registry').then((data: any) => setRegistry(data)) }, [])

  async function createApi() {
    const res = await api.post('/api-gateway/apis', apiForm)
    if (res.id) { notify('API registered'); setShowCreate(false); setSelectedApi(res); load() }
    else notify(res.message ?? 'Error')
  }

  async function addRoute() {
    if (!selectedApi) return
    const res = await api.post('/api-gateway/apis/' + selectedApi.id + '/routes', routeForm)
    if (res.id) { notify('Route added'); load() } else notify(res.message ?? 'Error')
  }

  async function createConsumer() {
    if (!selectedApi) return
    const res = await api.post('/api-gateway/apis/' + selectedApi.id + '/consumers', consumerForm)
    if (res.id) { notify('Consumer created'); load() } else notify(res.message ?? 'Error')
  }

  async function issueKey(consumerId: string) {
    const res = await api.post('/api-gateway/consumers/' + consumerId + '/keys', { name: 'API Key', scopes: ['read', 'write'] })
    if (res.rawKey) { setNewKey(res.rawKey); notify('Key generated') } else notify(res.message ?? 'Error')
  }

  async function simulateRequest() {
    if (!selectedApi) return
    await api.post('/api-gateway/apis/' + selectedApi.id + '/simulate', { method: 'GET', path: '/test', statusCode: 200 })
    notify('Request simulated')
  }

  async function deleteApi(apiId: string) {
    if (!confirm('Delete?')) return
    await api.remove('/api-gateway/apis/' + apiId)
    notify('Deleted'); if (selectedApi?.id === apiId) setSelectedApi(null); load()
  }

  async function deleteRoute(routeId: string) {
    await api.remove('/api-gateway/apis/' + (selectedApi?.id ?? '') + '/routes/' + routeId)
    notify('Route deleted'); load()
  }

  async function deleteConsumer(consumerId: string) {
    await api.remove('/api-gateway/consumers/' + consumerId)
    notify('Consumer deleted'); load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Gateway</h1>
            <p className="text-sm text-gray-500">Register APIs, manage routes, consumers, and keys</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      {newKey && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-800">New API Key — copy now, it won't be shown again:</p>
          <code className="text-xs bg-yellow-100 px-3 py-2 rounded-lg block break-all">{newKey}</code>
          <button onClick={() => setNewKey(null)} className="text-xs text-yellow-600">Dismiss</button>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selectedApi && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-teal-800">Selected: <strong>{selectedApi.name}</strong></span>
          <button onClick={simulateRequest} className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg">Simulate Request</button>
        </div>
      )}

      {tab === 'APIs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">APIs ({apis.length})</h2>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Register API
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Name" value={apiForm.name} onChange={e => setApiForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                <input placeholder="Base path" value={apiForm.basePath} onChange={e => setApiForm(f => ({...f, basePath: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Upstream URL" value={apiForm.upstreamUrl} onChange={e => setApiForm(f => ({...f, upstreamUrl: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={apiForm.authType} onChange={e => setApiForm(f => ({...f, authType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {(registry?.authTypes ?? ['api_key', 'jwt', 'none']).map((t: string) => <option key={t}>{t}</option>)}
                </select>
                <input type="number" value={apiForm.rateLimit} onChange={e => setApiForm(f => ({...f, rateLimit: +e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={createApi} disabled={!apiForm.name} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm disabled:opacity-50">Register</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {apis.map((a: any) => (
              <div key={a.id} onClick={() => setSelectedApi(a)}
                className={`bg-white border rounded-xl p-4 cursor-pointer ${selectedApi?.id === a.id ? 'border-teal-400 bg-teal-50' : 'hover:border-teal-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.name}</span>
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{a.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{a.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{a.basePath} -&gt; {a.upstreamUrl}</p>
                    <p className="text-xs text-gray-400">{a._count?.routes ?? 0} routes / {a._count?.consumers ?? 0} consumers / {a.rateLimit}/{a.ratePeriod}</p>
                  </div>
                  <button onClick={ev => { ev.stopPropagation(); deleteApi(a.id) }} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {apis.length === 0 && !loading && <div className="text-center py-12 text-gray-400">No APIs registered</div>}
          </div>
        </div>
      )}

      {tab === 'Routes' && (
        <div className="space-y-4">
          {!selectedApi ? <div className="text-center py-12 text-gray-400">Select an API first</div> : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Routes — {selectedApi.name}</h2>
              <div className="bg-white border rounded-xl p-4 flex gap-3">
                <select value={routeForm.method} onChange={e => setRouteForm(f => ({...f, method: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-28">
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', '*'].map(m => <option key={m}>{m}</option>)}
                </select>
                <input placeholder="Path" value={routeForm.path} onChange={e => setRouteForm(f => ({...f, path: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm flex-1" />
                <button onClick={addRoute} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">Add Route</button>
              </div>
              <div className="grid gap-2">
                {routes.map((r: any) => (
                  <div key={r.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${r.method === 'GET' ? 'bg-green-100 text-green-700' : r.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{r.method}</span>
                      <code className="text-sm">{r.path}</code>
                    </div>
                    <button onClick={() => deleteRoute(r.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {routes.length === 0 && <div className="text-center py-8 text-gray-400">No routes</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Consumers' && (
        <div className="space-y-4">
          {!selectedApi ? <div className="text-center py-12 text-gray-400">Select an API first</div> : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Consumers — {selectedApi.name}</h2>
              <div className="bg-white border rounded-xl p-4 flex gap-3">
                <input placeholder="Name" value={consumerForm.name} onChange={e => setConsumerForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm flex-1" />
                <input type="number" value={consumerForm.quota} onChange={e => setConsumerForm(f => ({...f, quota: +e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-28" />
                <button onClick={createConsumer} disabled={!consumerForm.name} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm disabled:opacity-50">Add</button>
              </div>
              <div className="grid gap-3">
                {consumers.map((c: any) => (
                  <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.usageCount}/{c.quota} {c.quotaPeriod}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => issueKey(c.id)} className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg"><Key className="w-3 h-3" /> Issue Key</button>
                      <button onClick={() => deleteConsumer(c.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {consumers.length === 0 && <div className="text-center py-8 text-gray-400">No consumers</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Logs' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5" /> Request Logs</h2>
          <div className="overflow-x-auto bg-white border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Method', 'Path', 'Status', 'Duration', 'Time'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {logs.map((l: any) => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-bold text-green-600">{l.method}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.path}</td>
                    <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${l.statusCode < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.statusCode}</span></td>
                    <td className="px-3 py-2 text-xs">{l.durationMs}ms</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{new Date(l.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No logs</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Gateway Statistics</h2>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {[['APIs', stats.apis], ['Routes', stats.routes], ['Consumers', stats.consumers], ['Keys', stats.keys], ['Requests', stats.logs], ['Policies', stats.policies]].map(([label, value]) => (
              <div key={String(label)} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-xl font-bold">{value}</p><p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
