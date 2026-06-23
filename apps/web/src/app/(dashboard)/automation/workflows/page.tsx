'use client'

import { useEffect, useState } from 'react'
import { Workflow, Plus, Play, Pause, Trash2, CheckCircle, Circle, ChevronRight, Zap, Clock, Globe, Hand } from 'lucide-react'

interface WorkflowItem {
  id: string
  name: string
  description: string | null
  slug: string
  category: string | null
  tags: string[]
  triggerType: string
  triggerConfig: any
  isEnabled: boolean
  requiresApproval: boolean
  totalRuns: number
  successRuns: number
  failedRuns: number
  lastRunAt: string | null
  lastRunStatus: string | null
  createdAt: string
  _count: { executions: number }
}

const TRIGGER_ICONS: Record<string, any> = {
  manual: Hand, scheduled: Clock, event: Zap, webhook: Globe,
}

const TRIGGER_COLORS: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  event: 'bg-violet-100 text-violet-700',
  webhook: 'bg-green-100 text-green-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  hr: 'bg-purple-100 text-purple-700',
  sales: 'bg-blue-100 text-blue-700',
  finance: 'bg-green-100 text-green-700',
  inventory: 'bg-yellow-100 text-yellow-700',
  procurement: 'bg-orange-100 text-orange-700',
  manufacturing: 'bg-red-100 text-red-700',
  crm: 'bg-cyan-100 text-cyan-700',
  'cross-module': 'bg-indigo-100 text-indigo-700',
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all')

  useEffect(() => { loadWorkflows() }, [])

  async function loadWorkflows() {
    setLoading(true)
    const r = await fetch('/api/v1/automation/workflows?limit=100')
    const d = await r.json()
    setWorkflows(d.data ?? [])
    setLoading(false)
  }

  async function toggle(id: string) {
    await fetch(`/api/v1/automation/workflows/${id}/toggle`, { method: 'POST' })
    loadWorkflows()
  }

  async function runNow(id: string) {
    setRunning(id)
    await fetch(`/api/v1/automation/workflows/${id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setRunning(null)
    loadWorkflows()
  }

  async function deleteWf(id: string) {
    await fetch(`/api/v1/automation/workflows/${id}`, { method: 'DELETE' })
    loadWorkflows()
  }

  const filtered = workflows.filter(w =>
    filter === 'all' ? true : filter === 'enabled' ? w.isEnabled : !w.isEnabled
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm">Automated processes across all business modules</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/automation/templates"
            className="px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
            From Template
          </a>
          <button
            onClick={() => alert('Visual workflow builder coming in Phase 12')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
            <Plus size={14} />
            New Workflow
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'enabled', 'disabled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize ${filter === f ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f}
          </button>
        ))}
        <span className="text-sm text-gray-400 ml-2">{filtered.length} workflows</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading workflows...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Workflow size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-3">No workflows yet</p>
          <a href="/automation/templates" className="text-violet-600 text-sm hover:underline">Browse templates →</a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(wf => {
            const TriggerIcon = TRIGGER_ICONS[wf.triggerType] ?? Zap
            const rate = wf.totalRuns > 0 ? Math.round((wf.successRuns / wf.totalRuns) * 100) : null

            return (
              <div key={wf.id} className={`bg-white rounded-xl border ${wf.isEnabled ? 'border-gray-200' : 'border-gray-100'} p-4 hover:shadow-sm transition-all`}>
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${wf.isEnabled ? 'bg-violet-50' : 'bg-gray-50'}`}>
                    <TriggerIcon size={16} className={wf.isEnabled ? 'text-violet-600' : 'text-gray-400'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{wf.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TRIGGER_COLORS[wf.triggerType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {wf.triggerType}
                      </span>
                      {wf.category && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[wf.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {wf.category}
                        </span>
                      )}
                      {wf.requiresApproval && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">approval required</span>
                      )}
                    </div>

                    {wf.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-1">{wf.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{wf.totalRuns} runs</span>
                      {rate !== null && <span>{rate}% success</span>}
                      {wf.lastRunAt && <span>Last: {new Date(wf.lastRunAt).toLocaleDateString()}</span>}
                      {wf.lastRunStatus && (
                        <span className={wf.lastRunStatus === 'completed' ? 'text-green-600' : wf.lastRunStatus === 'failed' ? 'text-red-500' : 'text-gray-400'}>
                          {wf.lastRunStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {wf.isEnabled && (
                      <button onClick={() => runNow(wf.id)} disabled={running === wf.id}
                        className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg" title="Run now">
                        <Play size={13} />
                      </button>
                    )}
                    <button onClick={() => toggle(wf.id)}
                      className={`p-1.5 rounded-lg ${wf.isEnabled ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}
                      title={wf.isEnabled ? 'Disable' : 'Enable'}>
                      {wf.isEnabled ? <CheckCircle size={14} /> : <Circle size={14} />}
                    </button>
                    <button onClick={() => deleteWf(wf.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
