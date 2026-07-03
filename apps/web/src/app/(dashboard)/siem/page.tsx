'use client'
import { useState, useEffect, useCallback } from 'react'
import { ScanSearch, Plus, Trash2, RefreshCw, Database, GitMerge, Search } from 'lucide-react'

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

const TABS = ['Overview', 'Sources', 'Search', 'Rules & Detections', 'Retention']

export default function SiemPage() {
  const api = useApi()
  const [tab, setTab] = useState('Overview')
  const [overview, setOverview] = useState<any>(null)
  const [sources, setSources] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [detections, setDetections] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchSeverity, setSearchSeverity] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Overview') { const d = await api.get('/siem/overview'); setOverview(d) }
    if (tab === 'Sources') { const d = await api.get('/siem/sources'); setSources(d.sources ?? []) }
    if (tab === 'Rules & Detections') {
      const rl = await api.get('/siem/rules'); setRules(rl.rules ?? [])
      const dt = await api.get('/siem/detections'); setDetections(dt.detections ?? [])
    }
    if (tab === 'Retention') { const d = await api.get('/siem/retention-policies'); setPolicies(d.policies ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  async function search() {
    let url = '/siem/events/search?limit=50'
    if (searchText) url += '&text=' + encodeURIComponent(searchText)
    if (searchSeverity) url += '&severity=' + searchSeverity
    const d = await api.get(url)
    setEvents(d.events ?? [])
    notify('Found ' + d.total + ' events')
  }

  const sevColor = (s: string) => {
    const m: Record<string, string> = { critical: 'bg-red-100 text-red-700', error: 'bg-orange-100 text-orange-700', high: 'bg-orange-100 text-orange-700', warning: 'bg-yellow-100 text-yellow-700', info: 'bg-blue-100 text-blue-700', debug: 'bg-gray-100 text-gray-500' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <ScanSearch className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SIEM</h1>
            <p className="text-sm text-gray-500">Log sources, event search, correlation rules, and retention</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-slate-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Sources', overview.sources], ['Total Events', overview.totalEvents], ['Last 24h', overview.eventsLast24h], ['Active Rules', overview.activeRules], ['Detections', overview.totalDetections], ['New', overview.newDetections]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-xl p-5 space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><GitMerge className="w-4 h-4" /> Correlation Engine</h3>
            <p className="text-sm text-gray-500">Evaluate all active rules against recent events.</p>
            <button type="button" onClick={() => api.post('/siem/correlate', {}).then((r: any) => { notify('Evaluated ' + r.rulesEvaluated + ' rules → ' + r.detections + ' detections'); load() })} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">Run Correlation</button>
          </div>
        </div>
      )}

      {tab === 'Sources' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Database className="w-5 h-5" /> Log Sources ({sources.length})</h2>
            <button type="button" onClick={() => api.post('/siem/sources', { name: 'source-' + Date.now(), sourceType: 'application', format: 'json' }).then(() => { notify('Source created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Source</button>
          </div>
          <div className="grid gap-2">
            {sources.map((s: any) => (
              <div key={s.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.sourceType}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{s.format}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{s._count?.events ?? 0} events {s.lastEventAt && '· last ' + new Date(s.lastEventAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/siem/sources/' + s.id + '/ingest', { eventType: 'auth-failure', severity: 'warning', message: 'Failed login attempt', actor: 'test-user', sourceIp: '198.51.100.7' }).then(() => { notify('Event ingested'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Ingest</button>
                  <button type="button" onClick={() => api.post('/siem/simulate/storm', { sourceId: s.id, eventType: 'auth-failure', count: 10 }).then((r: any) => { notify('Storm: ' + r.created + ' events'); load() })} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Storm</button>
                  <button type="button" onClick={() => api.remove('/siem/sources/' + s.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {sources.length === 0 && <div className="text-center py-8 text-gray-400">No log sources</div>}
          </div>
        </div>
      )}

      {tab === 'Search' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4 flex gap-2">
            <input placeholder="Search message text..." value={searchText} onChange={e => setSearchText(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1" />
            <select value={searchSeverity} onChange={e => setSearchSeverity(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Any severity</option>
              {['debug', 'info', 'warning', 'error', 'critical'].map(s => <option key={s}>{s}</option>)}
            </select>
            <button type="button" onClick={search} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm"><Search className="w-4 h-4" /> Search</button>
          </div>
          <div className="grid gap-2">
            {events.map((e: any) => (
              <div key={e.id} className="bg-white border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(e.severity)}`}>{e.severity}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{e.eventType}</span>
                  {e.actor && <span className="text-xs text-gray-500">actor: {e.actor}</span>}
                  {e.sourceIp && <span className="text-xs text-gray-500 font-mono">{e.sourceIp}</span>}
                </div>
                <p className="text-sm mt-1">{e.message}</p>
                <p className="text-xs text-gray-400">{new Date(e.occurredAt).toLocaleString()}</p>
              </div>
            ))}
            {events.length === 0 && <div className="text-center py-8 text-gray-400">No results — run a search</div>}
          </div>
        </div>
      )}

      {tab === 'Rules & Detections' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Correlation Rules ({rules.length})</h2>
              <button type="button" onClick={() => api.post('/siem/rules', { name: 'brute-force-' + Date.now(), eventType: 'auth-failure', threshold: 5, windowMinutes: 10, severity: 'high' }).then(() => { notify('Rule created'); load() })} className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm"><Plus className="w-4 h-4 inline" /> Add Rule</button>
            </div>
            {rules.map((rl: any) => (
              <div key={rl.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rl.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(rl.severity)}`}>{rl.severity}</span>
                    {rl.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                  </div>
                  <p className="text-xs text-gray-400">{rl.eventType} ≥ {rl.threshold} in {rl.windowMinutes}min · {rl._count?.detections ?? 0} detections</p>
                </div>
                <button type="button" onClick={() => api.remove('/siem/rules/' + rl.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Detections ({detections.length})</h2>
            {detections.map((d: any) => (
              <div key={d.id} className={`border rounded-xl p-3 ${d.status === 'new' ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(d.severity)}`}>{d.severity}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.status}</span>
                      <span className="text-xs text-gray-400">{d.matchCount} matches</span>
                    </div>
                    <p className="text-sm mt-1">{d.summary}</p>
                    <p className="text-xs text-gray-400">{new Date(d.detectedAt).toLocaleString()}</p>
                  </div>
                  {d.status === 'new' && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.patch('/siem/detections/' + d.id, { status: 'triaged' }).then(() => { notify('Triaged'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Triage</button>
                      <button type="button" onClick={() => api.patch('/siem/detections/' + d.id, { status: 'dismissed' }).then(() => { notify('Dismissed'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">Dismiss</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {detections.length === 0 && <div className="text-center py-8 text-gray-400">No detections — run correlation from Overview</div>}
          </div>
        </div>
      )}

      {tab === 'Retention' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Retention Policies ({policies.length})</h2>
            <button type="button" onClick={() => api.post('/siem/retention-policies', { name: 'default-' + Date.now(), sourceType: 'all', retentionDays: 90, archiveEnabled: true }).then(() => { notify('Policy created'); load() })} className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm"><Plus className="w-4 h-4 inline" /> Add Policy</button>
          </div>
          <div className="grid gap-2">
            {policies.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.sourceType}</span>
                    {p.archiveEnabled && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">archive</span>}
                  </div>
                  <p className="text-xs text-gray-400">Keep {p.retentionDays} days</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/siem/retention-policies/' + p.id + '/apply', { dryRun: true }).then((r: any) => notify('Dry run: ' + r.affectedEvents + ' events would be deleted'))} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Dry Run</button>
                  <button type="button" onClick={() => api.remove('/siem/retention-policies/' + p.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {policies.length === 0 && <div className="text-center py-8 text-gray-400">No retention policies</div>}
          </div>
        </div>
      )}
    </div>
  )
}
