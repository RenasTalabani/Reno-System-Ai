'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'
type Tab = 'dashboard' | 'agents' | 'marketplace' | 'tasks' | 'collaborations' | 'memory' | 'analytics'

interface Agent { id: string; name: string; slug: string; type: string; description: string | null; personality: string | null; goals: string[]; tools: string[]; status: string; totalTasks: number; totalCost: number; _count?: { tasks: number; memories: number; kpis: number } }
interface Task { id: string; agentId: string; title: string; description: string | null; status: string; priority: string; plan: unknown; output: unknown; durationMs: number | null; createdAt: string; agent?: { name: string; type: string } }
interface Collab { id: string; fromAgentId: string; toAgentId: string; message: string; type: string; createdAt: string; fromAgent?: { name: string; type: string }; toAgent?: { name: string; type: string } }
interface Template { type: string; name: string; description: string; personality: string; goals: string[]; tools: string[]; defaultKpis: { name: string; target: number; unit: string }[] }

const AGENT_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-800', hr: 'bg-green-100 text-green-800', finance: 'bg-yellow-100 text-yellow-800',
  procurement: 'bg-orange-100 text-orange-800', legal: 'bg-red-100 text-red-800', ceo: 'bg-purple-100 text-purple-800',
  integration: 'bg-pink-100 text-pink-800', security: 'bg-gray-100 text-gray-800', knowledge: 'bg-teal-100 text-teal-800',
  assistant: 'bg-indigo-100 text-indigo-800', custom: 'bg-slate-100 text-slate-700',
}

const AGENT_ICONS: Record<string, string> = {
  sales: '💼', hr: '👥', finance: '💰', procurement: '🛒', legal: '⚖️',
  ceo: '🎯', integration: '🔌', security: '🔒', knowledge: '🧠', assistant: '🤖', custom: '⚙️',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-500', paused: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-blue-100 text-blue-700', running: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-600', high: 'text-orange-500', medium: 'text-yellow-600', low: 'text-gray-400',
}

function useApi(path: string) {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [path])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

async function apiPost(path: string, body: unknown = {}) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return res.json()
}

async function apiPostNoBody(path: string) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, { method: 'POST' })
  return res.json()
}

