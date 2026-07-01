'use client'

import { useState, useEffect, useCallback } from 'react'

async function apiGet(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`)
  return r.json()
}
async function apiPost(path: string, body?: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return r.json()
}
async function apiPatch(path: string, body: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}
async function apiDelete(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return r.json()
}

interface Workflow { id: string; name: string; slug: string; category: string; status: string; totalRuns: number; successfulRuns: number; failedRuns: number; avgDurationMs: number; lastRunAt?: string; description?: string; _count?: { steps: number; executions: number } }
interface WorkflowStep { id: string; name: string; stepType: string; stepOrder: number; config: Record<string, unknown>; isEnabled: boolean }
interface WorkflowExecution { id: string; status: string; triggerType: string; currentStep: number; totalSteps: number; durationMs?: number; startedAt: string; workflow?: { name: string }; _count?: { stepExecutions: number } }
interface WorkflowTemplate { name: string; slug: string; category: string; description: string }
interface DashboardData { summary: string; stats: { totalWorkflows: number; activeWorkflows: number; totalExecutions: number; runningExecutions: number }; workflows: Workflow[]; recentExecutions: WorkflowExecution[] }

const TABS = ['Dashboard', 'Workflows', 'Builder', 'Executions', 'Templates'] as const
type Tab = typeof TABS[number]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-500',
  paused: 'bg-yellow-100 text-yellow-700', archived: 'bg-gray-100 text-gray-400',
  completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700', partially_completed: 'bg-orange-100 text-orange-700',
}
const STEP_TYPE_COLORS: Record<string, string> = {
  action: 'bg-blue-100 text-blue-700', condition: 'bg-purple-100 text-purple-700',
  human_approval: 'bg-orange-100 text-orange-700', webhook: 'bg-cyan-100 text-cyan-700',
  delay: 'bg-gray-100 text-gray-600', parallel: 'bg-indigo-100 text-indigo-700',
  loop: 'bg-pink-100 text-pink-700', transform: 'bg-teal-100 text-teal-700',
}

export default function ProcessAutomationPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow & { steps?: WorkflowStep[]; triggers?: unknown[]; performance?: { successRate: number; grade: string; recommendation: string } } | null>(null)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showStepForm, setShowStepForm] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '', category: 'custom' })
  const [stepForm, setStepForm] = useState({ name: '', stepType: 'action', stepOrder: '1' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/pae/dashboard'); setDashboard(d) }, [])
  const loadWorkflows = useCallback(async () => { const d = await apiGet('/v1/pae/workflows'); setWorkflows(d.workflows ?? []) }, [])
  const loadExecutions = useCallback(async () => { const d = await apiGet('/v1/pae/executions'); setExecutions(d.executions ?? []) }, [])
  const loadTemplates = useCallback(async () => { const d = await apiGet('/v1/pae/templates'); setTemplates(d.templates ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard,
      Workflows: loadWorkflows,
      Builder: async () => { await loadWorkflows() },
      Executions: loadExecutions,
      Templates: loadTemplates,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadWorkflows, loadExecutions, loadTemplates])

  const createWorkflow = async () => {
    const r = await apiPost('/v1/pae/workflows', createForm)
    if (r.error) flash(r.error); else { flash('Workflow created'); setShowCreateForm(false); await loadWorkflows() }
  }

  const deleteWorkflow = async (id: string) => {
    await apiDelete(`/v1/pae/workflows/${id}`); await loadWorkflows(); if (selectedWorkflow?.id === id) setSelectedWorkflow(null)
  }

  const selectWorkflow = async (wf: Workflow) => {
    const detail = await apiGet(`/v1/pae/workflows/${wf.id}`)
    setSelectedWorkflow(detail)
    setTab('Builder')
  }

  const runWorkflow = async (id: string) => {
    const r = await apiPost(`/v1/pae/workflows/${id}/run`, { input: {} })
    flash(`Run complete — ${r.status} (${r.completedSteps}/${r.totalSteps} steps, ${r.durationMs}ms)`)
    if (selectedWorkflow?.id === id) { const detail = await apiGet(`/v1/pae/workflows/${id}`); setSelectedWorkflow(detail) }
    await loadWorkflows()
  }

  const toggleWorkflow = async (wf: Workflow) => {
    const newStatus = wf.status === 'active' ? 'paused' : 'active'
    await apiPatch(`/v1/pae/workflows/${wf.id}`, { status: newStatus })
    await loadWorkflows()
    if (selectedWorkflow?.id === wf.id) { const detail = await apiGet(`/v1/pae/workflows/${wf.id}`); setSelectedWorkflow(detail) }
  }

  const addStep = async () => {
    if (!selectedWorkflow) return
    const r = await apiPost(`/v1/pae/workflows/${selectedWorkflow.id}/steps`, {
      name: stepForm.name, stepType: stepForm.stepType, stepOrder: parseInt(stepForm.stepOrder), config: {},
    })
    if (r.error) flash(r.error)
    else { flash('Step added'); setShowStepForm(false); const detail = await apiGet(`/v1/pae/workflows/${selectedWorkflow.id}`); setSelectedWorkflow(detail) }
  }

  const deleteStep = async (stepId: string) => {
    if (!selectedWorkflow) return
    await apiDelete(`/v1/pae/workflows/${selectedWorkflow.id}/steps/${stepId}`)
    const detail = await apiGet(`/v1/pae/workflows/${selectedWorkflow.id}`)
    setSelectedWorkflow(detail)
  }

  const installTemplate = async (slug: string) => {
    const r = await apiPost('/v1/pae/templates/install', { slug })
    if (r.error) flash(r.error); else { flash(`Installed: ${r.name}`); setTab('Workflows'); await loadWorkflows() }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Process Automation Engine</h1>
        <p className="text-gray-500 text-sm mt-1">Visual workflow builder · Step-by-step automation · Multi-trigger execution</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* Dashboard */}
      {!loading && tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-5 text-white">
            <p className="text-lg font-medium">{dashboard.summary}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Workflows', value: dashboard.stats.totalWorkflows },
              { label: 'Active', value: dashboard.stats.activeWorkflows },
              { label: 'Total Executions', value: dashboard.stats.totalExecutions },
              { label: 'Running Now', value: dashboard.stats.runningExecutions },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className="text-3xl font-bold text-emerald-600">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Workflows</h3>
              <div className="space-y-2">
                {dashboard.workflows.map(w => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div><div className="text-sm font-medium">{w.name}</div><div className="text-xs text-gray-400">{w.totalRuns} runs · {w.failedRuns} failed</div></div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[w.status] ?? 'bg-gray-100 text-gray-600'}`}>{w.status}</span>
                  </div>
                ))}
                {dashboard.workflows.length === 0 && <p className="text-sm text-gray-400">No workflows yet.</p>}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Recent Executions</h3>
              <div className="space-y-2">
                {dashboard.recentExecutions.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div><div className="font-medium">{e.workflow?.name ?? 'Unknown'}</div><div className="text-xs text-gray-400">{new Date(e.startedAt).toLocaleTimeString()}</div></div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                  </div>
                ))}
                {dashboard.recentExecutions.length === 0 && <p className="text-sm text-gray-400">No executions yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows */}
      {!loading && tab === 'Workflows' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{workflows.length} workflows</p>
            <button onClick={() => setShowCreateForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">+ New Workflow</button>
          </div>
          {showCreateForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Create Workflow</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Workflow name" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug" value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}>
                  {['crm','hr','finance','communication','document','onboarding','approval','reporting','custom'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Description" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createWorkflow} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Create</button>
                <button onClick={() => setShowCreateForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div><div className="font-semibold">{wf.name}</div><div className="text-xs text-gray-400">{wf.category}</div></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[wf.status] ?? 'bg-gray-100 text-gray-600'}`}>{wf.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                  <div><div className="font-bold text-gray-700">{wf.totalRuns}</div>Runs</div>
                  <div><div className="font-bold text-green-600">{wf.successfulRuns}</div>Success</div>
                  <div><div className="font-bold text-red-500">{wf.failedRuns}</div>Failed</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => selectWorkflow(wf)} className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded text-xs hover:bg-indigo-100">Edit</button>
                  <button onClick={() => runWorkflow(wf.id)} className="flex-1 bg-emerald-50 text-emerald-700 py-1.5 rounded text-xs hover:bg-emerald-100">Run</button>
                  <button onClick={() => toggleWorkflow(wf)} className={`flex-1 py-1.5 rounded text-xs ${wf.status === 'active' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    {wf.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button onClick={() => deleteWorkflow(wf.id)} className="px-2 py-1.5 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100">Del</button>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="md:col-span-3 bg-white rounded-xl border p-8 text-center text-gray-400">
                <p className="text-2xl mb-2">⚡</p>
                <p>No workflows yet. Create one or install from Templates.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Builder */}
      {!loading && tab === 'Builder' && (
        <div className="space-y-4">
          {!selectedWorkflow ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-2xl mb-2">🔧</p>
              <p>Select a workflow from the Workflows tab to edit it.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{selectedWorkflow.name}</h2>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[selectedWorkflow.status] ?? 'bg-gray-100'}`}>{selectedWorkflow.status}</span>
                      <span className="text-xs text-gray-400">{selectedWorkflow.category}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => runWorkflow(selectedWorkflow.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">▶ Run Now</button>
                  </div>
                </div>
                {selectedWorkflow.performance && (
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm bg-gray-50 rounded-lg p-3">
                    <div><div className="font-bold text-emerald-600">{selectedWorkflow.performance.successRate.toFixed(1)}%</div><div className="text-xs text-gray-500">Success Rate</div></div>
                    <div><div className="font-bold text-indigo-600">{selectedWorkflow.performance.grade}</div><div className="text-xs text-gray-500">Grade</div></div>
                    <div><div className="font-bold text-gray-700">{selectedWorkflow.avgDurationMs}ms</div><div className="text-xs text-gray-500">Avg Duration</div></div>
                  </div>
                )}
                {selectedWorkflow.performance && <p className="text-xs text-amber-600 mt-2">{selectedWorkflow.performance.recommendation}</p>}
              </div>

              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Workflow Steps</h3>
                  <button onClick={() => setShowStepForm(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm">+ Add Step</button>
                </div>
                {showStepForm && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input className="border rounded px-2 py-1.5 text-sm col-span-1" placeholder="Step name" value={stepForm.name} onChange={e => setStepForm(f => ({ ...f, name: e.target.value }))} />
                      <select className="border rounded px-2 py-1.5 text-sm" value={stepForm.stepType} onChange={e => setStepForm(f => ({ ...f, stepType: e.target.value }))}>
                        {['action','condition','delay','parallel','loop','human_approval','webhook','transform'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input className="border rounded px-2 py-1.5 text-sm" placeholder="Order" value={stepForm.stepOrder} onChange={e => setStepForm(f => ({ ...f, stepOrder: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addStep} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm">Add</button>
                      <button onClick={() => setShowStepForm(false)} className="border px-3 py-1.5 rounded text-sm">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {(selectedWorkflow.steps ?? []).map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{step.name}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STEP_TYPE_COLORS[step.stepType] ?? 'bg-gray-100 text-gray-600'}`}>{step.stepType}</span>
                      <button onClick={() => deleteStep(step.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                  ))}
                  {(selectedWorkflow.steps ?? []).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No steps yet. Add a step above.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Executions */}
      {!loading && tab === 'Executions' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{executions.length} executions</p>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Workflow','Trigger','Status','Steps','Duration','Time'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {executions.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.workflow?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.triggerType}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{e.currentStep}/{e.totalSteps}</td>
                    <td className="px-4 py-3 text-gray-500">{e.durationMs ? `${e.durationMs}ms` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.startedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {executions.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No executions yet. Run a workflow.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Templates */}
      {!loading && tab === 'Templates' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{templates.length} built-in templates</p>
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map(t => (
              <div key={t.slug} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div><div className="font-semibold">{t.name}</div><div className="text-xs text-gray-400 mt-0.5">{t.category}</div></div>
                </div>
                <p className="text-sm text-gray-600">{t.description}</p>
                <button onClick={() => installTemplate(t.slug)} className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm hover:bg-emerald-700">Install Workflow</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
