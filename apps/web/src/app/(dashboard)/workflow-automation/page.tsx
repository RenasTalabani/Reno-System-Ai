'use client'
import { useState, useEffect, useCallback } from 'react'
import { Workflow, Plus, Play, Trash2, Copy, RefreshCw, Zap, Clock, BarChart2, Webhook, Eye, CheckCircle, XCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const hd = { Authorization: `Bearer ${token}` }
  const get = (p: string) => fetch(`${API}${p}`, { headers: hd }).then(r => r.json())
  const post = (p: string, b: unknown) => fetch(`${API}${p}`, { method: 'POST', headers: hj, body: JSON.stringify(b) }).then(r => r.json())
  const patch = (p: string, b: unknown) => fetch(`${API}${p}`, { method: 'PATCH', headers: hj, body: JSON.stringify(b) }).then(r => r.json())
  const del = (p: string) => fetch(`${API}${p}`, { method: 'DELETE', headers: hd }).then(r => r.json())
  return { get, post, patch, del }
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700'
}
const TRIGGER_ICONS: Record<string, any> = { manual: Play, webhook: Webhook, schedule: Clock, event: Zap }

export default function WorkflowAutomationPage() {
  const api = useApi()
  const [tab, setTab] = useState('Workflows')
  const [workflows, setWorkflows] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [registry, setRegistry] = useState<any>(null)
  const [selectedWf, setSelectedWf] = useState<any>(null)
  const [wfDetail, setWfDetail] = useState<any>(null)
  const [wfExecs, setWfExecs] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [execDetail, setExecDetail] = useState<any>(null)

  const [form, setForm] = useState({ name: '', description: '', triggerType: 'manual', category: 'general' })
  const [stepForm, setStepForm] = useState({ name: '', stepType: 'action', config: '{}' })
  const [schedForm, setSchedForm] = useState({ name: '', cronExpr: '0 9 * * 1', timezone: 'UTC' })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'Workflows' || tab === 'Designer') {
        const d = await api.get('/workflow-automation/workflows'); setWorkflows(d.workflows ?? [])
      }
      if (tab === 'Executions') { const d = await api.get('/workflow-automation/audit'); setExecutions(d.executions ?? []) }
      if (tab === 'Stats') { const d = await api.get('/workflow-automation/stats'); setStats(d) }
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/workflow-automation/registry').then(d => setRegistry(d)) }, [])

  async function loadWfDetail(wf: any) {
    setSelectedWf(wf)
    const [detail, execs] = await Promise.all([
      api.get(`/workflow-automation/workflows/${wf.id}`),
      api.get(`/workflow-automation/workflows/${wf.id}/executions`)
    ])
    setWfDetail(detail)
    setWfExecs(execs.executions ?? [])
  }

  async function createWorkflow() {
    const res = await api.post('/workflow-automation/workflows', form)
    if (res.id) { notify('Workflow created'); setShowCreate(false); load(); setForm({ name: '', description: '', triggerType: 'manual', category: 'general' }) }
    else notify(res.message ?? 'Error')
  }

  async function addStep() {
    if (!selectedWf) return
    let config = {}; try { config = JSON.parse(stepForm.config) } catch { }
    const res = await api.post(`/workflow-automation/workflows/${selectedWf.id}/steps`, { ...stepForm, config })
    if (res.id) { notify('Step added'); loadWfDetail(selectedWf) }
    else notify(res.message ?? 'Error')
  }

  async function executeWorkflow(wfId: string) {
    const res = await api.post(`/workflow-automation/workflows/${wfId}/execute`, { input: { manual: true, triggeredAt: new Date().toISOString() } })
    if (res.execution) {
      notify(`Workflow executed: ${res.execution.stepsDone} steps, ${res.execution.durationMs}ms`)
      load()
      if (selectedWf?.id === wfId) loadWfDetail(selectedWf)
    } else notify(res.message ?? 'Error')
  }

  async function cloneWorkflow(wfId: string) {
    const res = await api.post(`/workflow-automation/workflows/${wfId}/clone`, {})
    if (res.id) { notify(`Cloned: ${res.name}`); load() }
    else notify(res.message ?? 'Error')
  }

  async function toggleActive(wf: any) {
    await api.patch(`/workflow-automation/workflows/${wf.id}`, { isActive: !wf.isActive })
    notify(`Workflow ${!wf.isActive ? 'activated' : 'deactivated'}`); load()
  }

  async function deleteWorkflow(wfId: string) {
    if (!confirm('Delete this workflow and all its steps/executions?')) return
    await api.del(`/workflow-automation/workflows/${wfId}`)
    notify('Deleted'); setSelectedWf(null); setWfDetail(null); load()
  }

  async function addSchedule() {
    if (!selectedWf) return
    const res = await api.post(`/workflow-automation/workflows/${selectedWf.id}/schedules`, schedForm)
    if (res.id) { notify('Schedule created'); loadWfDetail(selectedWf) }
    else notify(res.message ?? 'Error')
  }

  async function loadExecDetail(execId: string) {
    const res = await api.get(`/workflow-automation/executions/${execId}`)
    setExecDetail(res)
  }

  const TABS = ['Workflows', 'Designer', 'Executions', 'Stats']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Workflow className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Automation</h1>
            <p className="text-sm text-gray-500">Design, automate, and monitor business workflows</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setShowCreate(false) }}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* WORKFLOWS */}
      {tab === 'Workflows' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Workflows ({workflows.length})</h2>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> New Workflow
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Create Workflow</h3>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Workflow name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                <select value={form.triggerType} onChange={e => setForm(f => ({...f, triggerType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {(registry?.triggerTypes ?? ['manual','webhook','schedule','event']).map((t: string) => <option key={t}>{t}</option>)}
                </select>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {(registry?.categories ?? ['general','hr','finance','crm']).map((c: string) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createWorkflow} disabled={!form.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Create</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
            <div className="grid gap-3">
              {workflows.map((wf: any) => {
                const Icon = TRIGGER_ICONS[wf.triggerType] ?? Zap
                return (
                  <div key={wf.id} className="bg-white border rounded-xl p-4 flex items-start justify-between hover:border-indigo-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{wf.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${wf.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{wf.isActive ? 'Active' : 'Inactive'}</span>
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{wf.triggerType}</span>
                        </div>
                        {wf.description && <p className="text-xs text-gray-500">{wf.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{wf._count?.steps ?? 0} steps</span>
                          <span>{wf.runCount} runs</span>
                          <span>v{wf.version}</span>
                          {wf.lastRunAt && <span>Last: {new Date(wf.lastRunAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setTab('Designer'); loadWfDetail(wf) }} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Open designer"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => executeWorkflow(wf.id)} className="p-1.5 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Run now"><Play className="w-4 h-4" /></button>
                      <button onClick={() => cloneWorkflow(wf.id)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Clone"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => toggleActive(wf)} className="p-1.5 text-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Toggle active">{wf.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}</button>
                      <button onClick={() => deleteWorkflow(wf.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )
              })}
              {workflows.length === 0 && <div className="text-center py-12 text-gray-400">No workflows yet — create one above</div>}
            </div>
          )}
        </div>
      )}

      {/* DESIGNER */}
      {tab === 'Designer' && (
        <div className="space-y-4">
          {!selectedWf ? (
            <div className="text-center py-16">
              <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a workflow from the Workflows tab to open the designer</p>
              <button onClick={() => setTab('Workflows')} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Go to Workflows</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{wfDetail?.name ?? selectedWf.name}</h2>
                  <p className="text-xs text-gray-500">Trigger: {wfDetail?.triggerType} · {wfDetail?.steps?.length ?? 0} steps</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => executeWorkflow(selectedWf.id)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                    <Play className="w-4 h-4" /> Run Now
                  </button>
                  <button onClick={() => setTab('Workflows')} className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Back</button>
                </div>
              </div>

              {/* Canvas */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 min-h-48">
                <div className="flex flex-wrap gap-3">
                  {(wfDetail?.steps ?? []).map((step: any, i: number) => (
                    <div key={step.id} className="bg-white border rounded-xl p-3 shadow-sm min-w-32">
                      <div className="text-xs font-bold text-indigo-600 mb-1">#{i + 1}</div>
                      <div className="text-sm font-semibold text-gray-900">{step.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{step.stepType}</div>
                      <div className={`w-2 h-2 rounded-full mt-2 ${step.isEnabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                    </div>
                  ))}
                  {(wfDetail?.steps?.length ?? 0) === 0 && <div className="text-gray-400 text-sm self-center">No steps yet — add one below</div>}
                </div>
              </div>

              {/* Add step */}
              <div className="bg-white border rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-gray-900">Add Step</h3>
                <div className="grid grid-cols-3 gap-3">
                  <input placeholder="Step name" value={stepForm.name} onChange={e => setStepForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm col-span-1" />
                  <select value={stepForm.stepType} onChange={e => setStepForm(f => ({...f, stepType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                    {(registry?.stepTypes ?? ['trigger','action','condition','delay']).map((t: string) => <option key={t}>{t}</option>)}
                  </select>
                  <button onClick={addStep} disabled={!stepForm.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Add Step</button>
                </div>
              </div>

              {/* Schedules */}
              <div className="bg-white border rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4" /> Add Schedule Trigger</h3>
                <div className="grid grid-cols-3 gap-3">
                  <input placeholder="Name" value={schedForm.name} onChange={e => setSchedForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                  <input placeholder="Cron (e.g. 0 9 * * 1)" value={schedForm.cronExpr} onChange={e => setSchedForm(f => ({...f, cronExpr: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addSchedule} disabled={!schedForm.cronExpr} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Create Schedule</button>
                </div>
              </div>

              {/* Recent executions for this workflow */}
              <div className="bg-white border rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-gray-900">Recent Executions ({wfExecs.length})</h3>
                <div className="space-y-2">
                  {wfExecs.slice(0, 5).map((ex: any) => (
                    <div key={ex.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[ex.status] ?? 'bg-gray-100 text-gray-700'}`}>{ex.status}</span>
                        <span className="text-xs text-gray-500">{ex.stepsDone}/{ex.stepsTotal} steps · {ex.durationMs}ms</span>
                      </div>
                      <button onClick={() => loadExecDetail(ex.id)} className="text-xs text-indigo-600 hover:text-indigo-800">View</button>
                    </div>
                  ))}
                  {wfExecs.length === 0 && <p className="text-sm text-gray-400">No executions yet</p>}
                </div>
              </div>

              {execDetail && (
                <div className="bg-white border rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Execution Detail</h3>
                    <button onClick={() => setExecDetail(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500">Status: </span><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[execDetail.status] ?? ''}`}>{execDetail.status}</span></div>
                    <div><span className="text-gray-500">Duration: </span>{execDetail.durationMs}ms</div>
                    <div><span className="text-gray-500">Steps: </span>{execDetail.stepsDone}/{execDetail.stepsTotal}</div>
                  </div>
                  {execDetail.stepLogs?.map((log: any) => (
                    <div key={log.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[log.status] ?? 'bg-gray-100'}`}>{log.status}</span>
                        <span className="font-medium">{log.step?.name} ({log.step?.stepType})</span>
                        <span className="text-gray-400">{log.durationMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* EXECUTIONS */}
      {tab === 'Executions' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">All Executions ({executions.length})</h2>
          {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
            <div className="grid gap-2">
              {executions.map((ex: any) => (
                <div key={ex.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[ex.status] ?? 'bg-gray-100 text-gray-700'}`}>{ex.status}</span>
                      <span className="text-sm font-medium text-gray-900">{ex.workflow?.name}</span>
                    </div>
                    <p className="text-xs text-gray-500">{ex.stepsDone}/{ex.stepsTotal} steps · {ex.durationMs}ms · {new Date(ex.startedAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => loadExecDetail(ex.id)} className="text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1 border rounded-lg">View Logs</button>
                </div>
              ))}
              {executions.length === 0 && <div className="text-center py-12 text-gray-400">No executions yet</div>}
            </div>
          )}
          {execDetail && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Execution Logs</h3>
                <button onClick={() => setExecDetail(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
              </div>
              {execDetail.stepLogs?.map((log: any) => (
                <div key={log.id} className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[log.status] ?? 'bg-gray-100'}`}>{log.status}</span>
                    <span className="font-medium">{log.step?.name}</span>
                    <span className="text-gray-400">{log.durationMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATS */}
      {tab === 'Stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Automation Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Workflows', value: stats.workflows ?? 0 },
              { label: 'Total Executions', value: stats.executions ?? 0 },
              { label: 'Completed', value: stats.completedExecs ?? 0 },
              { label: 'Failed', value: stats.failedExecs ?? 0 },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-5">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Webhooks', value: stats.webhooks ?? 0 },
              { label: 'Schedules', value: stats.schedules ?? 0 },
              { label: 'Success Rate', value: `${stats.successRate ?? 100}%` },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
