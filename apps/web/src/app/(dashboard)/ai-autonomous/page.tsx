'use client'

import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const BASE = `${API}/v1/ai-autonomous`

async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  })
  return res.json()
}

interface Job {
  id: string; title: string; objective: string; status: string
  projectName?: string; currentStep: number; totalSteps: number
  createdAt: string; completedAt?: string
}
interface Step {
  id: string; stepNumber: number; title: string; description: string
  tool: string; status: string; approvedAt?: string; executedAt?: string
  result?: Record<string, unknown>
}
interface Discovery {
  id: string; type: string; severity: string; title: string
  description?: string; filePath?: string; lineNumber?: number; status: string
}
interface Summary {
  jobs: { total: number; running: number; completed: number; failed: number }
  discoveries: { open: number; resolved: number }
  pendingSteps: number
}

type TabId = 'overview' | 'jobs' | 'new-job' | 'discoveries' | 'search' | 'timeline'

const statusColors: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  ready: 'bg-blue-100 text-blue-700',
  running: 'bg-indigo-100 text-indigo-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  waiting: 'bg-gray-100 text-gray-500',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-700',
}

const typeIcons: Record<string, string> = {
  todo: '📌', bug: '🐛', security: '🔒', improvement: '💡',
}

export default function AiAutonomousPage() {
  const [tab, setTab] = useState<TabId>('overview')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [jobSteps, setJobSteps] = useState<Step[]>([])
  const [discoveries, setDiscoveries] = useState<Discovery[]>([])
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // New job form
  const [newTitle, setNewTitle] = useState('')
  const [newObjective, setNewObjective] = useState('')
  const [newProject, setNewProject] = useState('')
  const [generatedPlan, setGeneratedPlan] = useState<Record<string, unknown> | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchProject, setSearchProject] = useState('')
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([])

  // Discover
  const [discoverProject, setDiscoverProject] = useState('')

  const loadSummary = useCallback(async () => {
    const r = await apiFetch('/summary').catch(() => null)
    if (r?.success) setSummary(r.data)
  }, [])

  const loadJobs = useCallback(async () => {
    const r = await apiFetch('/jobs').catch(() => null)
    if (r?.success) setJobs(r.data)
  }, [])

  const loadJobSteps = useCallback(async (jobId: string) => {
    const r = await apiFetch(`/jobs/${jobId}/steps`).catch(() => null)
    if (r?.success) setJobSteps(r.data)
  }, [])

  const loadDiscoveries = useCallback(async () => {
    const r = await apiFetch('/discoveries').catch(() => null)
    if (r?.success) setDiscoveries(r.data)
  }, [])

  const loadTimeline = useCallback(async () => {
    const r = await apiFetch('/timeline').catch(() => null)
    if (r?.success) setTimeline(r.data)
  }, [])

  useEffect(() => {
    loadSummary(); loadJobs()
  }, [loadSummary, loadJobs])

  useEffect(() => {
    if (tab === 'discoveries') loadDiscoveries()
    if (tab === 'timeline') loadTimeline()
  }, [tab, loadDiscoveries, loadTimeline])

  async function createJob() {
    if (!newTitle || !newObjective) { setMsg('❌ Title and objective are required'); return }
    setLoading(true); setMsg('')
    try {
      const r = await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, objective: newObjective, projectName: newProject || undefined }),
      })
      if (r.success) {
        setGeneratedPlan(r.data.plan)
        setMsg('✅ Job created — review the plan below, then start the job')
        loadJobs(); loadSummary()
        setSelectedJob(r.data.job)
      } else setMsg(`❌ ${r.error}`)
    } finally { setLoading(false) }
  }

  async function startJob(jobId: string) {
    setLoading(true); setMsg('')
    const r = await apiFetch(`/jobs/${jobId}/start`, { method: 'POST', body: '{}' })
    if (r.success) {
      setMsg('✅ Job started — approve Step 1 to begin execution')
      loadJobs(); loadSummary()
      if (selectedJob?.id === jobId) { loadJobSteps(jobId) }
    } else setMsg(`❌ ${r.error}`)
    setLoading(false)
  }

  async function pauseJob(jobId: string) {
    setLoading(true)
    await apiFetch(`/jobs/${jobId}/pause`, { method: 'POST', body: '{}' })
    loadJobs(); loadSummary()
    if (selectedJob?.id === jobId) loadJobSteps(jobId)
    setLoading(false)
  }

  async function approveStep(jobId: string, stepId: string) {
    setLoading(true); setMsg('')
    const r = await apiFetch(`/jobs/${jobId}/steps/${stepId}/approve`, { method: 'POST', body: '{}' })
    if (r.success) {
      setMsg('✅ Step approved and executed — review result, then approve the next step')
      loadJobs(); loadSummary(); loadJobSteps(jobId)
    } else setMsg(`❌ ${r.error}`)
    setLoading(false)
  }

  async function rejectStep(jobId: string, stepId: string) {
    setLoading(true)
    await apiFetch(`/jobs/${jobId}/steps/${stepId}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'User rejected' }) })
    setMsg('⏸ Step rejected — job paused. You can resume later.')
    loadJobs(); loadSummary(); loadJobSteps(jobId)
    setLoading(false)
  }

  async function runDiscover() {
    setLoading(true); setMsg('')
    const r = await apiFetch('/discover', {
      method: 'POST',
      body: JSON.stringify({ projectName: discoverProject || 'project', types: ['todo', 'bug', 'security', 'improvement'] }),
    })
    if (r.success) {
      setMsg(`✅ Found ${r.data.discovered} items`)
      loadDiscoveries(); loadSummary()
    } else setMsg(`❌ ${r.error}`)
    setLoading(false)
  }

  async function runSearch() {
    if (!searchQuery) return
    setLoading(true)
    const r = await apiFetch('/projects/search', {
      method: 'POST',
      body: JSON.stringify({ query: searchQuery, projectName: searchProject || undefined }),
    })
    if (r.success) setSearchResults(r.data.results ?? [])
    setLoading(false)
  }

  async function resolveDiscovery(id: string) {
    await apiFetch(`/discoveries/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) })
    loadDiscoveries(); loadSummary()
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'jobs', label: 'Jobs', icon: '⚙️' },
    { id: 'new-job', label: 'New Job', icon: '✨' },
    { id: 'discoveries', label: 'Discoveries', icon: '🔍' },
    { id: 'search', label: 'Semantic Search', icon: '🧠' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Autonomous Workspace</h1>
            <p className="text-xs text-gray-500 mt-0.5">Long-running AI jobs · Multi-step approval · Discovery engine · Powered by Reno Brain</p>
          </div>
          {msg && (
            <div className={`text-sm px-3 py-1.5 rounded-lg max-w-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : msg.startsWith('⏸') ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          )}
        </div>
        <div className="flex gap-1 mt-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <span>{t.icon}</span> {t.label}
              {t.id === 'jobs' && summary?.pendingSteps ? (
                <span className="bg-yellow-400 text-yellow-900 text-xs rounded-full px-1.5 font-bold">{summary.pendingSteps}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Active Jobs', value: summary.jobs.running, color: 'text-indigo-600', icon: '⚙️' },
                  { label: 'Completed Jobs', value: summary.jobs.completed, color: 'text-green-600', icon: '✅' },
                  { label: 'Pending Steps', value: summary.pendingSteps, color: 'text-yellow-600', icon: '⏳' },
                  { label: 'Open Discoveries', value: summary.discoveries.open, color: 'text-orange-600', icon: '🔍' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border p-5">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
              <h3 className="font-semibold text-indigo-900 mb-3">How AI Autonomous Workspace works</h3>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  { icon: '✍️', label: 'You describe the objective' },
                  { icon: '🧠', label: 'Reno Brain generates a multi-step plan' },
                  { icon: '▶️', label: 'You start the job' },
                  { icon: '✅', label: 'You approve each step individually' },
                  { icon: '📋', label: 'Full audit trail created' },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="text-2xl">{s.icon}</div>
                    <div className="text-indigo-700">{s.label}</div>
                    {i < 4 && <div className="text-indigo-300 text-lg">→</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent jobs */}
            <div className="bg-white border rounded-xl">
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <span className="font-medium text-sm text-gray-700">Recent Jobs</span>
                <button onClick={() => setTab('new-job')} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
                  + New Job
                </button>
              </div>
              {jobs.slice(0, 8).map(j => (
                <div key={j.id} className="px-5 py-3 border-b last:border-b-0 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => { setSelectedJob(j); loadJobSteps(j.id); setTab('jobs') }}>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{j.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{j.projectName ?? 'No project'} · Step {j.currentStep}/{j.totalSteps}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-400">{j.currentStep}/{j.totalSteps} steps</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[j.status] ?? 'bg-gray-100 text-gray-600'}`}>{j.status}</span>
                  </div>
                </div>
              ))}
              {!jobs.length && <div className="text-center text-gray-400 py-8 text-sm">No jobs yet — create your first autonomous job</div>}
            </div>
          </div>
        )}

        {/* Jobs */}
        {tab === 'jobs' && (
          <div className="grid grid-cols-3 gap-5">
            {/* Job list */}
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b text-sm font-medium text-gray-700">All Jobs</div>
              {jobs.map(j => (
                <div key={j.id}
                  onClick={() => { setSelectedJob(j); loadJobSteps(j.id) }}
                  className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 ${selectedJob?.id === j.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}>
                  <div className="text-sm font-medium text-gray-800 truncate">{j.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[j.status] ?? 'bg-gray-100 text-gray-600'}`}>{j.status}</span>
                    <span className="text-xs text-gray-400">{j.currentStep}/{j.totalSteps}</span>
                  </div>
                </div>
              ))}
              {!jobs.length && <div className="text-center text-gray-400 py-6 text-xs">No jobs</div>}
            </div>

            {/* Job detail */}
            <div className="col-span-2">
              {selectedJob ? (
                <div className="space-y-4">
                  <div className="bg-white border rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedJob.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{selectedJob.objective}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[selectedJob.status] ?? 'bg-gray-100'}`}>
                        {selectedJob.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {['ready', 'paused'].includes(selectedJob.status) && (
                        <button onClick={() => startJob(selectedJob.id)} disabled={loading}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                          ▶ {selectedJob.status === 'paused' ? 'Resume' : 'Start'}
                        </button>
                      )}
                      {selectedJob.status === 'running' && (
                        <button onClick={() => pauseJob(selectedJob.id)} disabled={loading}
                          className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50">
                          ⏸ Pause
                        </button>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{selectedJob.currentStep}/{selectedJob.totalSteps} steps</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: selectedJob.totalSteps > 0 ? `${(selectedJob.currentStep / selectedJob.totalSteps) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b text-sm font-medium text-gray-700">Execution Steps</div>
                    {jobSteps.map(s => (
                      <div key={s.id} className={`px-5 py-4 border-b last:border-b-0 ${s.status === 'pending_approval' ? 'bg-yellow-50' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                              ${s.status === 'completed' ? 'bg-green-500 text-white' : s.status === 'pending_approval' ? 'bg-yellow-500 text-white' : s.status === 'running' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              {s.status === 'completed' ? '✓' : s.stepNumber}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{s.title}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                              <div className="text-xs text-indigo-500 mt-0.5">Tool: {s.tool}</div>
                              {s.result && s.status === 'completed' && (
                                <div className="mt-2 bg-green-50 rounded px-2 py-1.5 text-xs text-green-700">
                                  ✓ {String((s.result as Record<string, unknown>).output ?? 'Completed')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {s.status.replace('_', ' ')}
                            </span>
                            {s.status === 'pending_approval' && (
                              <div className="flex gap-1">
                                <button onClick={() => approveStep(selectedJob.id, s.id)} disabled={loading}
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                                  Approve
                                </button>
                                <button onClick={() => rejectStep(selectedJob.id, s.id)} disabled={loading}
                                  className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200">
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!jobSteps.length && (
                      <div className="text-center text-gray-400 py-6 text-sm">
                        {['ready', 'planning'].includes(selectedJob.status) ? 'Start the job to see steps' : 'No steps found'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border rounded-xl flex items-center justify-center h-64 text-gray-400 text-sm">
                  Select a job to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Job */}
        {tab === 'new-job' && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-white border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Create Autonomous Job</h3>
              <p className="text-sm text-gray-500">Describe what you want Reno Brain to do. It will generate a multi-step plan and wait for your approval at each step.</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Job Title</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Fix the authentication bug in the payment module"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Objective <span className="text-gray-400">(natural language)</span></label>
                  <textarea value={newObjective} onChange={e => setNewObjective(e.target.value)} rows={4}
                    placeholder={`Examples:\n• Fix the bug causing JWT tokens to expire too early\n• Refactor the payment service to improve readability\n• Audit the authentication module for security vulnerabilities\n• Find all TODOs and create a priority list`}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Project Name <span className="text-gray-400">(optional)</span></label>
                  <input value={newProject} onChange={e => setNewProject(e.target.value)}
                    placeholder="e.g. reno-api"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>

              <button onClick={createJob} disabled={loading || !newTitle || !newObjective}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? 'Generating plan...' : '🧠 Generate Plan'}
              </button>
            </div>

            {/* Generated plan preview */}
            {generatedPlan && (
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b bg-indigo-50">
                  <div className="text-sm font-semibold text-indigo-900">Generated Plan</div>
                  <div className="text-xs text-indigo-600 mt-0.5">{String(generatedPlan.summary ?? '')}</div>
                </div>
                <div className="divide-y">
                  {(generatedPlan.steps as Record<string, unknown>[]).map((s, i) => (
                    <div key={i} className="px-5 py-3 flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{String(s.title)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{String(s.description)}</div>
                        <div className="text-xs text-indigo-500 mt-0.5">Tool: {String(s.tool)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-500">Each step requires your individual approval before execution</span>
                  <button onClick={() => { setTab('jobs'); loadJobs() }}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                    View Job & Start →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Discoveries */}
        {tab === 'discoveries' && (
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-700 block mb-1">Project Name</label>
                <input value={discoverProject} onChange={e => setDiscoverProject(e.target.value)}
                  placeholder="reno-api (leave empty for default)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <button onClick={runDiscover} disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Scanning...' : '🔍 Run Discovery Scan'}
              </button>
            </div>

            {discoveries.length > 0 && (
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b text-sm font-medium text-gray-700">
                  {discoveries.length} Discoveries · {discoveries.filter(d => d.status === 'open').length} Open
                </div>
                {discoveries.map(d => (
                  <div key={d.id} className="px-5 py-4 border-b last:border-b-0 flex items-start justify-between">
                    <div className="flex gap-3">
                      <span className="text-xl">{typeIcons[d.type] ?? '📌'}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{d.title}</div>
                        {d.description && <div className="text-xs text-gray-500 mt-0.5">{d.description}</div>}
                        {d.filePath && (
                          <div className="text-xs text-indigo-500 mt-0.5 font-mono">
                            {d.filePath}{d.lineNumber ? `:${d.lineNumber}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${severityColors[d.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.severity}
                      </span>
                      {d.status === 'open' ? (
                        <button onClick={() => resolveDiscovery(d.id)}
                          className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                          Resolve
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Resolved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!discoveries.length && (
              <div className="text-center text-gray-400 py-10 text-sm">Run a discovery scan to find TODOs, bugs, and security issues</div>
            )}
          </div>
        )}

        {/* Semantic Search */}
        {tab === 'search' && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-1">Semantic Project Search</h3>
              <p className="text-sm text-gray-500 mb-4">Search your indexed project files by meaning — not just file name.</p>
              <div className="space-y-3">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runSearch()}
                  placeholder="e.g. authentication middleware token validation"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <div className="flex gap-2">
                  <input value={searchProject} onChange={e => setSearchProject(e.target.value)}
                    placeholder="Filter by project name (optional)"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <button onClick={runSearch} disabled={loading || !searchQuery}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? '...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>
            {searchResults.length > 0 ? (
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b text-sm text-gray-600">{searchResults.length} results</div>
                {searchResults.map((r, i) => (
                  <div key={i} className="px-5 py-3 border-b last:border-b-0">
                    <div className="text-sm font-mono text-indigo-600">{String(r.filePath)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{String(r.summary ?? 'No summary')}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(r.keywords as string[] ?? []).slice(0, 5).map((k: string) => (
                        <span key={k} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8 text-sm">
                {searchQuery ? 'No results — index your project first via POST /projects/index' : 'Enter a search query above'}
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        {tab === 'timeline' && (
          <div className="max-w-2xl">
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b text-sm font-medium text-gray-700">Workspace Timeline</div>
              {timeline.map((e, i) => (
                <div key={i} className="px-5 py-3 border-b last:border-b-0 flex gap-3">
                  <div className="text-lg shrink-0">
                    {e.type === 'job' ? '⚙️' : e.type === 'step' ? '✅' : '🔍'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{String(e.title ?? e.objective ?? '')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {e.type} · {new Date(String(e.ts ?? e.createdAt)).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {!timeline.length && (
                <div className="text-center text-gray-400 py-10 text-sm">No timeline events yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
