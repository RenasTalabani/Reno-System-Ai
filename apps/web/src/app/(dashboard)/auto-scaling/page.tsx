'use client'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Plus, Trash2, RefreshCw, Activity, Gauge, Clock, Lightbulb } from 'lucide-react'

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

const TABS = ['Targets', 'Policies', 'Events', 'Recommendations', 'Stats']

export default function AutoScalingPage() {
  const api = useApi()
  const [tab, setTab] = useState('Targets')
  const [targets, setTargets] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [utilization, setUtilization] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const [form, setForm] = useState({ name: '', targetType: 'deployment', resourceRef: '', minReplicas: 1, maxReplicas: 10, currentReplicas: 2 })
  const [policyForm, setPolicyForm] = useState({ name: '', metricType: 'cpu', threshold: 70, comparison: 'gt', scaleDirection: 'up', stepSize: 1 })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Targets') { const d = await api.get('/auto-scaling/targets'); setTargets(d.targets ?? []) }
    if (tab === 'Policies' && selected) { const d = await api.get('/auto-scaling/targets/' + selected.id + '/policies'); setPolicies(d.policies ?? []) }
    if (tab === 'Events') {
      const d = selected ? await api.get('/auto-scaling/targets/' + selected.id + '/events') : await api.get('/auto-scaling/events')
      setEvents(d.events ?? [])
    }
    if (tab === 'Recommendations' && selected) { const d = await api.get('/auto-scaling/targets/' + selected.id + '/recommendations'); setRecommendations(d.recommendations ?? []) }
    if (tab === 'Stats') { const d = await api.get('/auto-scaling/stats'); setStats(d) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selected) api.get('/auto-scaling/targets/' + selected.id + '/utilization').then((d: any) => setUtilization(d))
  }, [selected])

  async function createTarget() {
    const res = await api.post('/auto-scaling/targets', form)
    if (res.id) { notify('Target created'); setShowCreate(false); load() } else notify(res.error ?? 'Error')
  }

  async function createPolicy() {
    if (!selected) return
    const res = await api.post('/auto-scaling/targets/' + selected.id + '/policies', policyForm)
    if (res.id) { notify('Policy created'); setShowPolicy(false); load() } else notify(res.error ?? 'Error')
  }

  async function simulateLoad(tid: string, baseValue: number) {
    await api.post('/auto-scaling/targets/' + tid + '/simulate-load', { metricType: 'cpu', baseValue, count: 10 })
    notify('Load simulated (base ' + baseValue + '%)')
  }

  async function evaluate(tid: string) {
    const res = await api.post('/auto-scaling/targets/' + tid + '/evaluate', {})
    notify('Evaluated ' + res.evaluated + ' policies, ' + (res.actions?.length ?? 0) + ' actions, replicas: ' + res.currentReplicas)
    load()
  }

  async function generateRec(tid: string) {
    const res = await api.post('/auto-scaling/targets/' + tid + '/recommendations/generate', {})
    if (res.id) { notify('Recommendation: ' + res.recommendationType + ' → ' + res.recommendedValue); load() }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auto Scaling</h1>
            <p className="text-sm text-gray-500">Scaling targets, policies, schedules, and recommendations</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium">{selected.name}</span>
            <span className="text-xs text-emerald-600">{selected.currentReplicas} replicas (min {selected.minReplicas} / max {selected.maxReplicas})</span>
            {utilization?.utilization?.cpu && <span className="text-xs text-gray-500">CPU avg: {utilization.utilization.cpu.avg?.toFixed(1)}%</span>}
          </div>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-emerald-500">Clear</button>
        </div>
      )}

      {tab === 'Targets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Scaling Targets ({targets.length})</h2>
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> New Target
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Resource ref (e.g. deploy/web-app)" value={form.resourceRef} onChange={e => setForm(f => ({...f, resourceRef: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={form.targetType} onChange={e => setForm(f => ({...f, targetType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['deployment', 'service', 'worker-pool', 'database', 'cache'].map(t => <option key={t}>{t}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={form.minReplicas} onChange={e => setForm(f => ({...f, minReplicas: parseInt(e.target.value) || 1}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <input type="number" placeholder="Max" value={form.maxReplicas} onChange={e => setForm(f => ({...f, maxReplicas: parseInt(e.target.value) || 10}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={createTarget} disabled={!form.name || !form.resourceRef} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {targets.map((t: any) => (
              <div key={t.id} onClick={() => setSelected(t)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === t.id ? 'border-emerald-400 bg-emerald-50' : 'hover:border-emerald-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t.targetType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{t.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{t.resourceRef}</p>
                    <p className="text-xs text-gray-400">{t.currentReplicas} replicas · range {t.minReplicas}-{t.maxReplicas} · {t._count?.policies ?? 0} policies · {t._count?.scalingEvents ?? 0} events</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); simulateLoad(t.id, 85) }} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">High Load</button>
                    <button type="button" onClick={e => { e.stopPropagation(); simulateLoad(t.id, 15) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Low Load</button>
                    <button type="button" onClick={e => { e.stopPropagation(); evaluate(t.id) }} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Evaluate</button>
                    <button type="button" onClick={e => { e.stopPropagation(); generateRec(t.id) }} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded"><Lightbulb className="w-3 h-3 inline" /></button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/auto-scaling/targets/' + t.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {targets.length === 0 && <div className="text-center py-12 text-gray-400">No scaling targets yet</div>}
          </div>
        </div>
      )}

      {tab === 'Policies' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a target first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Policies for {selected.name} ({policies.length})</h2>
                <button type="button" onClick={() => setShowPolicy(!showPolicy)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Policy</button>
              </div>
              {showPolicy && (
                <div className="bg-white border rounded-xl p-5 space-y-3">
                  <input placeholder="Policy name" value={policyForm.name} onChange={e => setPolicyForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <div className="grid grid-cols-3 gap-3">
                    <select value={policyForm.metricType} onChange={e => setPolicyForm(f => ({...f, metricType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                      {['cpu', 'memory', 'requests-per-sec', 'queue-depth', 'latency'].map(m => <option key={m}>{m}</option>)}
                    </select>
                    <select value={policyForm.comparison} onChange={e => setPolicyForm(f => ({...f, comparison: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                      {['gt', 'gte', 'lt', 'lte'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="Threshold" value={policyForm.threshold} onChange={e => setPolicyForm(f => ({...f, threshold: parseFloat(e.target.value) || 70}))} className="border rounded-lg px-3 py-2 text-sm" />
                    <select value={policyForm.scaleDirection} onChange={e => setPolicyForm(f => ({...f, scaleDirection: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                      <option value="up">scale up</option><option value="down">scale down</option>
                    </select>
                    <input type="number" placeholder="Step" value={policyForm.stepSize} onChange={e => setPolicyForm(f => ({...f, stepSize: parseInt(e.target.value) || 1}))} className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={createPolicy} disabled={!policyForm.name} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
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
                        {p.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                      </div>
                      <p className="text-xs text-gray-500">When {p.metricType} {p.comparison} {p.threshold} → scale {p.scaleDirection} by {p.stepSize} (cooldown {p.cooldownSec}s)</p>
                      {p.lastTriggeredAt && <p className="text-xs text-gray-400">Last triggered: {new Date(p.lastTriggeredAt).toLocaleString()}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.patch('/auto-scaling/targets/' + selected.id + '/policies/' + p.id, { isActive: !p.isActive }).then(() => { notify('Updated'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{p.isActive ? 'Disable' : 'Enable'}</button>
                      <button type="button" onClick={() => api.remove('/auto-scaling/targets/' + selected.id + '/policies/' + p.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {policies.length === 0 && <div className="text-center py-8 text-gray-400">No policies</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Events' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5" /> Scaling Events ({events.length})</h2>
          <div className="grid gap-2">
            {events.map((ev: any) => (
              <div key={ev.id} className="bg-white border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ev.eventType === 'scale-up' ? 'bg-green-100 text-green-700' : ev.eventType === 'scale-down' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{ev.eventType}</span>
                  <span className="text-sm font-medium">{ev.fromReplicas} → {ev.toReplicas} replicas</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ev.triggeredBy}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{ev.reason}</p>
                <p className="text-xs text-gray-400">{new Date(ev.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {events.length === 0 && <div className="text-center py-8 text-gray-400">No scaling events</div>}
          </div>
        </div>
      )}

      {tab === 'Recommendations' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a target first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500" /> Recommendations ({recommendations.length})</h2>
                <button type="button" onClick={() => generateRec(selected.id)} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm">Generate</button>
              </div>
              <div className="grid gap-2">
                {recommendations.map((rec: any) => (
                  <div key={rec.id} className="bg-white border rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{rec.recommendationType}</span>
                          <span className="text-sm font-medium">{rec.currentValue} → {rec.recommendedValue} replicas</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${rec.status === 'pending' ? 'bg-blue-100 text-blue-700' : rec.status === 'applied' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{rec.status}</span>
                          <span className="text-xs text-gray-400">confidence: {(rec.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-gray-600">{rec.rationale}</p>
                      </div>
                      {rec.status === 'pending' && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => api.post('/auto-scaling/targets/' + selected.id + '/recommendations/' + rec.id + '/apply', {}).then(() => { notify('Applied'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Apply</button>
                          <button type="button" onClick={() => api.post('/auto-scaling/targets/' + selected.id + '/recommendations/' + rec.id + '/dismiss', {}).then(() => { notify('Dismissed'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">Dismiss</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {recommendations.length === 0 && <div className="text-center py-8 text-gray-400">No recommendations — generate one</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Auto Scaling Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {([['Targets', stats.targets], ['Policies', stats.policies], ['Events', stats.events], ['Schedules', stats.schedules], ['Recommendations', stats.recommendations]] as [string, number][]).map(([l, v]) => (
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
