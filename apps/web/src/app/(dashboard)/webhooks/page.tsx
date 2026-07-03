'use client'
import { useState, useEffect, useCallback } from 'react'
import { Webhook, Plus, Trash2, RefreshCw, Zap, Activity, Key } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as HeadersInit }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as HeadersInit }).then(r => r.json())
  return { get, post, remove }
}

const TABS = ['Endpoints', 'Events', 'Deliveries', 'Logs', 'Stats']

export default function WebhooksPage() {
  const api = useApi()
  const [tab, setTab] = useState('Endpoints')
  const [endpoints, setEndpoints] = useState<any[]>([])
  const [selectedEp, setSelectedEp] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [registry, setRegistry] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [epForm, setEpForm] = useState({ name: '', url: '', maxRetries: 3 })
  const [fireForm, setFireForm] = useState({ eventType: 'user.created', source: 'system', payload: '{"userId":"123"}' })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Endpoints') { const d = await api.get('/webhooks/endpoints'); setEndpoints(d.endpoints ?? []) }
    if (tab === 'Events') { const d = await api.get('/webhooks/events'); setEvents(d.events ?? []) }
    if (tab === 'Deliveries' && selectedEp) { const d = await api.get('/webhooks/endpoints/' + selectedEp.id + '/deliveries'); setDeliveries(d.deliveries ?? []) }
    if (tab === 'Logs') { const d = await api.get('/webhooks/logs'); setLogs(d.logs ?? []) }
    if (tab === 'Stats') { const d = await api.get('/webhooks/stats'); setStats(d) }
  }, [tab, selectedEp])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/webhooks/registry').then((d: any) => setRegistry(d)) }, [])

  async function createEndpoint() {
    const res = await api.post('/webhooks/endpoints', epForm)
    if (res.id) { notify('Endpoint created'); setShowCreate(false); load() }
    else notify(res.message ?? 'Error')
  }

  async function fireEvent() {
    let payload = {}
    try { payload = JSON.parse(fireForm.payload) } catch {}
    const res = await api.post('/webhooks/events/fire', { eventType: fireForm.eventType, source: fireForm.source, payload })
    notify('Event fired: ' + res.deliveredTo + ' delivered, ' + res.failed + ' failed')
    load()
  }

  async function testEndpoint(epId: string) {
    const res = await api.post('/webhooks/endpoints/' + epId + '/test', {})
    notify(res.message ?? 'Tested')
  }

  async function subscribeAll(epId: string) {
    const types = registry?.eventTypes ?? ['user.created', 'order.placed', 'invoice.paid']
    const res = await api.post('/webhooks/endpoints/' + epId + '/subscriptions/bulk', { eventTypes: types })
    notify('Subscribed to ' + res.count + ' event types')
    load()
  }

  async function issueSecret(epId: string) {
    const res = await api.post('/webhooks/endpoints/' + epId + '/secrets', {})
    if (res.secret) { setNewSecret(res.secret); notify('Secret generated') }
    else notify(res.message ?? 'Error')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
            <Webhook className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Webhooks & Event Bus</h1>
            <p className="text-sm text-gray-500">Endpoints, subscriptions, event delivery, and signing secrets</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      {newSecret && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-800">Signing Secret — copy now, will not be shown again:</p>
          <code className="text-xs bg-yellow-100 px-3 py-2 rounded-lg block break-all">{newSecret}</code>
          <button type="button" onClick={() => setNewSecret(null)} className="text-xs text-yellow-600">Dismiss</button>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Endpoints' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Endpoints ({endpoints.length})</h2>
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Add Endpoint
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <input placeholder="Name" value={epForm.name} onChange={e => setEpForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <input placeholder="URL (https://your-server.com/webhook)" value={epForm.url} onChange={e => setEpForm(f => ({...f, url: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <div className="flex gap-2">
                <button type="button" onClick={createEndpoint} disabled={!epForm.name || !epForm.url} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {endpoints.map((ep: any) => (
              <div key={ep.id} onClick={() => setSelectedEp(ep)}
                className={`bg-white border rounded-xl p-4 cursor-pointer ${selectedEp?.id === ep.id ? 'border-rose-400 bg-rose-50' : 'hover:border-rose-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{ep.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ep.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{ep.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{ep.url}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{ep._count?.subscriptions ?? 0} subscriptions</span>
                      <span>{ep.successCount} ok / {ep.failureCount} failed</span>
                      <span>retry: {ep.maxRetries}x</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); testEndpoint(ep.id) }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">Test</button>
                    <button type="button" onClick={e => { e.stopPropagation(); subscribeAll(ep.id) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">Sub All</button>
                    <button type="button" onClick={e => { e.stopPropagation(); issueSecret(ep.id) }} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg"><Key className="w-3 h-3 inline" /></button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/webhooks/endpoints/' + ep.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {endpoints.length === 0 && <div className="text-center py-12 text-gray-400">No endpoints yet</div>}
          </div>

          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-rose-600" /> Fire Event</h3>
            <div className="grid grid-cols-2 gap-3">
              <select value={fireForm.eventType} onChange={e => setFireForm(f => ({...f, eventType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                {(registry?.eventTypes ?? ['user.created', 'order.placed', 'invoice.paid']).map((t: string) => <option key={t}>{t}</option>)}
              </select>
              <select value={fireForm.source} onChange={e => setFireForm(f => ({...f, source: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                {(registry?.sources ?? ['system', 'user', 'api']).map((s: string) => <option key={s}>{s}</option>)}
              </select>
              <textarea placeholder="Payload JSON" value={fireForm.payload} onChange={e => setFireForm(f => ({...f, payload: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm col-span-2 h-16" />
            </div>
            <button type="button" onClick={fireEvent} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm">Fire Event</button>
          </div>
        </div>
      )}

      {tab === 'Events' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Event Log ({events.length})</h2>
          <div className="grid gap-2">
            {events.map((ev: any) => (
              <div key={ev.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-mono">{ev.eventType}</span>
                      <span className="text-xs text-gray-500">from {ev.source}</span>
                    </div>
                    <p className="text-xs text-gray-400">{new Date(ev.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status === 'dispatched' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{ev.status}</span>
                </div>
              </div>
            ))}
            {events.length === 0 && <div className="text-center py-12 text-gray-400">No events fired yet</div>}
          </div>
        </div>
      )}

      {tab === 'Deliveries' && (
        <div className="space-y-4">
          {!selectedEp ? <div className="text-center py-12 text-gray-400">Select an endpoint in Endpoints tab to see deliveries</div> : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Deliveries — {selectedEp.name}</h2>
              {deliveries.map((d: any) => (
                <div key={d.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.status}</span>
                      <span className="text-xs text-gray-500">HTTP {d.httpStatus} · {d.durationMs}ms · {d.attemptCount} attempt(s)</span>
                    </div>
                    <p className="text-xs text-gray-400">{d.event?.eventType} · {new Date(d.createdAt).toLocaleString()}</p>
                  </div>
                  {d.status === 'failed' && (
                    <button type="button" onClick={() => api.post('/webhooks/deliveries/' + d.id + '/retry', {}).then(() => { notify('Retried'); load() })} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg">Retry</button>
                  )}
                </div>
              ))}
              {deliveries.length === 0 && <div className="text-center py-8 text-gray-400">No deliveries</div>}
            </div>
          )}
        </div>
      )}

      {tab === 'Logs' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5" /> Activity Logs</h2>
          <div className="grid gap-2">
            {logs.map((l: any) => (
              <div key={l.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{l.action}</p>
                  <p className="text-xs text-gray-400">{l.entityType} · {new Date(l.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && <div className="text-center py-12 text-gray-400">No logs</div>}
          </div>
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Webhook Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Endpoints', stats.endpoints], ['Events', stats.events], ['Deliveries', stats.deliveries], ['Subscriptions', stats.subscriptions]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {([['Delivered', stats.deliveredCount], ['Failed', stats.failedCount], ['Success Rate', stats.deliverySuccessRate + '%']] as [string, any][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-xl font-bold">{v}</p><p className="text-xs text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Stats' && !stats && <div className="text-center py-12 text-gray-400">Loading stats...</div>}
    </div>
  )
}
