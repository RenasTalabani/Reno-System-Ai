'use client'
import { useState, useEffect, useCallback } from 'react'
import { Container, Plus, Trash2, RefreshCw, Activity, Server, Box, Network } from 'lucide-react'

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

const TABS = ['Clusters', 'Deployments', 'Pods', 'Services', 'Events', 'Stats']

export default function KubernetesPage() {
  const api = useApi()
  const [tab, setTab] = useState('Clusters')
  const [clusters, setClusters] = useState<any[]>([])
  const [selectedCluster, setSelectedCluster] = useState<any>(null)
  const [deployments, setDeployments] = useState<any[]>([])
  const [pods, setPods] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [overview, setOverview] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showDeploy, setShowDeploy] = useState(false)
  const [clusterForm, setClusterForm] = useState({ name: '', provider: 'kubernetes', region: 'us-east-1', nodeCount: 3, kubeVersion: '1.29.0' })
  const [deployForm, setDeployForm] = useState({ name: '', image: 'nginx:latest', namespace: 'default', replicas: 2, strategy: 'RollingUpdate' })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Clusters') { const d = await api.get('/kubernetes/clusters'); setClusters(d.clusters ?? []) }
    if (tab === 'Deployments' && selectedCluster) { const d = await api.get('/kubernetes/clusters/' + selectedCluster.id + '/deployments'); setDeployments(d.deployments ?? []) }
    if (tab === 'Pods' && selectedCluster) { const d = await api.get('/kubernetes/clusters/' + selectedCluster.id + '/pods'); setPods(d.pods ?? []) }
    if (tab === 'Services' && selectedCluster) { const d = await api.get('/kubernetes/clusters/' + selectedCluster.id + '/services'); setServices(d.services ?? []) }
    if (tab === 'Events' && selectedCluster) { const d = await api.get('/kubernetes/clusters/' + selectedCluster.id + '/events'); setEvents(d.events ?? []) }
    if (tab === 'Stats') { const d = await api.get('/kubernetes/stats'); setStats(d) }
  }, [tab, selectedCluster])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedCluster) { api.get('/kubernetes/clusters/' + selectedCluster.id + '/overview').then((d: any) => setOverview(d)) }
  }, [selectedCluster])

  async function createCluster() {
    const res = await api.post('/kubernetes/clusters', clusterForm)
    if (res.id) {
      await api.patch('/kubernetes/clusters/' + res.id, { status: 'running' })
      notify('Cluster created and running')
      setShowCreate(false); load()
    } else notify(res.error ?? 'Error')
  }

  async function createDeployment() {
    if (!selectedCluster) return notify('Select a cluster first')
    const res = await api.post('/kubernetes/clusters/' + selectedCluster.id + '/deployments', deployForm)
    if (res.id) { notify('Deployment created'); setShowDeploy(false); load() }
    else notify(res.error ?? 'Error')
  }

  async function scaleDeployment(dep: any, replicas: number) {
    const res = await api.post('/kubernetes/clusters/' + dep.clusterId + '/deployments/' + dep.id + '/scale', { replicas })
    notify('Scaled to ' + res.replicas)
    load()
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { running: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', stopped: 'bg-red-100 text-red-700', Running: 'bg-green-100 text-green-700', Failed: 'bg-red-100 text-red-700', Pending: 'bg-yellow-100 text-yellow-700' }
    return colors[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Container className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kubernetes Manager</h1>
            <p className="text-sm text-gray-500">Clusters, deployments, pods, services, and events</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selectedCluster && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">{selectedCluster.name}</span>
            {overview && <span className="text-xs text-blue-500">{overview.pods} pods · {overview.deployments} deployments · {overview.services} services</span>}
          </div>
          <button type="button" onClick={() => setSelectedCluster(null)} className="text-xs text-blue-500">Clear</button>
        </div>
      )}

      {tab === 'Clusters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Clusters ({clusters.length})</h2>
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> New Cluster
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <input placeholder="Cluster name" value={clusterForm.name} onChange={e => setClusterForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <div className="grid grid-cols-2 gap-3">
                <select value={clusterForm.provider} onChange={e => setClusterForm(f => ({...f, provider: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['kubernetes', 'eks', 'gke', 'aks', 'k3s'].map(p => <option key={p}>{p}</option>)}
                </select>
                <input placeholder="Region" value={clusterForm.region} onChange={e => setClusterForm(f => ({...f, region: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="number" placeholder="Nodes" value={clusterForm.nodeCount} onChange={e => setClusterForm(f => ({...f, nodeCount: parseInt(e.target.value) || 3}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="K8s Version" value={clusterForm.kubeVersion} onChange={e => setClusterForm(f => ({...f, kubeVersion: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={createCluster} disabled={!clusterForm.name} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {clusters.map((c: any) => (
              <div key={c.id} onClick={() => setSelectedCluster(c)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selectedCluster?.id === c.id ? 'border-blue-400 bg-blue-50' : 'hover:border-blue-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.provider}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{c.nodeCount} nodes</span>
                      <span>v{c.kubeVersion}</span>
                      {c.region && <span>{c.region}</span>}
                      <span>{c._count?.deployments ?? 0} deployments · {c._count?.pods ?? 0} pods</span>
                    </div>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); api.remove('/kubernetes/clusters/' + c.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {clusters.length === 0 && <div className="text-center py-12 text-gray-400">No clusters yet</div>}
          </div>

          {selectedCluster && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Box className="w-4 h-4 text-blue-600" /> Deploy to {selectedCluster.name}</h3>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Deployment name" value={deployForm.name} onChange={e => setDeployForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Image (e.g. nginx:latest)" value={deployForm.image} onChange={e => setDeployForm(f => ({...f, image: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Namespace" value={deployForm.namespace} onChange={e => setDeployForm(f => ({...f, namespace: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="number" placeholder="Replicas" value={deployForm.replicas} onChange={e => setDeployForm(f => ({...f, replicas: parseInt(e.target.value) || 1}))} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button type="button" onClick={createDeployment} disabled={!deployForm.name || !deployForm.image} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Deploy</button>
            </div>
          )}
        </div>
      )}

      {tab === 'Deployments' && (
        <div className="space-y-4">
          {!selectedCluster ? <div className="text-center py-12 text-gray-400">Select a cluster</div> : (
            <>
              <h2 className="text-lg font-semibold">Deployments ({deployments.length})</h2>
              <div className="grid gap-3">
                {deployments.map((dep: any) => (
                  <div key={dep.id} className="bg-white border rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{dep.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(dep.status)}`}>{dep.status}</span>
                          <span className="text-xs text-gray-500">{dep.namespace}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">{dep.image}</p>
                        <p className="text-xs text-gray-400">{dep.readyReplicas}/{dep.replicas} ready · {dep.strategy}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => scaleDeployment(dep, dep.replicas + 1)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+1</button>
                        <button type="button" onClick={() => scaleDeployment(dep, Math.max(1, dep.replicas - 1))} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">-1</button>
                        <button type="button" onClick={() => api.post('/kubernetes/clusters/' + dep.clusterId + '/deployments/' + dep.id + '/rollout', {}).then(() => { notify('Rollout started'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Rollout</button>
                        <button type="button" onClick={() => api.remove('/kubernetes/clusters/' + dep.clusterId + '/deployments/' + dep.id).then(() => { notify('Deleted'); load() })} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {deployments.length === 0 && <div className="text-center py-8 text-gray-400">No deployments</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Pods' && (
        <div className="space-y-4">
          {!selectedCluster ? <div className="text-center py-12 text-gray-400">Select a cluster</div> : (
            <>
              <h2 className="text-lg font-semibold">Pods ({pods.length})</h2>
              <div className="grid gap-2">
                {pods.map((pod: any) => (
                  <div key={pod.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{pod.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(pod.phase)}`}>{pod.phase}</span>
                        <span className="text-xs text-gray-400">{pod.namespace}</span>
                      </div>
                      <div className="text-xs text-gray-400">{pod.nodeName} · CPU:{pod.cpuUsage} · Mem:{pod.memUsage} · restarts:{pod.restartCount}</div>
                    </div>
                  </div>
                ))}
                {pods.length === 0 && <div className="text-center py-8 text-gray-400">No pods</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Services' && (
        <div className="space-y-4">
          {!selectedCluster ? <div className="text-center py-12 text-gray-400">Select a cluster</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Services ({services.length})</h2>
                <button type="button" onClick={() => api.post('/kubernetes/clusters/' + selectedCluster.id + '/services', { name: 'svc-' + Date.now(), namespace: 'default', serviceType: 'ClusterIP', ports: [{ port: 80, targetPort: 8080 }], selector: { app: 'web' } }).then(() => { notify('Service created'); load() })} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"><Network className="w-4 h-4" /> Add Service</button>
              </div>
              <div className="grid gap-2">
                {services.map((svc: any) => (
                  <div key={svc.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{svc.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{svc.serviceType}</span>
                        <span className="text-xs text-gray-400">{svc.namespace}</span>
                      </div>
                      {svc.clusterIp && <p className="text-xs text-gray-400">ClusterIP: {svc.clusterIp}</p>}
                    </div>
                    <button type="button" onClick={() => api.remove('/kubernetes/clusters/' + svc.clusterId + '/services/' + svc.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {services.length === 0 && <div className="text-center py-8 text-gray-400">No services</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Events' && (
        <div className="space-y-4">
          {!selectedCluster ? <div className="text-center py-12 text-gray-400">Select a cluster</div> : (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5" /> Events ({events.length})</h2>
              <div className="grid gap-2">
                {events.map((ev: any) => (
                  <div key={ev.id} className={`border rounded-xl p-3 ${ev.eventType === 'Warning' ? 'border-red-200 bg-red-50' : 'bg-white'}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ev.eventType === 'Warning' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{ev.eventType}</span>
                          <span className="text-sm font-medium">{ev.reason}</span>
                          <span className="text-xs text-gray-400">{ev.objectKind}/{ev.objectName}</span>
                        </div>
                        <p className="text-xs text-gray-600">{ev.message}</p>
                        <p className="text-xs text-gray-400">{new Date(ev.createdAt).toLocaleString()} · count: {ev.count}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && <div className="text-center py-8 text-gray-400">No events</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Kubernetes Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {([['Clusters', stats.clusters], ['Deployments', stats.deployments], ['Pods', stats.pods], ['Services', stats.services], ['Running', stats.runningPods]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'Stats' && !stats && <div className="text-center py-12 text-gray-400">Loading stats...</div>}
    </div>
  )
}