async function apiDelete(path: string) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return res.json()
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, loading, reload } = useApi('/agents-platform/dashboard')
  const d = data as {
    totalAgents: number; activeAgents: number; pendingTasks: number; completedTasks: number
    totalCollaborations: number; totalCost: number; avgDurationMs: number; summary: string
    agentsByType: Record<string, number>; recentAgents: Agent[]
  } | null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading agents dashboard...</div>

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">{d?.summary}</div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Agents', value: d?.totalAgents ?? 0, color: 'text-gray-800' },
          { label: 'Active', value: d?.activeAgents ?? 0, color: 'text-green-600' },
          { label: 'Pending Tasks', value: d?.pendingTasks ?? 0, color: 'text-blue-600' },
          { label: 'Completed', value: d?.completedTasks ?? 0, color: 'text-purple-600' },
          { label: 'Collaborations', value: d?.totalCollaborations ?? 0, color: 'text-orange-600' },
          { label: 'Total Cost', value: `$${(d?.totalCost ?? 0).toFixed(2)}`, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {d?.agentsByType && Object.keys(d.agentsByType).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Agents by Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(d.agentsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${AGENT_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}>
                <span>{AGENT_ICONS[type] ?? '⚙️'}</span>
                <span className="capitalize">{type}</span>
                <span className="font-bold">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d && d.recentAgents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Active Agents</h3>
          <div className="space-y-2">
            {d.recentAgents.map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-xl">{AGENT_ICONS[a.type] ?? '⚙️'}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{a.name}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${AGENT_COLORS[a.type] ?? 'bg-gray-100 text-gray-600'}`}>{a.type}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                <span className="text-xs text-gray-400">{a.totalTasks} tasks</span>
                <span className="text-xs text-gray-400">${a.totalCost.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Marketplace ───────────────────────────────────────────────────────────────

function MarketplaceTab({ onDeploy }: { onDeploy: () => void }) {
  const { data } = useApi('/agents-platform/marketplace')
  const templates = (data ?? []) as Template[]
  const [deploying, setDeploying] = useState<string | null>(null)
  const [deployed, setDeployed] = useState<string[]>([])

  const deploy = async (type: string) => {
    setDeploying(type)
    await apiPost('/agents-platform/marketplace/deploy', { templateType: type })
    setDeployed(d => [...d, type])
    setDeploying(null)
    onDeploy()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{templates.length} agent templates available. Deploy specialist agents to automate enterprise functions.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.type} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{AGENT_ICONS[t.type] ?? '⚙️'}</span>
                <div>
                  <h3 className="font-bold text-gray-800">{t.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${AGENT_COLORS[t.type] ?? 'bg-gray-100 text-gray-600'}`}>{t.type}</span>
                </div>
              </div>
              <button
                onClick={() => deploy(t.type)}
                disabled={deploying === t.type}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${deployed.includes(t.type) ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-50`}
              >
                {deploying === t.type ? 'Deploying...' : deployed.includes(t.type) ? '✓ Deployed' : 'Deploy'}
              </button>
            </div>
            <p className="text-sm text-gray-600">{t.description}</p>
            <div>
              <div className="text-xs font-medium text-gray-400 mb-1">Goals</div>
              <div className="flex flex-wrap gap-1">
                {t.goals.map((g, i) => <span key={i} className="text-xs bg-gray-50 text-gray-600 rounded px-1.5 py-0.5">{g}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 mb-1">Tools ({t.tools.length})</div>
              <div className="flex flex-wrap gap-1">
                {t.tools.map(tool => <span key={tool} className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{tool}</span>)}
              </div>
            </div>
            {t.defaultKpis.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-400 mb-1">KPIs</div>
                <div className="flex flex-wrap gap-1">
                  {t.defaultKpis.map((k, i) => <span key={i} className="text-xs bg-purple-50 text-purple-600 rounded px-1.5 py-0.5">{k.name}: {k.target}{k.unit}</span>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Agents Tab ────────────────────────────────────────────────────────────────

function AgentsTab({ onSelectAgent }: { onSelectAgent: (agent: Agent) => void }) {
  const { data, loading, reload } = useApi('/agents-platform/agents')
  const agents = (data ?? []) as Agent[]
  const [pausing, setPausing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'custom', description: '' })
  const [saving, setSaving] = useState(false)

  const pause = async (id: string) => {
    setPausing(id)
    await apiPostNoBody(`/agents-platform/agents/${id}/pause`)
    await reload()
    setPausing(null)
  }
  const activate = async (id: string) => {
    setPausing(id)
    await apiPostNoBody(`/agents-platform/agents/${id}/activate`)
    await reload()
    setPausing(null)
  }
  const deactivate = async (id: string) => {
    setDeleting(id)
    await apiDelete(`/agents-platform/agents/${id}`)
    await reload()
    setDeleting(null)
  }
  const save = async () => {
    setSaving(true)
    await apiPost('/agents-platform/agents', form)
    await reload()
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', type: 'custom', description: '' })
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading agents...</div>

  const AGENT_TYPES = ['sales', 'hr', 'finance', 'procurement', 'legal', 'ceo', 'integration', 'security', 'knowledge', 'assistant', 'custom']

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{agents.length} agents deployed</p>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Custom Agent</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Create Custom Agent</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Marketing Agent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {AGENT_TYPES.map(t => <option key={t} value={t}>{AGENT_ICONS[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="What does this agent do?" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={!form.name || saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {agents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No agents deployed. Go to the Marketplace tab to deploy specialist agents.</div>
      ) : (
        <div className="space-y-3">
          {agents.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-4">
                <span className="text-3xl shrink-0">{AGENT_ICONS[a.type] ?? '⚙️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${AGENT_COLORS[a.type] ?? 'bg-gray-100 text-gray-600'}`}>{a.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                  </div>
                  {a.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.description}</p>}
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    <span>{a._count?.tasks ?? a.totalTasks} tasks</span>
                    <span>${a.totalCost.toFixed(3)} cost</span>
                    <span>{a._count?.memories ?? 0} memories</span>
                    <span>{a._count?.kpis ?? 0} KPIs</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => onSelectAgent(a)} className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">Tasks →</button>
                  {a.status === 'active' ? (
                    <button onClick={() => pause(a.id)} disabled={pausing === a.id} className="px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-50">
                      {pausing === a.id ? '...' : '⏸ Pause'}
                    </button>
                  ) : (
                    <button onClick={() => activate(a.id)} disabled={pausing === a.id} className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50">
                      {pausing === a.id ? '...' : '▶ Activate'}
                    </button>
                  )}
                  <button onClick={() => deactivate(a.id)} disabled={deleting === a.id} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50">
                    {deleting === a.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab({ selectedAgent }: { selectedAgent: Agent | null }) {
  const { data: agentData } = useApi('/agents-platform/agents')
  const agents = (agentData ?? []) as Agent[]
  const [agentId, setAgentId] = useState(selectedAgent?.id ?? '')
  const { data, loading, reload } = useApi(`/agents-platform/tasks${agentId ? `?agentId=${agentId}` : ''}`)
  const tasks = (data ?? []) as Task[]
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' })
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState<string | null>(null)

  useEffect(() => { if (selectedAgent) setAgentId(selectedAgent.id) }, [selectedAgent])

  const createTask = async () => {
    if (!agentId || !form.title) return
    setSaving(true)
    await apiPost(`/agents-platform/agents/${agentId}/tasks`, form)
    await reload()
    setSaving(false)
    setForm({ title: '', description: '', priority: 'medium' })
  }

  const execute = async (taskId: string) => {
    setExecuting(taskId)
    await apiPostNoBody(`/agents-platform/tasks/${taskId}/execute`)
    await reload()
    setExecuting(null)
  }

  const cancel = async (taskId: string) => {
    await apiPostNoBody(`/agents-platform/tasks/${taskId}/cancel`)
    await reload()
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading tasks...</div>

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Agent</label>
          <select value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{AGENT_ICONS[a.type]} {a.name}</option>)}
          </select>
        </div>
      </div>

      {agentId && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Task title..." />
            </div>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Description (optional)" />
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={createTask} disabled={!form.title || saving} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creating...' : '+ Create Task'}
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No tasks yet. Select an agent and create a task above.</div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm">{t.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority] ?? ''}`}>{t.priority}</span>
                    {t.agent && <span className="text-xs text-gray-400">{AGENT_ICONS[t.agent.type]} {t.agent.name}</span>}
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>}
                  {t.durationMs && <span className="text-xs text-gray-400">{t.durationMs}ms</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {t.status === 'pending' && (
                    <>
                      <button onClick={() => execute(t.id)} disabled={executing === t.id} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">
                        {executing === t.id ? 'Running...' : '▶ Execute'}
                      </button>
                      <button onClick={() => cancel(t.id)} className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Cancel</button>
                    </>
                  )}
                  {t.status === 'completed' && (
                    <span className="text-xs text-green-600">✓ Done</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Collaborations Tab ────────────────────────────────────────────────────────

function CollaborationsTab() {
  const { data, loading, reload } = useApi('/agents-platform/collaborations')
  const { data: agentData } = useApi('/agents-platform/agents')
  const collabs = (data ?? []) as Collab[]
  const agents = (agentData ?? []) as Agent[]
  const [form, setForm] = useState({ fromAgentId: '', toAgentId: '', message: '', type: 'request' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.fromAgentId || !form.toAgentId || !form.message) return
    setSaving(true)
    await apiPost('/agents-platform/collaborate', form)
    await reload()
    setSaving(false)
    setForm({ fromAgentId: '', toAgentId: '', message: '', type: 'request' })
  }

  const COLLAB_COLORS: Record<string, string> = {
    request: 'bg-blue-100 text-blue-700', response: 'bg-green-100 text-green-700',
    delegation: 'bg-orange-100 text-orange-700', notification: 'bg-gray-100 text-gray-600',
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading collaborations...</div>

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">New Agent Collaboration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Agent</label>
            <select value={form.fromAgentId} onChange={e => setForm(f => ({ ...f, fromAgentId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">— select —</option>
              {agents.map(a => <option key={a.id} value={a.id}>{AGENT_ICONS[a.type]} {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Agent</label>
            <select value={form.toAgentId} onChange={e => setForm(f => ({ ...f, toAgentId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">— select —</option>
              {agents.filter(a => a.id !== form.fromAgentId).map(a => <option key={a.id} value={a.id}>{AGENT_ICONS[a.type]} {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['request', 'response', 'delegation', 'notification'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
            <input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="What does the agent need?" />
          </div>
        </div>
        <button onClick={save} disabled={!form.fromAgentId || !form.toAgentId || !form.message || saving} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Sending...' : '↔ Send Collaboration'}
        </button>
      </div>

      {collabs.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No collaborations yet.</div>
      ) : (
        <div className="space-y-2">
          {collabs.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{AGENT_ICONS[c.fromAgent?.type ?? ''] ?? '⚙️'}</span>
                  <span className="text-sm font-medium text-gray-800">{c.fromAgent?.name ?? c.fromAgentId.slice(0, 8)}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${COLLAB_COLORS[c.type] ?? 'bg-gray-100 text-gray-600'}`}>—{c.type}→</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{AGENT_ICONS[c.toAgent?.type ?? ''] ?? '⚙️'}</span>
                  <span className="text-sm font-medium text-gray-800">{c.toAgent?.name ?? c.toAgentId.slice(0, 8)}</span>
                </div>
                <span className="text-xs text-gray-400 ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 ml-1">{c.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Memory Tab ────────────────────────────────────────────────────────────────

function MemoryTab() {
  const { data: agentData } = useApi('/agents-platform/agents')
  const agents = (agentData ?? []) as Agent[]
  const [agentId, setAgentId] = useState('')
  const [memories, setMemories] = useState<{ id: string; key: string; value: string; importance: string; updatedAt: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ key: '', value: '', importance: 'medium' })
  const [saving, setSaving] = useState(false)

  const loadMemories = async (id: string) => {
    setLoading(true)
    const r = await fetch(`${API}?path=${encodeURIComponent(`/agents-platform/agents/${id}/memory`)}`)
    const json = await r.json()
    if (json.success) setMemories(json.data)
    setLoading(false)
  }

  const save = async () => {
    if (!agentId || !form.key || !form.value) return
    setSaving(true)
    await apiPost(`/agents-platform/agents/${agentId}/memory`, form)
    await loadMemories(agentId)
    setSaving(false)
    setForm({ key: '', value: '', importance: 'medium' })
  }

  const del = async (key: string) => {
    await apiDelete(`/agents-platform/agents/${agentId}/memory/${key}`)
    await loadMemories(agentId)
  }

  const IMP_COLORS: Record<string, string> = { low: 'bg-gray-100 text-gray-500', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Agent</label>
          <select value={agentId} onChange={e => { setAgentId(e.target.value); if (e.target.value) loadMemories(e.target.value) }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">— choose agent —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{AGENT_ICONS[a.type]} {a.name}</option>)}
          </select>
        </div>
      </div>

      {agentId && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Add Memory</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Memory key (e.g. last_customer)" />
            <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Memory value" />
            <select value={form.importance} onChange={e => setForm(f => ({ ...f, importance: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['low', 'medium', 'high', 'critical'].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <button onClick={save} disabled={!form.key || !form.value || saving} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : '+ Store Memory'}
          </button>
        </div>
      )}

      {loading && <div className="text-center py-10 text-gray-400">Loading memories...</div>}

      {!loading && agentId && (
        memories.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No memories stored for this agent yet.</div>
        ) : (
          <div className="space-y-2">
            {memories.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-indigo-700">{m.key}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${IMP_COLORS[m.importance] ?? 'bg-gray-100 text-gray-500'}`}>{m.importance}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{m.value}</p>
                  <span className="text-xs text-gray-400">{new Date(m.updatedAt).toLocaleString()}</span>
                </div>
                <button onClick={() => del(m.key)} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data: agentData, loading } = useApi('/agents-platform/agents')
  const agents = (agentData ?? []) as Agent[]
  const [selected, setSelected] = useState<Agent | null>(null)
  const [perf, setPerf] = useState<{ score: number; grade: string; completionRate: number; avgDurationMs: number; totalCost: number; strengths: string[]; improvements: string[] } | null>(null)
  const [kpis, setKpis] = useState<{ id: string; name: string; value: number; target: number | null; unit: string | null }[]>([])
  const [loadingAgent, setLoadingAgent] = useState(false)

  const loadAgent = async (agent: Agent) => {
    setSelected(agent)
    setLoadingAgent(true)
    const [perfRes, kpiRes] = await Promise.all([
      fetch(`${API}?path=${encodeURIComponent(`/agents-platform/agents/${agent.id}/performance`)}`).then(r => r.json()),
      fetch(`${API}?path=${encodeURIComponent(`/agents-platform/agents/${agent.id}/kpis`)}`).then(r => r.json()),
    ])
    if (perfRes.success) setPerf(perfRes.data)
    if (kpiRes.success) setKpis(kpiRes.data)
    setLoadingAgent(false)
  }

  const GRADE_COLORS: Record<string, string> = { A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-orange-600', F: 'text-red-600' }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading analytics...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-700">Select Agent</h3>
        {agents.map(a => (
          <button key={a.id} onClick={() => loadAgent(a)} className={`w-full text-left p-3 rounded-xl border transition-colors ${selected?.id === a.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{AGENT_ICONS[a.type] ?? '⚙️'}</span>
              <span className="font-medium text-gray-800 flex-1">{a.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loadingAgent && <div className="text-center py-10 text-gray-400">Loading performance data...</div>}

        {selected && perf && !loadingAgent && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${GRADE_COLORS[perf.grade] ?? 'text-gray-600'}`}>{perf.grade}</div>
                  <div className="text-xs text-gray-400">Grade</div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Score</span><span>{perf.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${perf.score}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-center text-gray-600">
                    <div><div className="font-bold text-gray-800">{perf.completionRate}%</div><div className="text-gray-400">Completion</div></div>
                    <div><div className="font-bold text-gray-800">{perf.avgDurationMs}ms</div><div className="text-gray-400">Avg Duration</div></div>
                    <div><div className="font-bold text-gray-800">${perf.totalCost.toFixed(3)}</div><div className="text-gray-400">Cost</div></div>
                  </div>
                </div>
              </div>
              {perf.strengths.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-green-600 font-medium mb-1">✓ Strengths</div>
                  {perf.strengths.map((s, i) => <div key={i} className="text-xs text-gray-600">• {s}</div>)}
                </div>
              )}
              {perf.improvements.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-orange-600 font-medium mb-1">↑ Improvements</div>
                  {perf.improvements.map((s, i) => <div key={i} className="text-xs text-gray-600">• {s}</div>)}
                </div>
              )}
            </div>

            {kpis.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h4 className="font-semibold text-gray-700 mb-3">KPIs</h4>
                <div className="space-y-3">
                  {kpis.map(k => {
                    const pct = k.target ? Math.min(100, (k.value / k.target) * 100) : null
                    return (
                      <div key={k.id}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{k.name}</span>
                          <span className="text-gray-800 font-medium">{k.value}{k.unit ?? ''}{k.target ? ` / ${k.target}${k.unit ?? ''}` : ''}</span>
                        </div>
                        {pct !== null && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {!selected && (
          <div className="text-center py-20 text-gray-400 text-sm">Select an agent to view performance analytics</div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'agents', label: 'Agents' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'collaborations', label: 'Collaborations' },
  { key: 'memory', label: 'Memory' },
  { key: 'analytics', label: 'Analytics' },
]

export default function AgentsPlatformPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setTab('tasks')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Enterprise Agents Platform</h1>
        <p className="text-sm text-gray-500 mt-1">Deploy specialist agents · Execute tasks · Agent-to-agent collaboration · Persistent memory · Performance analytics</p>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'marketplace' && <MarketplaceTab onDeploy={() => {}} />}
        {tab === 'agents' && <AgentsTab onSelectAgent={handleSelectAgent} />}
        {tab === 'tasks' && <TasksTab selectedAgent={selectedAgent} />}
        {tab === 'collaborations' && <CollaborationsTab />}
        {tab === 'memory' && <MemoryTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  )
}
