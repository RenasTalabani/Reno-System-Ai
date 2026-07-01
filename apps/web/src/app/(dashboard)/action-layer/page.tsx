'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Proxy helpers ─────────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  summary: string
  stats: { totalTools: number; activeTools: number; totalExecutions: number; successfulExecutions: number; totalCost: number; mcpServers: number }
  recentExecutions: Execution[]
  topTools: Tool[]
}
interface Tool { id: string; name: string; slug: string; category: string; provider: string; status: string; isSystem: boolean; totalCalls: number; totalCost: number; avgDurationMs?: number; description?: string; schema?: unknown; _count?: { executions: number; policies: number } }
interface CatalogTool { slug: string; name: string; description: string; category: string; provider: string; version: string }
interface Policy { id: string; toolId: string; name: string; subjectType: string; subjectId?: string; action: string; rateLimit?: number; priority: number; isActive: boolean; tool?: { name: string; slug: string } }
interface Execution { id: string; toolId: string; status: string; cost: number; durationMs?: number; createdAt: string; tool?: { name: string; category: string }; output?: unknown }
interface McpServer { id: string; name: string; slug: string; endpoint: string; protocol: string; status: string; healthScore?: number; lastCheckedAt?: string }

const TABS = ['Dashboard', 'Catalog', 'Tools', 'Execute', 'Policies', 'Executions', 'MCP Servers'] as const
type Tab = typeof TABS[number]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-700', deprecated: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700', running: 'bg-blue-100 text-blue-700', pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700', blocked: 'bg-red-100 text-red-700', healthy: 'bg-green-100 text-green-700',
  degraded: 'bg-yellow-100 text-yellow-700', critical: 'bg-red-100 text-red-700',
}

const ACTION_COLORS: Record<string, string> = {
  allow: 'bg-green-100 text-green-700', deny: 'bg-red-100 text-red-700', require_approval: 'bg-yellow-100 text-yellow-700',
}

const CATEGORY_ICONS: Record<string, string> = {
  crm: '👥', hr: '🧑‍💼', finance: '💰', communication: '📧', calendar: '📅', document: '📄',
  search: '🔍', analytics: '📊', integration: '🔗', knowledge: '🧠', security: '🔒', custom: '⚙️',
}

