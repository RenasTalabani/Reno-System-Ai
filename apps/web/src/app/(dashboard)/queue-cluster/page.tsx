'use client'
import { useState, useEffect, useCallback } from 'react'
import { Layers, Plus, Trash2, RefreshCw, AlertTriangle, Inbox, Cpu } from 'lucide-react'

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

const TABS = ['Clusters', 'Nodes', 'Queues', 'Alerts', 'Stats']

export default function QueueClusterPage() {
  const api = useApi()
  const [tab, setTab] = useState('Clusters')
  const [clusters, setClusters] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [nodes, setNodes] = useState<any[]>([])
  const [queues, setQueues] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', engine: 'rabbitmq', nodeCount: 3, haMode: 'mirrored' })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Clusters') { const d = await api.get('/queue-cluster/clusters'); setClusters(d.clusters ?? []) }
    if (tab === 'Nodes' && selected) { const d = await api.get('/queue-cluster/clusters/' + selected.id + '/nodes'); setNodes(d.nodes ?? []) }
    if (tab === 'Queues' && selected) { const d = await api.get('/queue-cluster/clusters/' + selected.id + '/queues'); setQueues(d.queues ?? []) }
    if (tab === 'Alerts' && selected) { const d = await api.get('/queue-cluster/clusters/' + selected.id + '/alerts'); setAlerts(d.alerts ?? []) }
    if (tab === 'Stats') { const d = await api.get('/queue-cluster/stats'); setStats(d) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selected) api.get('/queue-cluster/clusters/' + selected.id + '/health').then((d: any) => setHealth(d))
  }, [selected])

  async function createCluster() {
    const res = await api.post('/queue-cluster/clusters', form)
    if (res.id) { notify('Cluster created with ' + form.nodeCount + ' nodes'); setShowCreate(false); load() }
    else notify(res.error ?? 'Error')
  }

  const statusColor = (s: string) => {
    const m: Record<string, string> = { running: 'bg-green-100 text-green-700', active: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', provisioning: 'bg-yellow-100 text-yellow-700', healthy: 'bg-green-100 text-green-700', degraded: 'bg-yellow-100 text-yellow-700', critical: 'bg-red-100 text-red-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Queue Cluster</h1>
            <p className="text-sm text-gray-500">HA message queue clusters, nodes, queues, and alerts</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      {selected && health && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selected.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(health.health)}`}>{health.health}</span>
            <span className="text-xs text-gray-500">{health.runningNodes}/{health.totalNodes} nodes running · leader: {health.hasLeader ? 'yes' : 'NO'}</span>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-orange-500">Clear</button>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Clusters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Clusters ({clusters.length})</h2>
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> New Cluster
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Cluster name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={form.engine} onChange={e => setForm(f => ({...f, engine: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['rabbitmq', 'kafka', 'redis-streams', 'nats'].map(en => <option key={en}>{en}</option>)}
                </select>
                <input type="number" placeholder="Nodes" value={form.nodeCount} onChange={e => setForm(f => ({...f, nodeCount: parseInt(e.target.value) || 3}))} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={form.haMode} onChange={e => setForm(f => ({...f, haMode: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['mirrored', 'quorum', 'single'].map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={createCluster} disabled={!form.name} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {clusters.map((c: any) => (
              <div key={c.id} onClick={() => setSelected(c)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === c.id ? 'border-orange-400 bg-orange-50' : 'hover:border-orange-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.engine}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{c.haMode}</span>
                    </div>
                    <p className="text-xs text-gray-400">{c._count?.nodes ?? 0} nodes · {c._count?.queues ?? 0} queues · {c._count?.alerts ?? 0} alerts · v{c.version}</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); api.remove('/queue-cluster/clusters/' + c.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {clusters.length === 0 && <div className="text-center py-12 text-gray-400">No clusters yet</div>}
          </div>
        </div>
      )}

      {tab === 'Nodes' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a cluster first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Cpu className="w-5 h-5" /> Nodes ({nodes.length})</h2>
                <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/refresh-metrics', {}).then(() => { notify('Metrics refreshed'); load() })} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Refresh Metrics</button>
              </div>
              <div className="grid gap-2">
                {nodes.map((n: any) => (
                  <div key={n.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{n.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${n.role === 'leader' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{n.role}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(n.status)}`}>{n.status}</span>
                      </div>
                      <p className="text-xs text-gray-400">CPU {n.cpuUsage?.toFixed(0)}% · Mem {n.memUsage?.toFixed(0)}% · Disk {n.diskUsage?.toFixed(0)}%</p>
                    </div>
                    <div className="flex gap-1">
                      {n.status === 'running'
                        ? <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/nodes/' + n.id + '/simulate-failure', {}).then((r: any) => { notify('Failure simulated' + (r.promotedNode ? ' — leader promoted' : '')); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"><AlertTriangle className="w-3 h-3 inline" /> Simulate Failure</button>
                        : <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/nodes/' + n.id + '/recover', {}).then(() => { notify('Node recovered'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Recover</button>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Queues' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a cluster first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Inbox className="w-5 h-5" /> Queues ({queues.length})</h2>
                <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/queues', { name: 'queue-' + Date.now(), queueType: 'classic', durable: true }).then(() => { notify('Queue created'); load() })} className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Queue</button>
              </div>
              <div className="grid gap-2">
                {queues.map((q: any) => (
                  <div key={q.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.name}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{q.queueType}</span>
                        {q.durable && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">durable</span>}
                      </div>
                      <p className="text-xs text-gray-400">{q.messageCount} messages · {q.consumerCount} consumers</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/queues/' + q.id + '/publish', { payload: { test: true, at: Date.now() } }).then(() => { notify('Message published'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish</button>
                      <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/queues/' + q.id + '/consume', { limit: 5 }).then((r: any) => { notify('Consumed ' + r.count + ' messages'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Consume</button>
                      <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/queues/' + q.id + '/purge', {}).then((r: any) => { notify('Purged ' + r.purged); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Purge</button>
                      <button type="button" onClick={() => api.remove('/queue-cluster/clusters/' + selected.id + '/queues/' + q.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {queues.length === 0 && <div className="text-center py-8 text-gray-400">No queues</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Alerts' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a cluster first</div> : (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Alerts ({alerts.length})</h2>
              <div className="grid gap-2">
                {alerts.map((a: any) => (
                  <div key={a.id} className={`border rounded-xl p-3 ${a.isResolved ? 'bg-gray-50' : a.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.severity}</span>
                          <span className="text-sm font-medium">{a.alertType}</span>
                          {a.isResolved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">resolved</span>}
                        </div>
                        <p className="text-xs text-gray-600">{a.message}</p>
                        <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                      {!a.isResolved && <button type="button" onClick={() => api.post('/queue-cluster/clusters/' + selected.id + '/alerts/' + a.id + '/resolve', {}).then(() => { notify('Resolved'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolve</button>}
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && <div className="text-center py-8 text-gray-400">No alerts</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Queue Cluster Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Clusters', stats.clusters], ['Nodes', stats.nodes], ['Queues', stats.queues], ['Messages', stats.messages], ['Consumers', stats.consumers], ['Open Alerts', stats.openAlerts]] as [string, number][]).map(([l, v]) => (
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
