'use client'

import { useState, useEffect, useCallback } from 'react'
import { Brain, Activity, DollarSign, FlaskConical, ShieldCheck, GitBranch, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

const API = (path: string) => `/api/proxy?path=${encodeURIComponent(path)}`

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: any }> = {
    healthy: { cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
    degraded: { cls: 'bg-yellow-100 text-yellow-700', Icon: AlertTriangle },
    down: { cls: 'bg-red-100 text-red-700', Icon: XCircle },
    unknown: { cls: 'bg-gray-100 text-gray-600', Icon: Activity },
  }
  const { cls, Icon } = map[status] ?? map.unknown
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  )
}

const PROVIDER_COLORS: Record<string, string> = {
  reno_brain: 'bg-purple-100 text-purple-700',
  claude: 'bg-orange-100 text-orange-700',
  openai: 'bg-green-100 text-green-700',
  gemini: 'bg-blue-100 text-blue-700',
  azure_openai: 'bg-sky-100 text-sky-700',
  ollama: 'bg-gray-100 text-gray-700',
  custom: 'bg-pink-100 text-pink-700',
}

export default function LlmOpsPage() {
  const [tab, setTab] = useState<'dashboard' | 'providers' | 'requests' | 'policies' | 'experiments'>('dashboard')
  const [data, setData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (section: string) => {
    setLoading(true)
    try {
      const res = await fetch(API(`/v1/llmops/${section}`))
      const json = await res.json()
      setData(prev => ({ ...prev, [section]: json }))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'dashboard') load('dashboard')
    else if (tab === 'providers') load('providers')
    else if (tab === 'requests') { load('requests'); load('requests/stats') }
    else if (tab === 'policies') load('policies')
    else if (tab === 'experiments') load('experiments')
  }, [tab, load])

  const post = async (path: string, body: Record<string, any>, successMsg: string, status201 = false) => {
    const res = await fetch(API(`/v1/llmops/${path}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setMsg(successMsg); setShowForm(false); setForm({})
      if (tab === 'dashboard') load('dashboard')
      else if (tab === 'providers') load('providers')
      else if (tab === 'requests') { load('requests'); load('requests/stats') }
      else if (tab === 'policies') load('policies')
      else if (tab === 'experiments') load('experiments')
    } else {
      const err = await res.json()
      setMsg(`Error: ${err.message ?? JSON.stringify(err)}`)
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'providers', label: 'AI Providers', icon: Brain },
    { id: 'requests', label: 'Observability', icon: Activity },
    { id: 'policies', label: 'Policies', icon: ShieldCheck },
    { id: 'experiments', label: 'Experiment Lab', icon: FlaskConical },
  ] as const

  const summary = data.dashboard?.summary ?? {}
  const providers: any[] = data.providers ?? data.dashboard?.byProvider ?? []
  const requests: any[] = data.requests ?? []
  const stats = data['requests/stats'] ?? {}
  const policies: any[] = data.policies ?? []
  const experiments: any[] = data.experiments ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> LLMOps Platform
          </h1>
          <p className="text-sm text-muted-foreground">Enterprise AI Orchestration — manage, monitor and optimize all AI providers</p>
        </div>
        {msg && (
          <div className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
            {msg}
            <button onClick={() => setMsg('')} className="text-green-500">✕</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); setMsg('') }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            ><Icon className="w-4 h-4" />{t.label}</button>
          )
        })}
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">Loading...</div>}

      {/* Dashboard */}
      {tab === 'dashboard' && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="AI Providers" value={summary.totalProviders ?? 0} sub={`${summary.healthyProviders ?? 0} healthy`} />
            <StatCard label="Requests Today" value={summary.requestsToday ?? 0} sub={`${summary.requestsThisMonth ?? 0} this month`} color="text-blue-600" />
            <StatCard label="Cost This Month" value={`$${summary.totalCostMonth ?? 0}`} sub={`Saved ~$${summary.savingsFromRenoBrain ?? 0} via Reno Brain`} color="text-green-600" />
            <StatCard label="Active Policies" value={summary.activePolicies ?? 0} sub={`${summary.totalExperiments ?? 0} experiments run`} />
          </div>

          {/* Provider Health Grid */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Brain className="w-4 h-4" /> Provider Health Matrix</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data.dashboard?.byProvider ?? []).map((p: any) => (
                <div key={p.id ?? p.name} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[p.providerType] ?? 'bg-gray-100 text-gray-700'}`}>{p.providerType}</span>
                      <p className="font-medium text-sm mt-1">{p.name}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center mt-2">
                    <div><p className="text-xs text-muted-foreground">Requests</p><p className="text-sm font-bold">{p.requestCount ?? 0}</p></div>
                    <div><p className="text-xs text-muted-foreground">Success</p><p className="text-sm font-bold">{p.successRate ?? 100}%</p></div>
                    <div><p className="text-xs text-muted-foreground">Cost</p><p className="text-sm font-bold">${p.totalCostUsd ?? 0}</p></div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>AI Score</span><span>{p.score ?? '-'}</span></div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, (p.score ?? 0) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {(data.dashboard?.byProvider ?? []).length === 0 && (
                <div className="col-span-3 text-center py-6 text-muted-foreground">No providers registered. Add one in AI Providers tab.</div>
              )}
            </div>
          </div>

          {/* Recent Requests */}
          {(data.dashboard?.recentRequests ?? []).length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Recent AI Requests</h2>
              <div className="space-y-1">
                {data.dashboard.recentRequests.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PROVIDER_COLORS[r.providerType] ?? 'bg-gray-100 text-gray-700'}`}>{r.providerType}</span>
                      <span className="font-medium">{r.module}</span>
                      <span className="text-muted-foreground">{r.taskType}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{r.latencyMs}ms</span>
                      <span>${r.costUsd}</span>
                      {r.success ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Providers */}
      {tab === 'providers' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{providers.length} providers configured</p>
            <div className="flex gap-2">
              <button onClick={() => { load('providers') }} className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-muted flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
              <button onClick={() => setShowForm(!showForm)} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg">+ Add Provider</button>
            </div>
          </div>

          {showForm && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Register AI Provider</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'name', label: 'Display Name', placeholder: 'Reno Brain' },
                  { key: 'providerType', label: 'Provider Type', placeholder: 'reno_brain | claude | openai | gemini | azure_openai | ollama | custom' },
                  { key: 'baseUrl', label: 'Base URL (opt)', placeholder: 'https://api.openai.com' },
                  { key: 'defaultModel', label: 'Default Model (opt)', placeholder: 'claude-sonnet-4-6' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background mt-1"
                      placeholder={f.placeholder} value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isPrimary === 'true'} onChange={e => setForm(p => ({ ...p, isPrimary: e.target.checked ? 'true' : 'false' }))} />
                  Mark as Primary
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={() => post('providers', { name: form.name, providerType: form.providerType, baseUrl: form.baseUrl || undefined, defaultModel: form.defaultModel || undefined, isPrimary: form.isPrimary === 'true' }, 'Provider added')}
                  className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg">Save</button>
                <button onClick={() => setShowForm(false)} className="text-sm border border-border px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {providers.map((p: any) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[p.providerType] ?? 'bg-gray-100 text-gray-700'}`}>{p.providerType}</span>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      {p.defaultModel && <p className="text-xs text-muted-foreground">{p.defaultModel}</p>}
                    </div>
                    {p.isPrimary && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">PRIMARY</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={p.status} />
                    <button onClick={async () => {
                      const res = await fetch(API(`/v1/llmops/providers/${p.id}/health-check`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
                      const j = await res.json()
                      setMsg(`${p.name}: ${j.status} (${j.latencyMs}ms) — ${j.message}`)
                      load('providers')
                    }} className="text-xs border border-border px-3 py-1 rounded hover:bg-muted">Health Check</button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div className="bg-muted/30 rounded p-2 text-center"><p className="text-xs text-muted-foreground">Requests</p><p className="font-bold text-sm">{p.requestCount}</p></div>
                  <div className="bg-muted/30 rounded p-2 text-center"><p className="text-xs text-muted-foreground">Success</p><p className="font-bold text-sm">{p.requestCount > 0 ? Math.round((p.successCount / p.requestCount) * 100) : 100}%</p></div>
                  <div className="bg-muted/30 rounded p-2 text-center"><p className="text-xs text-muted-foreground">Avg Latency</p><p className="font-bold text-sm">{Math.round(p.avgLatencyMs)}ms</p></div>
                  <div className="bg-muted/30 rounded p-2 text-center"><p className="text-xs text-muted-foreground">Total Cost</p><p className="font-bold text-sm">${Math.round(p.totalCostUsd * 10000) / 10000}</p></div>
                </div>
              </div>
            ))}
            {providers.length === 0 && <p className="text-center text-muted-foreground py-8">No AI providers yet. Add Reno Brain as your first provider.</p>}
          </div>
        </div>
      )}

      {/* Observability */}
      {tab === 'requests' && !loading && (
        <div className="space-y-4">
          {/* Stats */}
          {stats.byProvider?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" /> This Month — Cost by Provider</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.byProvider?.map((b: any) => (
                  <div key={b.provider} className="bg-muted/30 rounded-lg p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[b.provider] ?? 'bg-gray-100 text-gray-700'}`}>{b.provider}</span>
                    <p className="text-xl font-bold mt-2">${b.costUsd}</p>
                    <p className="text-xs text-muted-foreground">{b.count} requests</p>
                    <p className="text-xs text-muted-foreground">{Math.round(b.successRate * 100)}% success</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Log */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Recent Requests</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-muted-foreground font-medium">Provider</th>
                    <th className="pb-2 text-muted-foreground font-medium">Module</th>
                    <th className="pb-2 text-muted-foreground font-medium">Task</th>
                    <th className="pb-2 text-muted-foreground font-medium">Latency</th>
                    <th className="pb-2 text-muted-foreground font-medium">Cost</th>
                    <th className="pb-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[r.provider?.providerType] ?? 'bg-gray-100 text-gray-700'}`}>{r.provider?.name ?? r.provider?.providerType}</span></td>
                      <td className="py-2">{r.module}</td>
                      <td className="py-2 text-muted-foreground">{r.taskType}</td>
                      <td className="py-2">{r.latencyMs}ms</td>
                      <td className="py-2">${r.costUsd}</td>
                      <td className="py-2">{r.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.length === 0 && <p className="text-center text-muted-foreground py-6">No requests logged yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Policies */}
      {tab === 'policies' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{policies.length} AI policies configured</p>
            <button onClick={() => setShowForm(!showForm)} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg">+ Add Policy</button>
          </div>

          {showForm && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">AI Policy Engine</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'module', label: 'Module', placeholder: 'finance | legal | hr | marketing | * (all)' },
                  { key: 'preferredProvider', label: 'Preferred Provider', placeholder: 'reno_brain | claude | openai | gemini' },
                  { key: 'allowedProviders', label: 'Allowed (comma-sep)', placeholder: 'reno_brain,claude' },
                  { key: 'fallbackOrder', label: 'Fallback Order (comma-sep)', placeholder: 'claude,openai,reno_brain' },
                  { key: 'maxCostPerRequest', label: 'Max Cost/Request ($)', placeholder: '0.05' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background mt-1"
                      placeholder={f.placeholder} value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => post('policies', {
                  module: form.module,
                  preferredProvider: form.preferredProvider || undefined,
                  allowedProviders: form.allowedProviders ? form.allowedProviders.split(',').map(s => s.trim()) : [],
                  fallbackOrder: form.fallbackOrder ? form.fallbackOrder.split(',').map(s => s.trim()) : [],
                  maxCostPerRequest: form.maxCostPerRequest ? +form.maxCostPerRequest : undefined,
                }, 'Policy saved')} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg">Save</button>
                <button onClick={() => setShowForm(false)} className="text-sm border border-border px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {policies.map((p: any) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Module: <span className="font-mono text-primary">{p.module}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {p.preferredProvider && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Preferred: {p.preferredProvider}</span>}
                      {(p.allowedProviders as string[])?.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Allowed: {(p.allowedProviders as string[]).join(', ')}</span>}
                      {(p.fallbackOrder as string[])?.length > 0 && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Fallback: {(p.fallbackOrder as string[]).join(' → ')}</span>}
                      {p.maxCostPerRequest && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Max: ${p.maxCostPerRequest}/req</span>}
                      {p.requiresApproval && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Approval Required</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
            {policies.length === 0 && <p className="text-center text-muted-foreground py-8">No policies yet. Create one to control which AI providers each module uses.</p>}
          </div>
        </div>
      )}

      {/* Experiment Lab */}
      {tab === 'experiments' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{experiments.length} experiments</p>
            <button onClick={() => setShowForm(!showForm)} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"><FlaskConical className="w-4 h-4" /> New Experiment</button>
          </div>

          {showForm && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><FlaskConical className="w-4 h-4" /> AI Provider Experiment</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'name', label: 'Experiment Name', placeholder: 'Contract Analysis Benchmark' },
                  { key: 'taskType', label: 'Task Type', placeholder: 'analyze | generate | summarize | classify' },
                  { key: 'sampleCount', label: 'Sample Count', placeholder: '20' },
                  { key: 'providers', label: 'Providers (comma-sep)', placeholder: 'reno_brain,claude,openai,gemini' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background mt-1"
                      placeholder={f.placeholder} value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Sample Prompt</label>
                  <textarea className="w-full border border-border rounded px-3 py-1.5 text-sm bg-background mt-1 h-20"
                    placeholder="Analyze the following contract for risk factors..."
                    value={form.samplePrompt ?? ''}
                    onChange={e => setForm(p => ({ ...p, samplePrompt: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => post('experiments', {
                  name: form.name, taskType: form.taskType,
                  sampleCount: form.sampleCount ? +form.sampleCount : 10,
                  providers: form.providers ? form.providers.split(',').map(s => s.trim()) : ['reno_brain'],
                  samplePrompt: form.samplePrompt || 'Sample AI task',
                }, 'Experiment created')} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg">Create</button>
                <button onClick={() => setShowForm(false)} className="text-sm border border-border px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {experiments.map((exp: any) => (
              <div key={exp.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{exp.name}</h3>
                    <p className="text-xs text-muted-foreground">Task: {exp.taskType} • {exp.sampleCount} samples • Providers: {(exp.providers as string[]).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exp.status === 'completed' ? 'bg-green-100 text-green-700' : exp.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{exp.status}</span>
                    {exp.status === 'pending' && (
                      <button onClick={async () => {
                        const res = await fetch(API(`/v1/llmops/experiments/${exp.id}/run`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
                        if (res.ok) { setMsg('Experiment completed'); load('experiments') }
                      }} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Run</button>
                    )}
                  </div>
                </div>

                {exp.results?.length > 0 && (
                  <div className="space-y-2">
                    {exp.results.map((r: any) => (
                      <div key={r.id} className={`p-3 rounded-lg ${r.rank === 1 ? 'bg-green-50 border border-green-200' : 'bg-muted/30'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${r.rank === 1 ? 'text-green-700' : 'text-muted-foreground'}`}>#{r.rank}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[r.provider] ?? 'bg-gray-100 text-gray-700'}`}>{r.provider}</span>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Accuracy: <strong>{r.accuracyScore ? Math.round(r.accuracyScore * 100) : '—'}%</strong></span>
                            <span>Latency: <strong>{Math.round(r.avgLatencyMs)}ms</strong></span>
                            <span>Cost: <strong>${r.avgCostUsd}/run</strong></span>
                            <span>Success: <strong>{Math.round(r.successRate * 100)}%</strong></span>
                          </div>
                        </div>
                        {r.aiRecommendation && <p className="text-xs text-green-700 mt-1 font-medium">✓ {r.aiRecommendation}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {exp.recommendation && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-xs text-blue-700 font-medium">AI Recommendation: {exp.recommendation}</p>
                  </div>
                )}
              </div>
            ))}
            {experiments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No experiments yet. Run an experiment to compare AI providers side-by-side.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
