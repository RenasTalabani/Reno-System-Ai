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

interface Runtime { id: string; name: string; slug: string; status: string; totalEventsProcessed: number; totalJobsRun: number; uptimeSeconds: number; maxConcurrentAgents: number; maxCostPerDay?: number }
interface AosEvent { id: string; channel: string; sourceType: string; priority: string; status: string; createdAt: string; payload?: unknown }
interface Job { id: string; name: string; slug: string; jobType: string; handler: string; schedule?: string; scheduleDescription?: string; status: string; totalRuns: number; failedRuns: number; nextRunAt?: string; lastRunAt?: string; _count?: { executions: number } }
interface JobTemplate { name: string; slug: string; jobType: string; description: string; defaultSchedule?: string }
interface Hook { id: string; name: string; hookType: string; handler: string; handlerType: string; isActive: boolean; priority: number; totalFired: number; lastFiredAt?: string }
interface ResourceUsage { id: string; period: string; periodAt: string; toolCallsTotal: number; agentTasksTotal: number; eventsPublished: number; jobsExecuted: number; totalCost: number; budgetUsedPct?: number; alerts: unknown[] }
interface DashboardData { summary: string; runtime?: Runtime; stats: { totalEvents: number; pendingEvents: number; activeJobs: number; totalJobs: number; activeHooks: number; latestCost: number }; channelStats: { channel: string; count: number }[]; recentEvents: AosEvent[]; latestUsage?: ResourceUsage }

const TABS = ['Dashboard', 'Runtime', 'Event Bus', 'Jobs', 'Hooks', 'Resources'] as const
type Tab = typeof TABS[number]

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700',
  stopped: 'bg-gray-100 text-gray-600', error: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700', disabled: 'bg-gray-100 text-gray-500',
  published: 'bg-blue-100 text-blue-700', consumed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
}
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500', normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
}

