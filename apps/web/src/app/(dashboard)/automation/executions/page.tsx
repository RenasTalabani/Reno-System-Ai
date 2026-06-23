'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

interface Execution {
  id: string
  status: string
  triggerType: string
  triggeredBy: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  errorMessage: string | null
  errorStep: string | null
  retryCount: number
  workflow: { name: string; slug: string; category: string | null }
  _count: { stepResults: number }
}

interface ExecutionDetail {
  id: string
  status: string
  triggerType: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  errorMessage: string | null
  triggerData: any
  context: any
  workflow: { name: string; steps: any[] }
  stepResults: {
    id: string; stepIndex: number; stepId: string; stepName: string; stepType: string
    status: string; output: any; errorMessage: string | null; durationMs: number | null
    startedAt: string | null; completedAt: string | null
  }[]
}

const STATUS_ICON: Record<string, any> = {
  completed: CheckCircle, failed: XCircle, running: Activity,
  waiting_approval: Clock, cancelled: XCircle, pending: Clock,
}
const STATUS_COLOR: Record<string, string> = {
  completed: 'text-green-600', failed: 'text-red-500', running: 'text-blue-600',
  waiting_approval: 'text-yellow-600', cancelled: 'text-gray-400', pending: 'text-gray-400',
}
const STATUS_BG: Record<string, string> = {
  completed: 'bg-green-50 border-green-200', failed: 'bg-red-50 border-red-200',
  running: 'bg-blue-50 border-blue-200', waiting_approval: 'bg-yellow-50 border-yellow-200',
  cancelled: 'bg-gray-50 border-gray-200', pending: 'bg-gray-50 border-gray-200',
}

function ExecutionsContent() {
  const searchParams = useSearchParams()
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'))
  const [detail, setDetail] = useState<ExecutionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)

  useEffect(() => { loadExecutions() }, [statusFilter])
  useEffect(() => { if (selectedId) loadDetail(selectedId) }, [selectedId])

  async function loadExecutions() {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    const r = await fetch(`/api/v1/automation/executions?${params}`)
    const d = await r.json()
    setExecutions(d.data ?? [])
    setLoading(false)
  }

  async function loadDetail(id: string) {
    setDetailLoading(true)
    const r = await fetch(`/api/v1/automation/executions/${id}`)
    const d = await r.json()
    setDetail(d.data)
    setDetailLoading(false)
  }

  async function retry(id: string) {
    setRetrying(id)
    await fetch(`/api/v1/automation/executions/${id}/retry`, { method: 'POST' })
    setRetrying(null)
    loadExecutions()
  }

  async function cancel(id: string) {
    await fetch(`/api/v1/automation/executions/${id}/cancel`, { method: 'POST' })
    loadExecutions()
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100 space-y-2">
          <h2 className="font-semibold text-gray-900 text-sm px-1">Execution History</h2>
          <div className="flex flex-wrap gap-1">
            {['all', 'completed', 'failed', 'waiting_approval', 'running'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-xs rounded-md capitalize ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === 'waiting_approval' ? 'waiting' : s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-xs">Loading...</div>
          ) : executions.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">No executions</div>
          ) : executions.map(exec => {
            const Icon = STATUS_ICON[exec.status] ?? Clock
            return (
              <div key={exec.id} onClick={() => setSelectedId(exec.id)}
                className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${selectedId === exec.id ? 'bg-violet-50 border-l-2 border-violet-500' : ''}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <Icon size={11} className={STATUS_COLOR[exec.status] ?? 'text-gray-400'} />
                  <span className="text-xs font-medium text-gray-800 truncate">{exec.workflow.name}</span>
                </div>
                <div className="text-xs text-gray-400 pl-3.5">
                  {new Date(exec.startedAt).toLocaleString()} · {exec.triggerType}
                  {exec.durationMs ? ` · ${exec.durationMs}ms` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Activity size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Select an execution to view details</p>
          </div>
        ) : detailLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading details...</div>
        ) : detail ? (
          <div className="space-y-4 max-w-3xl">
            {/* Header */}
            <div className={`rounded-xl border p-4 ${STATUS_BG[detail.status] ?? 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{detail.workflow.name}</h3>
                  <p className="text-sm text-gray-500">{detail.triggerType} trigger · {new Date(detail.startedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {detail.status === 'failed' && (
                    <button onClick={() => retry(detail.id)} disabled={retrying === detail.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
                      <RefreshCw size={12} /> Retry
                    </button>
                  )}
                  {(detail.status === 'running' || detail.status === 'waiting_approval') && (
                    <button onClick={() => cancel(detail.id)}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                  )}
                  <span className={`text-sm font-semibold capitalize ${STATUS_COLOR[detail.status] ?? 'text-gray-600'}`}>
                    {detail.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {detail.errorMessage && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{detail.errorMessage}</p>
              )}
              {detail.durationMs && <p className="text-xs text-gray-400 mt-1">{detail.durationMs}ms total</p>}
            </div>

            {/* Steps */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Steps</h4>
              <div className="space-y-2">
                {detail.stepResults.map(step => {
                  const Icon = STATUS_ICON[step.status] ?? Clock
                  return (
                    <div key={step.id} className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                          <Icon size={11} className={STATUS_COLOR[step.status] ?? 'text-gray-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{step.stepName}</span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{step.stepType}</span>
                          </div>
                          {step.errorMessage && <p className="text-xs text-red-500 mt-0.5">{step.errorMessage}</p>}
                        </div>
                        {step.durationMs && <span className="text-xs text-gray-400">{step.durationMs}ms</span>}
                      </div>
                      {step.output && (
                        <pre className="mt-2 text-xs bg-gray-50 rounded-lg p-2 overflow-x-auto text-gray-600">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  )
                })}
                {detail.stepResults.length === 0 && (
                  <p className="text-sm text-gray-400">No steps recorded</p>
                )}
              </div>
            </div>

            {/* Trigger data */}
            {detail.triggerData && Object.keys(detail.triggerData).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Trigger Data</h4>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-x-auto text-gray-700">
                  {JSON.stringify(detail.triggerData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function ExecutionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ExecutionsContent />
    </Suspense>
  )
}
