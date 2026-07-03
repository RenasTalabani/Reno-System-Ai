'use client'
import { useState, useEffect, useCallback } from 'react'
import { Zap, Plus, Trash2, RefreshCw, Globe2, HardDrive, Eraser } from 'lucide-react'

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

const TABS = ['Zones', 'Origins & Rules', 'Edge Network', 'Analytics', 'Stats']

export default function CdnEdgePage() {
  const api = useApi()
  const [tab, setTab] = useState('Zones')
  const [zones, setZones] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [origins, setOrigins] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', sslMode: 'full', cacheLevel: 'standard' })
  const [testPath, setTestPath] = useState('/static/app.js')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Zones') {
      const d = await api.get('/cdn-edge/zones'); setZones(d.zones ?? [])
      const h = await api.get('/cdn-edge/health'); setHealth(h)
    }
    if (tab === 'Origins & Rules' && selected) {
      const o = await api.get('/cdn-edge/zones/' + selected.id + '/origins'); setOrigins(o.origins ?? [])
      const r = await api.get('/cdn-edge/zones/' + selected.id + '/cache-rules'); setRules(r.rules ?? [])
    }
    if (tab === 'Edge Network') { const d = await api.get('/cdn-edge/edge-locations'); setEdges(d.locations ?? []) }
    if (tab === 'Analytics' && selected) { const d = await api.get('/cdn-edge/zones/' + selected.id + '/analytics'); setAnalytics(d) }
    if (tab === 'Stats') { const d = await api.get('/cdn-edge/stats'); setStats(d) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  async function createZone() {
    const res = await api.post('/cdn-edge/zones', form)
    if (res.id) { notify('Zone created'); setShowCreate(false); load() } else notify(res.error ?? 'Error')
  }

  const statusColor = (s: string) => {
    const m: Record<string, string> = { active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', online: 'bg-green-100 text-green-700', offline: 'bg-red-100 text-red-700', healthy: 'bg-green-100 text-green-700', degraded: 'bg-yellow-100 text-yellow-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CDN & Edge</h1>
            <p className="text-sm text-gray-500">Zones, origins, cache rules, edge network, and analytics</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      {health && tab === 'Zones' && (
        <div className="grid grid-cols-5 gap-4">
          {([['Zones', health.totalZones], ['Active', health.activeZones], ['Edge PoPs', health.totalEdges], ['Online PoPs', health.onlineEdges], ['Avg Hit Rate', health.avgHitRate + '%']] as [string, any][]).map(([l, v]) => (
            <div key={l} className="bg-white border rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{v}</p><p className="text-xs text-gray-500 mt-1">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.name} · {selected.domain}</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-cyan-500">Clear</button>
        </div>
      )}

      {tab === 'Zones' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Zones ({zones.length})</h2>
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> New Zone
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Zone name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Domain (e.g. cdn.example.com)" value={form.domain} onChange={e => setForm(f => ({...f, domain: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={form.sslMode} onChange={e => setForm(f => ({...f, sslMode: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['off', 'flexible', 'full', 'strict'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={form.cacheLevel} onChange={e => setForm(f => ({...f, cacheLevel: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['bypass', 'basic', 'standard', 'aggressive'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={createZone} disabled={!form.name || !form.domain} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {zones.map((z: any) => (
              <div key={z.id} onClick={() => setSelected(z)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === z.id ? 'border-cyan-400 bg-cyan-50' : 'hover:border-cyan-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{z.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(z.status)}`}>{z.status}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">SSL: {z.sslMode}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{z.cacheLevel}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{z.domain}</p>
                    <p className="text-xs text-gray-400">{z._count?.origins ?? 0} origins · {z._count?.cacheRules ?? 0} rules · {z._count?.purgeRequests ?? 0} purges</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/cdn-edge/zones/' + z.id + '/toggle', {}).then((r: any) => { notify('Zone ' + r.status); load() }) }} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">{z.status === 'active' ? 'Pause' : 'Resume'}</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/cdn-edge/zones/' + z.id + '/purge', { purgeType: 'everything', paths: ['*'] }).then(() => { notify('Cache purged'); load() }) }} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded"><Eraser className="w-3 h-3 inline" /> Purge</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/cdn-edge/zones/' + z.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {zones.length === 0 && <div className="text-center py-12 text-gray-400">No zones yet</div>}
          </div>
        </div>
      )}

      {tab === 'Origins & Rules' && (
        <div className="space-y-6">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a zone first</div> : (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><HardDrive className="w-5 h-5" /> Origins ({origins.length})</h2>
                  <button type="button" onClick={() => api.post('/cdn-edge/zones/' + selected.id + '/origins', { name: 'origin-' + Date.now(), originUrl: 'https://origin.' + selected.domain, weight: 100 }).then(() => { notify('Origin added'); load() })} className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4 inline" /> Add Origin</button>
                </div>
                {origins.map((o: any) => (
                  <div key={o.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{o.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>{o.status}</span>
                        {o.isBackup && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">backup</span>}
                      </div>
                      <p className="text-xs text-gray-400 font-mono">{o.originUrl} · weight {o.weight}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.post('/cdn-edge/zones/' + selected.id + '/origins/' + o.id + '/health-check', {}).then((r: any) => { notify(o.name + ': ' + r.status + ' ' + r.latencyMs + 'ms'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Check</button>
                      <button type="button" onClick={() => api.remove('/cdn-edge/zones/' + selected.id + '/origins/' + o.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Cache Rules ({rules.length})</h2>
                  <button type="button" onClick={() => api.post('/cdn-edge/zones/' + selected.id + '/cache-rules', { name: 'rule-' + Date.now(), pathPattern: '/static/*', ttlSeconds: 86400, priority: rules.length }).then(() => { notify('Rule added'); load() })} className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4 inline" /> Add Rule</button>
                </div>
                {rules.map((rl: any) => (
                  <div key={rl.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rl.name}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{rl.pathPattern}</span>
                        {rl.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                      </div>
                      <p className="text-xs text-gray-400">TTL {rl.ttlSeconds}s · priority {rl.priority} · {rl.cacheable ? 'cacheable' : 'bypass'}</p>
                    </div>
                    <button type="button" onClick={() => api.remove('/cdn-edge/zones/' + selected.id + '/cache-rules/' + rl.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}

                <div className="bg-white border rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium">Test path matching</p>
                  <div className="flex gap-2">
                    <input value={testPath} onChange={e => setTestPath(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 font-mono" />
                    <button type="button" onClick={() => api.post('/cdn-edge/zones/' + selected.id + '/test-path', { path: testPath }).then((r: any) => notify(r.matched ? 'Matched rule: ' + r.rule.name + ' (TTL ' + r.rule.ttlSeconds + 's)' : 'No rule matched — default TTL'))} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm">Test</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Edge Network' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Globe2 className="w-5 h-5" /> Edge Locations ({edges.length})</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => api.post('/cdn-edge/edge-locations/seed', {}).then((r: any) => { notify('Seeded ' + r.created + ' locations'); load() })} className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm">Seed Network</button>
              <button type="button" onClick={() => api.post('/cdn-edge/edge-locations/simulate-traffic', {}).then((r: any) => { notify('Simulated traffic on ' + r.results.length + ' PoPs'); load() })} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Simulate Traffic</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {edges.map((e: any) => (
              <div key={e.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold uppercase">{e.code}</span>
                    <span className="text-sm">{e.city}, {e.country}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{e.capacityGbps?.toFixed(0)} Gbps · hit rate {e.hitRate?.toFixed(1)}%</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.patch('/cdn-edge/edge-locations/' + e.id, { status: e.status === 'online' ? 'maintenance' : 'online' }).then(() => { notify('Updated'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{e.status === 'online' ? 'Maintenance' : 'Bring Online'}</button>
                  <button type="button" onClick={() => api.remove('/cdn-edge/edge-locations/' + e.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {edges.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">No edge locations — click Seed Network</div>}
          </div>
        </div>
      )}

      {tab === 'Analytics' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a zone first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Analytics for {selected.name}</h2>
                <button type="button" onClick={() => api.post('/cdn-edge/zones/' + selected.id + '/analytics/simulate', {}).then(() => { notify('Sample recorded'); load() })} className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm">Record Sample</button>
              </div>
              {analytics?.totals && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {([['Requests', analytics.totals.requests.toLocaleString()], ['Bandwidth GB', analytics.totals.bandwidth.toFixed(1)], ['Cache Hits', analytics.totals.cacheHits.toLocaleString()], ['Misses', analytics.totals.cacheMisses.toLocaleString()], ['Hit Rate', analytics.totals.hitRate + '%'], ['5xx Errors', analytics.totals.errors5xx]] as [string, any][]).map(([l, v]) => (
                    <div key={l} className="bg-white border rounded-xl p-4 text-center">
                      <p className="text-lg font-bold">{v}</p><p className="text-xs text-gray-500 mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-2">
                {(analytics?.samples ?? []).slice(0, 10).map((s: any) => (
                  <div key={s.id} className="bg-white border rounded-xl p-3 text-xs text-gray-500 flex justify-between">
                    <span>{new Date(s.recordedAt).toLocaleString()}</span>
                    <span>{s.requests.toLocaleString()} reqs · {s.cacheHits.toLocaleString()} hits · {s.bandwidth.toFixed(1)} GB</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">CDN Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Zones', stats.zones], ['Origins', stats.origins], ['Cache Rules', stats.cacheRules], ['Edge PoPs', stats.edgeLocations], ['Purges', stats.purgeRequests], ['Samples', stats.analyticsSamples]] as [string, number][]).map(([l, v]) => (
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