export default function AosPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [runtimes, setRuntimes] = useState<Runtime[]>([])
  const [events, setEvents] = useState<AosEvent[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [templates, setTemplates] = useState<JobTemplate[]>([])
  const [hooks, setHooks] = useState<Hook[]>([])
  const [resources, setResources] = useState<ResourceUsage[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showRuntimeForm, setShowRuntimeForm] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)
  const [showHookForm, setShowHookForm] = useState(false)
  const [showPublishForm, setShowPublishForm] = useState(false)
  const [runtimeForm, setRuntimeForm] = useState({ name: '', slug: '', maxConcurrentAgents: '10', maxCostPerDay: '', description: '' })
  const [jobForm, setJobForm] = useState({ name: '', slug: '', jobType: 'manual', handler: '', schedule: '' })
  const [hookForm, setHookForm] = useState({ name: '', slug: '', hookType: 'post_tool_execution', handler: '', handlerType: 'internal', priority: '0' })
  const [publishForm, setPublishForm] = useState({ channel: 'tool.executed', sourceType: 'user', payload: '{}' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/aos/dashboard'); setDashboard(d) }, [])
  const loadRuntimes = useCallback(async () => { const d = await apiGet('/v1/aos/runtime'); setRuntimes(d.runtimes ?? []) }, [])
  const loadEvents = useCallback(async () => { const d = await apiGet('/v1/aos/events'); setEvents(d.events ?? []) }, [])
  const loadChannels = useCallback(async () => { const d = await apiGet('/v1/aos/events/channels'); setChannels(d.channels ?? []) }, [])
  const loadJobs = useCallback(async () => { const d = await apiGet('/v1/aos/jobs'); setJobs(d.jobs ?? []) }, [])
  const loadTemplates = useCallback(async () => { const d = await apiGet('/v1/aos/job-templates'); setTemplates(d.templates ?? []) }, [])
  const loadHooks = useCallback(async () => { const d = await apiGet('/v1/aos/hooks'); setHooks(d.hooks ?? []) }, [])
  const loadResources = useCallback(async () => { const d = await apiGet('/v1/aos/resource-usage'); setResources(d.usage ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard,
      Runtime: loadRuntimes,
      'Event Bus': async () => { await Promise.all([loadEvents(), loadChannels()]) },
      Jobs: async () => { await Promise.all([loadJobs(), loadTemplates()]) },
      Hooks: loadHooks,
      Resources: loadResources,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadRuntimes, loadEvents, loadChannels, loadJobs, loadTemplates, loadHooks, loadResources])

  const createRuntime = async () => {
    const r = await apiPost('/v1/aos/runtime', { ...runtimeForm, maxConcurrentAgents: parseInt(runtimeForm.maxConcurrentAgents), maxCostPerDay: runtimeForm.maxCostPerDay ? parseFloat(runtimeForm.maxCostPerDay) : undefined })
    if (r.error) flash(r.error); else { flash('Runtime created'); setShowRuntimeForm(false); await loadRuntimes() }
  }

  const updateRuntime = async (id: string, status: string) => {
    await apiPatch(`/v1/aos/runtime/${id}`, { status })
    flash(`Runtime ${status}`); await loadRuntimes()
  }

  const publishEvent = async () => {
    let payload: Record<string, unknown> = {}
    try { payload = JSON.parse(publishForm.payload) } catch { flash('Invalid JSON payload'); return }
    const r = await apiPost('/v1/aos/events/publish', { channel: publishForm.channel, sourceType: publishForm.sourceType, payload })
    flash(`Event published — ${r.hooksFired ?? 0} hook(s) fired`); setShowPublishForm(false); await loadEvents()
  }

  const consumeEvent = async (id: string) => {
    await apiPost(`/v1/aos/events/${id}/consume`)
    flash('Event consumed'); await loadEvents()
  }

  const installTemplate = async (slug: string) => {
    const r = await apiPost('/v1/aos/job-templates/install', { slug })
    if (r.error) flash(r.error); else { flash(`Installed: ${r.name}`); await loadJobs() }
  }

  const createJob = async () => {
    const r = await apiPost('/v1/aos/jobs', jobForm)
    if (r.error) flash(r.error); else { flash('Job created'); setShowJobForm(false); await loadJobs() }
  }

  const runJob = async (id: string) => {
    const r = await apiPost(`/v1/aos/jobs/${id}/run`)
    flash(`Job ran — ${r.output?.success ? 'success' : 'failed'} (${r.durationMs}ms)`); await loadJobs()
  }

  const toggleJob = async (j: Job) => {
    await apiPatch(`/v1/aos/jobs/${j.id}`, { status: j.status === 'active' ? 'paused' : 'active' })
    await loadJobs()
  }

  const deleteJob = async (id: string) => {
    await apiDelete(`/v1/aos/jobs/${id}`); await loadJobs()
  }

  const createHook = async () => {
    const r = await apiPost('/v1/aos/hooks', { ...hookForm, priority: parseInt(hookForm.priority) })
    if (r.error) flash(r.error); else { flash('Hook created'); setShowHookForm(false); await loadHooks() }
  }

  const testHook = async (id: string) => {
    const r = await apiPost(`/v1/aos/hooks/${id}/test`, { payload: { test: true } })
    flash(`Hook test: ${r.fired ? 'fired ✅' : 'not fired (conditions not met)'}`)
  }

  const toggleHook = async (h: Hook) => {
    await apiPatch(`/v1/aos/hooks/${h.id}`, { isActive: !h.isActive })
    await loadHooks()
  }

  const deleteHook = async (id: string) => {
    await apiDelete(`/v1/aos/hooks/${id}`); await loadHooks()
  }

  const captureResources = async () => {
    const r = await apiPost('/v1/aos/resource-usage/capture', { period: 'hourly' })
    flash(`Resource snapshot captured — ${r.alerts?.length ?? 0} alert(s)`); await loadResources()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Enterprise OS Runtime</h1>
        <p className="text-gray-500 text-sm mt-1">Runtime · Event Bus · Job Scheduler · Resource Monitor · Hooks</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
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
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-5 text-white">
            <p className="text-lg font-medium">{dashboard.summary}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Events', value: dashboard.stats.totalEvents },
              { label: 'Pending', value: dashboard.stats.pendingEvents },
              { label: 'Active Jobs', value: dashboard.stats.activeJobs },
              { label: 'Total Jobs', value: dashboard.stats.totalJobs },
              { label: 'Active Hooks', value: dashboard.stats.activeHooks },
              { label: 'Cost (period)', value: `$${dashboard.stats.latestCost.toFixed(3)}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Event Channel Activity</h3>
              {dashboard.channelStats.length === 0 ? <p className="text-sm text-gray-400">No events yet.</p> : (
                <div className="space-y-2">
                  {dashboard.channelStats.map(c => (
                    <div key={c.channel} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-gray-600">{c.channel}</span>
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Recent Events</h3>
              {dashboard.recentEvents.length === 0 ? <p className="text-sm text-gray-400">No events yet.</p> : (
                <div className="space-y-2">
                  {dashboard.recentEvents.map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gray-600">{e.channel}</span>
                      <div className="flex gap-1">
                        <span className={`px-2 py-0.5 rounded-full ${PRIORITY_COLORS[e.priority] ?? 'bg-gray-100 text-gray-600'}`}>{e.priority}</span>
                        <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Runtime */}
      {!loading && tab === 'Runtime' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{runtimes.length} runtime instance{runtimes.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowRuntimeForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">+ New Runtime</button>
          </div>
          {showRuntimeForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Create Runtime</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Runtime name" value={runtimeForm.name} onChange={e => setRuntimeForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug" value={runtimeForm.slug} onChange={e => setRuntimeForm(f => ({ ...f, slug: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Max concurrent agents (default 10)" value={runtimeForm.maxConcurrentAgents} onChange={e => setRuntimeForm(f => ({ ...f, maxConcurrentAgents: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Max cost/day ($, optional)" value={runtimeForm.maxCostPerDay} onChange={e => setRuntimeForm(f => ({ ...f, maxCostPerDay: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={runtimeForm.description} onChange={e => setRuntimeForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createRuntime} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Create</button>
                <button onClick={() => setShowRuntimeForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {runtimes.map(r => (
              <div key={r.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div><div className="font-semibold">{r.name}</div><div className="text-xs text-gray-400">{r.slug}</div></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                  <div><div className="font-bold text-gray-700">{r.totalEventsProcessed}</div>Events</div>
                  <div><div className="font-bold text-gray-700">{r.totalJobsRun}</div>Jobs Run</div>
                  <div><div className="font-bold text-gray-700">{r.maxConcurrentAgents}</div>Max Agents</div>
                </div>
                <div className="flex gap-2">
                  {r.status === 'running' && <button onClick={() => updateRuntime(r.id, 'paused')} className="flex-1 bg-yellow-50 text-yellow-700 py-1.5 rounded text-sm hover:bg-yellow-100">Pause</button>}
                  {r.status === 'paused' && <button onClick={() => updateRuntime(r.id, 'running')} className="flex-1 bg-green-50 text-green-700 py-1.5 rounded text-sm hover:bg-green-100">Resume</button>}
                  {r.status !== 'stopped' && <button onClick={() => updateRuntime(r.id, 'stopped')} className="flex-1 bg-red-50 text-red-600 py-1.5 rounded text-sm hover:bg-red-100">Stop</button>}
                </div>
              </div>
            ))}
            {runtimes.length === 0 && <div className="md:col-span-2 bg-white rounded-xl border p-8 text-center text-gray-400"><p className="text-2xl mb-2">⚙️</p><p>No runtimes yet. Create a runtime to start the AOS engine.</p></div>}
          </div>
        </div>
      )}

      {/* Event Bus */}
      {!loading && tab === 'Event Bus' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{events.length} events</p>
            <button onClick={() => setShowPublishForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Publish Event</button>
          </div>
          {showPublishForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Publish Event</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <select className="border rounded-lg px-3 py-2 text-sm" value={publishForm.channel} onChange={e => setPublishForm(f => ({ ...f, channel: e.target.value }))}>
                  {channels.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={publishForm.sourceType} onChange={e => setPublishForm(f => ({ ...f, sourceType: e.target.value }))}>
                  {['user','agent','tool','system','scheduler'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea className="border rounded-lg px-3 py-2 text-sm font-mono h-24 md:col-span-2" placeholder='{"key": "value"}' value={publishForm.payload} onChange={e => setPublishForm(f => ({ ...f, payload: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={publishEvent} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Publish</button>
                <button onClick={() => setShowPublishForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Channel','Source','Priority','Status','Time','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {events.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{e.channel}</td>
                    <td className="px-4 py-3 text-gray-500">{e.sourceType}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_COLORS[e.priority] ?? 'bg-gray-100 text-gray-600'}`}>{e.priority}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-3">{e.status === 'published' && <button onClick={() => consumeEvent(e.id)} className="text-blue-600 hover:underline text-xs">Consume</button>}</td>
                  </tr>
                ))}
                {events.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No events yet. Publish an event to test the bus.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Jobs */}
      {!loading && tab === 'Jobs' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{jobs.length} jobs</p>
            <button onClick={() => setShowJobForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">+ Custom Job</button>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Job Templates</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map(t => {
                const installed = jobs.some(j => j.slug === t.slug)
                return (
                  <div key={t.slug} className="border rounded-lg p-3 space-y-2">
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.description}</div>
                    {t.defaultSchedule && <div className="font-mono text-xs text-indigo-600">{t.defaultSchedule}</div>}
                    <button onClick={() => !installed && installTemplate(t.slug)} className={`w-full py-1 rounded text-xs font-medium ${installed ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {installed ? 'Installed' : 'Install'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          {showJobForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Custom Job</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Job name" value={jobForm.name} onChange={e => setJobForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug" value={jobForm.slug} onChange={e => setJobForm(f => ({ ...f, slug: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={jobForm.jobType} onChange={e => setJobForm(f => ({ ...f, jobType: e.target.value }))}>
                  {['manual','scheduled','recurring','event_triggered'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Schedule (cron, optional)" value={jobForm.schedule} onChange={e => setJobForm(f => ({ ...f, schedule: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Handler (e.g. learning:runOptimization)" value={jobForm.handler} onChange={e => setJobForm(f => ({ ...f, handler: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createJob} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Create</button>
                <button onClick={() => setShowJobForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Job','Schedule','Status','Runs','Failed','Next Run','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map(j => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium">{j.name}</div><div className="text-xs text-gray-400">{j.handler}</div></td>
                    <td className="px-4 py-3 text-xs text-indigo-600">{j.scheduleDescription ?? 'Manual'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[j.status] ?? 'bg-gray-100 text-gray-600'}`}>{j.status}</span></td>
                    <td className="px-4 py-3">{j.totalRuns}</td>
                    <td className="px-4 py-3 text-red-500">{j.failedRuns}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{j.nextRunAt ? new Date(j.nextRunAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => runJob(j.id)} className="text-green-600 hover:underline text-xs">Run</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleJob(j)} className="text-gray-500 hover:underline text-xs">{j.status === 'active' ? 'Pause' : 'Enable'}</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => deleteJob(j.id)} className="text-red-500 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No jobs yet. Install from templates above.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hooks */}
      {!loading && tab === 'Hooks' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{hooks.length} hooks · {hooks.filter(h => h.isActive).length} active</p>
            <button onClick={() => setShowHookForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">+ Add Hook</button>
          </div>
          {showHookForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">New Hook</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Hook name" value={hookForm.name} onChange={e => setHookForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug" value={hookForm.slug} onChange={e => setHookForm(f => ({ ...f, slug: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={hookForm.hookType} onChange={e => setHookForm(f => ({ ...f, hookType: e.target.value }))}>
                  {['pre_tool_execution','post_tool_execution','pre_agent_task','post_agent_task','on_policy_block','on_error','on_event'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={hookForm.handlerType} onChange={e => setHookForm(f => ({ ...f, handlerType: e.target.value }))}>
                  {['internal','webhook'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Handler (e.g. learning:recordEvent or https://webhook.site/...)" value={hookForm.handler} onChange={e => setHookForm(f => ({ ...f, handler: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Priority (default 0)" value={hookForm.priority} onChange={e => setHookForm(f => ({ ...f, priority: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createHook} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Create</button>
                <button onClick={() => setShowHookForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Hook','Type','Handler','Fired','Active','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {hooks.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{h.name}</td>
                    <td className="px-4 py-3 text-xs"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{h.hookType}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{h.handler}</td>
                    <td className="px-4 py-3">{h.totalFired}</td>
                    <td className="px-4 py-3"><button onClick={() => toggleHook(h)} className={`w-10 h-5 rounded-full transition-colors ${h.isActive ? 'bg-green-400' : 'bg-gray-200'}`} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => testHook(h.id)} className="text-blue-600 hover:underline text-xs">Test</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => deleteHook(h.id)} className="text-red-500 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {hooks.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hooks registered yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resources */}
      {!loading && tab === 'Resources' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{resources.length} usage snapshots</p>
            <button onClick={captureResources} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Capture Now</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Period','Tool Calls','Agent Tasks','Events','Jobs','Cost','Budget %','Alerts'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {resources.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs"><div>{r.period}</div><div className="text-gray-400">{new Date(r.periodAt).toLocaleString()}</div></td>
                    <td className="px-4 py-3">{r.toolCallsTotal}</td>
                    <td className="px-4 py-3">{r.agentTasksTotal}</td>
                    <td className="px-4 py-3">{r.eventsPublished}</td>
                    <td className="px-4 py-3">{r.jobsExecuted}</td>
                    <td className="px-4 py-3">${r.totalCost.toFixed(4)}</td>
                    <td className="px-4 py-3">{r.budgetUsedPct != null ? `${r.budgetUsedPct.toFixed(1)}%` : '—'}</td>
                    <td className="px-4 py-3">{(r.alerts as unknown[]).length > 0 ? <span className="text-red-600 font-medium">{(r.alerts as unknown[]).length} alert{(r.alerts as unknown[]).length > 1 ? 's' : ''}</span> : <span className="text-green-600">None</span>}</td>
                  </tr>
                ))}
                {resources.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No resource snapshots. Click "Capture Now".</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