export default function ActionLayerPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [catalog, setCatalog] = useState<CatalogTool[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [mcpServers, setMcpServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [executeInput, setExecuteInput] = useState('{}')
  const [executeResult, setExecuteResult] = useState<unknown>(null)
  const [executing, setExecuting] = useState(false)
  const [showToolForm, setShowToolForm] = useState(false)
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [showMcpForm, setShowMcpForm] = useState(false)

  const [toolForm, setToolForm] = useState({ name: '', slug: '', category: 'custom', provider: 'local', endpoint: '', description: '' })
  const [policyForm, setPolicyForm] = useState({ toolId: '', name: '', subjectType: 'all', subjectId: '', action: 'allow', rateLimit: '', priority: '0' })
  const [mcpForm, setMcpForm] = useState({ name: '', slug: '', endpoint: '', protocol: 'http', authType: 'none', description: '' })
  const [detectTask, setDetectTask] = useState('')
  const [detectedTools, setDetectedTools] = useState<{ slug: string; name: string; category: string; confidence: number; reason: string }[]>([])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/action-layer/dashboard'); setDashboard(d) }, [])
  const loadCatalog = useCallback(async () => { const d = await apiGet('/v1/action-layer/catalog'); setCatalog(d.tools ?? []) }, [])
  const loadTools = useCallback(async () => { const d = await apiGet('/v1/action-layer/tools'); setTools(d.tools ?? []) }, [])
  const loadPolicies = useCallback(async () => { const d = await apiGet('/v1/action-layer/policies'); setPolicies(d.policies ?? []) }, [])
  const loadExecutions = useCallback(async () => { const d = await apiGet('/v1/action-layer/executions'); setExecutions(d.executions ?? []) }, [])
  const loadMcp = useCallback(async () => { const d = await apiGet('/v1/action-layer/mcp-servers'); setMcpServers(d.servers ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard,
      Catalog: loadCatalog,
      Tools: loadTools,
      Execute: loadTools,
      Policies: async () => { await Promise.all([loadPolicies(), loadTools()]) },
      Executions: loadExecutions,
      'MCP Servers': loadMcp,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadCatalog, loadTools, loadPolicies, loadExecutions, loadMcp])

  const installTool = async (slug: string) => {
    setLoading(true)
    const r = await apiPost('/v1/action-layer/catalog/install', { slug })
    if (r.error) flash(r.error); else { flash(`Installed: ${r.name}`); await loadTools() }
    setLoading(false)
  }

  const createTool = async () => {
    const r = await apiPost('/v1/action-layer/tools', toolForm)
    if (r.error) flash(r.error); else { flash('Tool created'); setShowToolForm(false); setToolForm({ name: '', slug: '', category: 'custom', provider: 'local', endpoint: '', description: '' }); await loadTools() }
  }

  const deleteTool = async (id: string) => {
    const r = await apiDelete(`/v1/action-layer/tools/${id}`)
    if (r.error) flash(r.error); else { flash('Tool deleted'); await loadTools() }
  }

  const toggleTool = async (t: Tool) => {
    const r = await apiPatch(`/v1/action-layer/tools/${t.id}`, { status: t.status === 'active' ? 'inactive' : 'active' })
    if (r.error) flash(r.error); else await loadTools()
  }

  const executeTool = async () => {
    if (!selectedTool) return
    setExecuting(true); setExecuteResult(null)
    let input: Record<string, unknown> = {}
    try { input = JSON.parse(executeInput) } catch { flash('Invalid JSON input'); setExecuting(false); return }
    const r = await apiPost(`/v1/action-layer/tools/${selectedTool.id}/execute`, { input })
    setExecuteResult(r)
    setExecuting(false)
    await loadExecutions()
  }

  const detectTools = async () => {
    if (!detectTask.trim()) return
    const r = await apiPost('/v1/action-layer/detect-tools', { taskTitle: detectTask })
    setDetectedTools(r.detectedTools ?? [])
  }

  const createPolicy = async () => {
    const r = await apiPost('/v1/action-layer/policies', {
      ...policyForm,
      rateLimit: policyForm.rateLimit ? parseInt(policyForm.rateLimit) : undefined,
      priority: parseInt(policyForm.priority),
      subjectId: policyForm.subjectId || undefined,
    })
    if (r.error) flash(r.error); else { flash('Policy created'); setShowPolicyForm(false); setPolicyForm({ toolId: '', name: '', subjectType: 'all', subjectId: '', action: 'allow', rateLimit: '', priority: '0' }); await loadPolicies() }
  }

  const togglePolicy = async (p: Policy) => {
    await apiPatch(`/v1/action-layer/policies/${p.id}`, { isActive: !p.isActive })
    await loadPolicies()
  }

  const deletePolicy = async (id: string) => {
    await apiDelete(`/v1/action-layer/policies/${id}`)
    await loadPolicies()
  }

  const createMcp = async () => {
    const r = await apiPost('/v1/action-layer/mcp-servers', mcpForm)
    if (r.error) flash(r.error); else { flash('MCP Server added'); setShowMcpForm(false); setMcpForm({ name: '', slug: '', endpoint: '', protocol: 'http', authType: 'none', description: '' }); await loadMcp() }
  }

  const syncMcp = async (id: string) => {
    const r = await apiPost(`/v1/action-layer/mcp-servers/${id}/sync`)
    flash(`Synced — ${r.toolsDiscovered ?? 0} tools discovered`)
    await loadMcp()
  }

  const deleteMcp = async (id: string) => {
    await apiDelete(`/v1/action-layer/mcp-servers/${id}`)
    await loadMcp()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Universal Action Layer</h1>
        <p className="text-gray-500 text-sm mt-1">Tool Registry · Execution Policies · MCP Protocol · Full Audit</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* ── Dashboard ─────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
            <p className="text-lg font-medium">{dashboard.summary}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Tools', value: dashboard.stats.totalTools },
              { label: 'Active Tools', value: dashboard.stats.activeTools },
              { label: 'Total Executions', value: dashboard.stats.totalExecutions },
              { label: 'Successful', value: dashboard.stats.successfulExecutions },
              { label: 'MCP Servers', value: dashboard.stats.mcpServers },
              { label: 'Total Cost', value: `$${dashboard.stats.totalCost.toFixed(3)}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Top Tools by Usage</h3>
              {dashboard.topTools.length === 0 ? (
                <p className="text-gray-400 text-sm">No tools used yet. Install from Catalog.</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.topTools.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[t.category] ?? '⚙️'}</span>
                        <span className="text-sm font-medium">{t.name}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{t.totalCalls} calls</span>
                        <span>{t.avgDurationMs ?? 0}ms</span>
                        <span>${t.totalCost.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Recent Executions</h3>
              {dashboard.recentExecutions.length === 0 ? (
                <p className="text-gray-400 text-sm">No executions yet.</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.recentExecutions.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[e.tool?.category ?? 'custom'] ?? '⚙️'}</span>
                        <span className="text-sm">{e.tool?.name ?? 'Unknown'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                        <span className="text-xs text-gray-400">${e.cost.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Catalog ───────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Catalog' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Install system tools to your tenant. Installed tools appear in the Tools tab.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map(t => {
              const installed = tools.some(ti => ti.slug === t.slug)
              return (
                <div key={t.slug} className="bg-white rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{CATEGORY_ICONS[t.category] ?? '⚙️'}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                        <div className="text-xs text-gray-400">v{t.version} · {t.provider}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{t.category}</span>
                  </div>
                  <p className="text-xs text-gray-500">{t.description}</p>
                  <button
                    onClick={() => !installed && installTool(t.slug)}
                    className={`w-full py-1.5 rounded-lg text-sm font-medium transition-colors ${installed ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {installed ? 'Installed' : 'Install'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tools ─────────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Tools' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{tools.length} tools registered</p>
            <button onClick={() => setShowToolForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Custom Tool</button>
          </div>

          {showToolForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Register Custom Tool</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Tool name" value={toolForm.name} onChange={e => setToolForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug (e.g. my_tool)" value={toolForm.slug} onChange={e => setToolForm(f => ({ ...f, slug: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={toolForm.category} onChange={e => setToolForm(f => ({ ...f, category: e.target.value }))}>
                  {['crm','hr','finance','communication','calendar','document','search','analytics','integration','knowledge','security','custom'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={toolForm.provider} onChange={e => setToolForm(f => ({ ...f, provider: e.target.value }))}>
                  {['local','mcp','rest_api','agent','function'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Endpoint URL (optional)" value={toolForm.endpoint} onChange={e => setToolForm(f => ({ ...f, endpoint: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={toolForm.description} onChange={e => setToolForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createTool} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Create</button>
                <button onClick={() => setShowToolForm(false)} className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Tool', 'Category', 'Provider', 'Calls', 'Avg Duration', 'Cost', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tools.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[t.category] ?? '⚙️'}</span>
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-gray-400">{t.slug} {t.isSystem && <span className="ml-1 text-purple-500">·system</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">{t.category}</span></td>
                    <td className="px-4 py-3 text-gray-500">{t.provider}</td>
                    <td className="px-4 py-3">{t.totalCalls}</td>
                    <td className="px-4 py-3">{t.avgDurationMs ? `${t.avgDurationMs}ms` : '—'}</td>
                    <td className="px-4 py-3">${t.totalCost.toFixed(4)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>{t.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setSelectedTool(t); setTab('Execute') }} className="text-blue-600 hover:underline text-xs">Execute</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleTool(t)} className="text-gray-500 hover:underline text-xs">{t.status === 'active' ? 'Disable' : 'Enable'}</button>
                        {!t.isSystem && <><span className="text-gray-300">|</span><button onClick={() => deleteTool(t.id)} className="text-red-500 hover:underline text-xs">Del</button></>}
                      </div>
                    </td>
                  </tr>
                ))}
                {tools.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No tools yet. Install from Catalog tab.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Execute ───────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Execute' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold mb-3">Select Tool</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tools.filter(t => t.status === 'active').map(t => (
                    <button key={t.id} onClick={() => { setSelectedTool(t); setExecuteInput('{}') }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${selectedTool?.id === t.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[t.category] ?? '⚙️'}</span>
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{t.category}</span>
                      </div>
                    </button>
                  ))}
                  {tools.filter(t => t.status === 'active').length === 0 && <p className="text-gray-400 text-sm">No active tools.</p>}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold mb-2">Detect Tools for Task</h3>
                <div className="flex gap-2">
                  <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Describe a task..." value={detectTask} onChange={e => setDetectTask(e.target.value)} />
                  <button onClick={detectTools} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700">Detect</button>
                </div>
                {detectedTools.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {detectedTools.map(d => (
                      <div key={d.slug} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[d.category] ?? '⚙️'}</span>
                          <span>{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{d.confidence}% confidence</span>
                          <button onClick={() => { const t = tools.find(ti => ti.slug === d.slug); if (t) setSelectedTool(t) }} className="text-blue-600 hover:underline">Select</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {selectedTool ? (
                <>
                  <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{CATEGORY_ICONS[selectedTool.category] ?? '⚙️'}</span>
                      <div>
                        <h3 className="font-semibold">{selectedTool.name}</h3>
                        <p className="text-xs text-gray-400">{selectedTool.slug} · {selectedTool.provider}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{selectedTool.description}</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 font-medium mb-1">SCHEMA</p>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-32">{JSON.stringify(selectedTool.schema, null, 2)}</pre>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-semibold mb-2">Input (JSON)</h3>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm font-mono h-32" value={executeInput} onChange={e => setExecuteInput(e.target.value)} />
                    <button onClick={executeTool} disabled={executing} className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                      {executing ? 'Executing...' : 'Execute Tool'}
                    </button>
                  </div>
                  {executeResult && (
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="font-semibold mb-2">Result</h3>
                      <pre className="text-xs font-mono bg-gray-50 rounded-lg p-3 overflow-auto max-h-48">{JSON.stringify(executeResult, null, 2)}</pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                  <p className="text-lg mb-2">🔧</p>
                  <p>Select a tool to execute</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Policies ──────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Policies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Execution policies control who can call each tool</p>
            <button onClick={() => setShowPolicyForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Add Policy</button>
          </div>

          {showPolicyForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">New Execution Policy</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <select className="border rounded-lg px-3 py-2 text-sm" value={policyForm.toolId} onChange={e => setPolicyForm(f => ({ ...f, toolId: e.target.value }))}>
                  <option value="">Select tool...</option>
                  {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Policy name" value={policyForm.name} onChange={e => setPolicyForm(f => ({ ...f, name: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={policyForm.subjectType} onChange={e => setPolicyForm(f => ({ ...f, subjectType: e.target.value }))}>
                  {['all','user','agent','role'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Subject ID (optional)" value={policyForm.subjectId} onChange={e => setPolicyForm(f => ({ ...f, subjectId: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={policyForm.action} onChange={e => setPolicyForm(f => ({ ...f, action: e.target.value }))}>
                  {['allow','deny','require_approval'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Rate limit" value={policyForm.rateLimit} onChange={e => setPolicyForm(f => ({ ...f, rateLimit: e.target.value }))} />
                  <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Priority" value={policyForm.priority} onChange={e => setPolicyForm(f => ({ ...f, priority: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createPolicy} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Create</button>
                <button onClick={() => setShowPolicyForm(false)} className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Policy', 'Tool', 'Subject', 'Action', 'Rate Limit', 'Priority', 'Active', 'Del'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {policies.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.tool?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{p.subjectType}{p.subjectId ? `:${p.subjectId.slice(0,8)}` : ''}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${ACTION_COLORS[p.action] ?? 'bg-gray-100 text-gray-600'}`}>{p.action}</span></td>
                    <td className="px-4 py-3">{p.rateLimit ?? '—'}</td>
                    <td className="px-4 py-3">{p.priority}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePolicy(p)} className={`w-10 h-5 rounded-full transition-colors ${p.isActive ? 'bg-green-400' : 'bg-gray-200'}`} />
                    </td>
                    <td className="px-4 py-3"><button onClick={() => deletePolicy(p.id)} className="text-red-500 hover:text-red-700 text-xs">Del</button></td>
                  </tr>
                ))}
                {policies.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No policies. Default: all calls allowed.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Executions ────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Executions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Tool', 'Status', 'Duration', 'Cost', 'Policy', 'Time'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executions.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[e.tool?.category ?? 'custom'] ?? '⚙️'}</span>
                        <span className="font-medium">{e.tool?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                    <td className="px-4 py-3">{e.durationMs ? `${e.durationMs}ms` : '—'}</td>
                    <td className="px-4 py-3">${e.cost.toFixed(5)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {executions.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No executions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MCP Servers ───────────────────────────────────────────────────────── */}
      {!loading && tab === 'MCP Servers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Register external MCP-compatible tool servers</p>
            <button onClick={() => setShowMcpForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Add MCP Server</button>
          </div>

          {showMcpForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Register MCP Server</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Server name" value={mcpForm.name} onChange={e => setMcpForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug (e.g. my-mcp)" value={mcpForm.slug} onChange={e => setMcpForm(f => ({ ...f, slug: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Endpoint URL (e.g. https://mcp.example.com)" value={mcpForm.endpoint} onChange={e => setMcpForm(f => ({ ...f, endpoint: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={mcpForm.protocol} onChange={e => setMcpForm(f => ({ ...f, protocol: e.target.value }))}>
                  {['http','https','ws','wss'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={mcpForm.authType} onChange={e => setMcpForm(f => ({ ...f, authType: e.target.value }))}>
                  {['none','api_key','bearer','oauth2'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={mcpForm.description} onChange={e => setMcpForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createMcp} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add Server</button>
                <button onClick={() => setShowMcpForm(false)} className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mcpServers.map(s => (
              <div key={s.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.endpoint}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{s.protocol}</span>
                  {s.healthScore !== undefined && (
                    <span className={`font-medium ${s.healthScore >= 85 ? 'text-green-600' : s.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      Health: {s.healthScore}%
                    </span>
                  )}
                </div>
                {s.lastCheckedAt && <div className="text-xs text-gray-400">Last synced: {new Date(s.lastCheckedAt).toLocaleString()}</div>}
                <div className="flex gap-2">
                  <button onClick={() => syncMcp(s.id)} className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded-lg text-sm hover:bg-indigo-100">Sync Manifest</button>
                  <button onClick={() => deleteMcp(s.id)} className="bg-red-50 text-red-600 py-1.5 px-3 rounded-lg text-sm hover:bg-red-100">Del</button>
                </div>
              </div>
            ))}
            {mcpServers.length === 0 && (
              <div className="md:col-span-3 bg-white rounded-xl border p-8 text-center text-gray-400">
                <p className="text-2xl mb-2">🔌</p>
                <p>No MCP servers registered yet</p>
                <p className="text-xs mt-1">Add an external MCP-compatible tool server to extend the Action Layer</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
