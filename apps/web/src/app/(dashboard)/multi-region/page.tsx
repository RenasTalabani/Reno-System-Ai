'use client'
import { useState, useEffect, useCallback } from 'react'
import { Globe, Plus, Trash2, RefreshCw, Activity, Network, AlertTriangle } from 'lucide-react'

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

const TABS = ['Regions', 'Endpoints', 'Routing', 'Failover', 'Stats']

export default function MultiRegionPage() {
  const api = useApi()
  const [tab, setTab] = useState('Regions')
  const [regions, setRegions] = useState<any[]>([])
  const [selectedRegion, setSelectedRegion] = useState<any>(null)
  const [endpoints, setEndpoints] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [failoverEvents, setFailoverEvents] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', provider: 'aws', isPrimary: false, capacity: 100 })
  const [policyForm, setPolicyForm] = useState({ name: '', policyType: 'latency' })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Regions') {
      const d = await api.get('/multi-region/regions')
      setRegions(d.regions ?? [])
      const h = await api.get('/multi-region/health')
      setHealth(h)
    }
    if (tab === 'Endpoints' && selectedRegion) {
      const d = await api.get('/multi-region/regions/' + selectedRegion.id + '/endpoints')
      setEndpoints(d.endpoints ?? [])
    }
    if (tab === 'Routing') {
      const d = await api.get('/multi-region/routing-policies')
      setPolicies(d.policies ?? [])
    }
    if (tab === 'Failover') {
      const d = await api.get('/multi-region/failover-events')
      setFailoverEvents(d.events ?? [])
    }
    if (tab === 'Stats') {
      const d = await api.get('/multi-region/stats')
      setStats(d)
    }
  }, [tab, selectedRegion])

  useEffect(() => { load() }, [load])

  async function createRegion() {
    const res = await api.post('/multi-region/regions', form)
    if (res.id) { notify('Region created'); setShowCreate(false); load() }
    else notify(res.error ?? 'Error')
  }

  async function setPrimary(rid: string) {
    await api.post('/multi-region/regions/' + rid + '/set-primary', {})
    notify('Primary region set'); load()
  }

  async function runHealthCheck(rid: string) {
    const res = await api.post('/multi-region/regions/' + rid + '/health-check', {})
    notify('Health check: ' + res.status + ' (' + res.latencyMs + 'ms)'); load()
  }

  async function checkAll() {
    const res = await api.post('/multi-region/health-check-all', {})
    notify('Checked ' + res.results?.length + ' regions'); load()
  }

  async function simulateFailover(rid: string) {
    const other = regions.find(r => r.id !== rid)
    const res = await api.post('/multi-region/regions/' + rid + '/failover', { fromRegion: regions.find(r => r.id === rid)?.code, toRegion: other?.code, reason: 'manual-test' })
    if (res.id) { notify('Failover simulated: ' + res.fromRegion + ' → ' + res.toRegion); load() }
    else notify(res.error ?? 'Error')
  }

  async function createPolicy() {
    const res = await api.post('/multi-region/routing-policies', policyForm)
    if (res.id) { notify('Policy created'); setShowPolicy(false); load() }
    else notify(res.error ?? 'Error')
  }

  const statusColor = (s: string) => {
    const m: Record<string, string> = { active: 'bg-green-100 text-green-700', degraded: 'bg-yellow-100 text-yellow-700', inactive: 'bg-red-100 text-red-700', maintenance: 'bg-blue-100 text-blue-700', healthy: 'bg-green-100 text-green-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Multi-Region</h1>
            <p className="text-sm text-gray-500">Regions, endpoints, routing policies, and failover management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={checkAll} className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Activity className="w-4 h-4" /> Check All
          </button>
          <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {msg && <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      {health && (
        <div className="grid grid-cols-4 gap-4">
          {([['Total Regions', health.totalRegions, 'bg-gray-50'], ['Healthy', health.healthy, 'bg-green-50'], ['Degraded', health.degraded, 'bg-yellow-50'], ['Inactive', health.inactive, 'bg-red-50']] as [string, number, string][]).map(([l, v, bg]) => (
            <div key={l} className={`${bg} border rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold">{v}</p><p className="text-xs text-gray-500 mt-1">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Regions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Regions ({regions.length})</h2>
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Add Region
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Region name (e.g. US East)" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Code (e.g. us-east-1)" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={form.provider} onChange={e => setForm(f => ({...f, provider: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['aws', 'gcp', 'azure', 'cloudflare', 'on-premise'].map(p => <option key={p}>{p}</option>)}
                </select>
                <input type="number" placeholder="Capacity %" value={form.capacity} onChange={e => setForm(f => ({...f, capacity: parseInt(e.target.value) || 100}))} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({...f, isPrimary: e.target.checked}))} /> Set as primary region
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={createRegion} disabled={!form.name || !form.code} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {regions.map((rg: any) => (
              <div key={rg.id} onClick={() => setSelectedRegion(rg)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selectedRegion?.id === rg.id ? 'border-purple-400 bg-purple-50' : 'hover:border-purple-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{rg.name}</span>
                      {rg.isPrimary && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Primary</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(rg.status)}`}>{rg.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{rg.provider}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{rg.code}</span>
                      {rg.latencyMs != null && <span>{rg.latencyMs}ms</span>}
                      <span>capacity: {rg.capacity}%</span>
                      <span>{rg._count?.endpoints ?? 0} endpoints</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); runHealthCheck(rg.id) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Check</button>
                    {!rg.isPrimary && <button type="button" onClick={e => { e.stopPropagation(); setPrimary(rg.id) }} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Set Primary</button>}
                    {regions.length > 1 && <button type="button" onClick={e => { e.stopPropagation(); simulateFailover(rg.id) }} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded"><AlertTriangle className="w-3 h-3 inline" /> Failover</button>}
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/multi-region/regions/' + rg.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {regions.length === 0 && <div className="text-center py-12 text-gray-400">No regions yet</div>}
          </div>
        </div>
      )}

      {tab === 'Endpoints' && (
        <div className="space-y-4">
          {!selectedRegion ? <div className="text-center py-12 text-gray-400">Select a region first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Network className="w-5 h-5" /> Endpoints for {selectedRegion.name}</h2>
                <button type="button" onClick={() => api.post('/multi-region/regions/' + selectedRegion.id + '/endpoints', { name: 'endpoint-' + Date.now(), url: 'https://' + selectedRegion.code + '.api.example.com', endpointType: 'api', weight: 100 }).then(() => { notify('Endpoint added'); load() })} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add</button>
              </div>
              <div className="grid gap-2">
                {endpoints.map((ep: any) => (
                  <div key={ep.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{ep.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(ep.status)}`}>{ep.status}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ep.endpointType}</span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">{ep.url}</p>
                      <p className="text-xs text-gray-400">weight: {ep.weight} {ep.latencyMs != null && `· ${ep.latencyMs}ms`}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.get('/multi-region/regions/' + selectedRegion.id + '/endpoints/' + ep.id + '/health').then((r: any) => { notify(ep.name + ': ' + r.status + ' ' + r.latencyMs + 'ms'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Check</button>
                      <button type="button" onClick={() => api.remove('/multi-region/regions/' + selectedRegion.id + '/endpoints/' + ep.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {endpoints.length === 0 && <div className="text-center py-8 text-gray-400">No endpoints</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Routing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Routing Policies ({policies.length})</h2>
            <button type="button" onClick={() => setShowPolicy(!showPolicy)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Policy</button>
          </div>
          {showPolicy && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <input placeholder="Policy name" value={policyForm.name} onChange={e => setPolicyForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <select value={policyForm.policyType} onChange={e => setPolicyForm(f => ({...f, policyType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full">
                {['latency', 'geo', 'weighted', 'failover', 'round-robin'].map(t => <option key={t}>{t}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={createPolicy} disabled={!policyForm.name} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowPolicy(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            {policies.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p.policyType}</span>
                    {p.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.patch('/multi-region/routing-policies/' + p.id, { isActive: !p.isActive }).then(() => { notify('Updated'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{p.isActive ? 'Disable' : 'Enable'}</button>
                  <button type="button" onClick={() => api.remove('/multi-region/routing-policies/' + p.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {policies.length === 0 && <div className="text-center py-8 text-gray-400">No routing policies</div>}
          </div>
        </div>
      )}

      {tab === 'Failover' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Failover Events ({failoverEvents.length})</h2>
          <div className="grid gap-2">
            {failoverEvents.map((ev: any) => (
              <div key={ev.id} className="bg-white border border-orange-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ev.fromRegion} → {ev.toRegion}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{ev.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">Reason: {ev.reason}</p>
                    <p className="text-xs text-gray-400">{new Date(ev.createdAt).toLocaleString()} · duration: {ev.durationMs}ms</p>
                  </div>
                </div>
              </div>
            ))}
            {failoverEvents.length === 0 && <div className="text-center py-8 text-gray-400">No failover events</div>}
          </div>
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Multi-Region Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {([['Regions', stats.regions], ['Endpoints', stats.endpoints], ['Policies', stats.policies], ['Failovers', stats.failoverEvents], ['Replications', stats.replicationConfigs]] as [string, number][]).map(([l, v]) => (
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
