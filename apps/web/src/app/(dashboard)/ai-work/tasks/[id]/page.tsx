'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Bot, Play, Pause, XCircle, CheckCircle, Clock, AlertTriangle, ChevronLeft, Zap, BarChart2 } from 'lucide-react'

interface Task {
  id: string; title: string; description: string | null; request: string
  status: string; provider: string; riskLevel: string; priority: string
  progressPct: number; totalSteps: number; completedSteps: number
  tokensUsed: number | null; costUsd: string | null; errorMessage: string | null
  result: { content: string; provider: string } | null
  plan: unknown
  createdAt: string; startedAt: string | null; completedAt: string | null; pausedAt: string | null
  steps: {
    id: string; stepIndex: number; title: string; status: string
    toolName: string | null; durationMs: number | null; errorMessage: string | null
    output: unknown; proposalId: string | null
  }[]
  memory: { key: string; value: unknown }[]
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-gray-600 bg-gray-100',
  queued: 'text-blue-600 bg-blue-50',
  planning: 'text-purple-600 bg-purple-50',
  running: 'text-indigo-600 bg-indigo-50',
  waiting_for_approval: 'text-yellow-700 bg-yellow-50',
  paused: 'text-orange-600 bg-orange-50',
  completed: 'text-green-700 bg-green-100',
  failed: 'text-red-700 bg-red-100',
  cancelled: 'text-gray-500 bg-gray-100',
}

const STEP_COLOR: Record<string, string> = {
  pending: 'border-gray-300 text-gray-400',
  running: 'border-indigo-400 text-indigo-600',
  success: 'border-green-400 text-green-600',
  failed: 'border-red-400 text-red-600',
  skipped: 'border-gray-300 text-gray-400',
  proposed: 'border-yellow-400 text-yellow-600',
}

export default function AiWorkTaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  async function loadTask() {
    const res = await fetch(`/api/v1/ai-work/tasks/${id}`).then(r => r.json()).catch(() => ({}))
    setTask(res.task ?? null)
    setLoading(false)
  }

  useEffect(() => {
    loadTask()
    // Auto-refresh for running tasks
    const interval = setInterval(() => {
      if (task?.status === 'running' || task?.status === 'planning') loadTask()
    }, 3000)
    return () => clearInterval(interval)
  }, [id, task?.status])

  async function doAction(action: 'start' | 'pause' | 'resume' | 'cancel') {
    setActionLoading(true)
    await fetch(`/api/v1/ai-work/tasks/${id}/${action}`, { method: 'POST' })
    await loadTask()
    setActionLoading(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading task...</div>
  if (!task) return <div className="p-8 text-center text-gray-400">Task not found.</div>

  const isActive = ['running', 'planning'].includes(task.status)
  const canStart = ['draft', 'queued'].includes(task.status)
  const canPause = task.status === 'running'
  const canResume = task.status === 'paused'
  const canCancel = !['completed', 'failed', 'cancelled'].includes(task.status)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => router.back()} className="mt-1 p-1 text-gray-400 hover:text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[task.status]}`}>
                {task.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400">{task.provider === 'mock' ? 'Reno Brain' : 'Claude'}</span>
              <span className="text-xs text-gray-400">Risk: {task.riskLevel}</span>
              <span className="text-xs text-gray-400">Priority: {task.priority}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canStart && <button type="button" onClick={() => doAction('start')} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"><Play size={13} /> Start</button>}
          {canPause && <button type="button" onClick={() => doAction('pause')} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 disabled:opacity-50"><Pause size={13} /> Pause</button>}
          {canResume && <button type="button" onClick={() => doAction('resume')} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 disabled:opacity-50"><Play size={13} /> Resume</button>}
          {canCancel && <button type="button" onClick={() => doAction('cancel')} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"><XCircle size={13} /> Cancel</button>}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span>{task.progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${task.progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Error message */}
      {task.errorMessage && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{task.errorMessage}</span>
        </div>
      )}

      {/* Approval gate */}
      {task.status === 'waiting_for_approval' && (
        <div className="flex gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-yellow-800 text-sm">Human approval required</div>
            <div className="text-xs text-yellow-700 mt-0.5">Claude has created proposals that require your review before execution.</div>
          </div>
        </div>
      )}

      {/* Result */}
      {task.result && (
        <div className="bg-white border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-600" />
            <h2 className="font-semibold text-gray-900 text-sm">AI Result</h2>
            <span className="text-xs text-gray-400 ml-auto">
              {task.provider === 'mock' ? 'Reno Brain' : 'Claude'}
              {task.tokensUsed ? ` · ${task.tokensUsed.toLocaleString()} tokens` : ''}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {task.result.content}
          </div>
        </div>
      )}

      {/* Step checklist */}
      {task.steps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-4 border-b border-gray-100 font-semibold text-sm text-gray-900">
            Execution Steps ({task.completedSteps}/{task.totalSteps})
          </div>
          <div className="divide-y divide-gray-100">
            {task.steps.map(step => (
              <div key={step.id} className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${STEP_COLOR[step.status]}`}>
                  {step.status === 'success' && <CheckCircle size={10} />}
                  {step.status === 'failed' && <XCircle size={10} />}
                  {step.status === 'running' && <Zap size={10} />}
                  {step.status === 'proposed' && <AlertTriangle size={10} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{step.title}</div>
                  {step.toolName && <div className="text-xs text-gray-400 mt-0.5">Tool: {step.toolName}</div>}
                  {step.errorMessage && <div className="text-xs text-red-600 mt-0.5">{step.errorMessage}</div>}
                  {step.proposalId && <div className="text-xs text-yellow-700 mt-0.5">Proposal created — awaiting approval</div>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STEP_COLOR[step.status] ?? ''}`}>{step.status}</span>
                  {step.durationMs && <span className="text-xs text-gray-400">{step.durationMs}ms</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-sm text-gray-900 mb-2">Original Request</h2>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.request}</p>
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
        <div><div className="font-medium text-gray-700">Created</div>{new Date(task.createdAt).toLocaleString()}</div>
        {task.startedAt && <div><div className="font-medium text-gray-700">Started</div>{new Date(task.startedAt).toLocaleString()}</div>}
        {task.completedAt && <div><div className="font-medium text-gray-700">Completed</div>{new Date(task.completedAt).toLocaleString()}</div>}
        {task.pausedAt && <div><div className="font-medium text-gray-700">Paused</div>{new Date(task.pausedAt).toLocaleString()}</div>}
      </div>
    </div>
  )
}
