'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, Play, Pause, CheckCircle, XCircle, Clock, AlertTriangle, Zap, Calendar, Activity, ListTodo } from 'lucide-react'

interface DashboardData {
  statusSummary: Record<string, number>
  recentTasks: {
    id: string; title: string; status: string; provider: string
    progressPct: number; riskLevel: string; createdAt: string; completedAt: string | null
  }[]
  byProvider: { provider: string; count: number }[]
  last30Days: { totalTasks: number; totalTokens: number; totalCostUsd: number }
}

const STATUS_ICON: Record<string, any> = {
  draft: Clock, queued: Clock, planning: Zap, running: Play,
  waiting_for_approval: AlertTriangle, paused: Pause,
  completed: CheckCircle, failed: XCircle, cancelled: XCircle,
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-gray-500 bg-gray-100',
  queued: 'text-blue-600 bg-blue-50',
  planning: 'text-purple-600 bg-purple-50',
  running: 'text-indigo-600 bg-indigo-50',
  waiting_for_approval: 'text-yellow-700 bg-yellow-50',
  paused: 'text-orange-600 bg-orange-50',
  completed: 'text-green-700 bg-green-100',
  failed: 'text-red-700 bg-red-100',
  cancelled: 'text-gray-600 bg-gray-100',
}

const RISK_COLOR: Record<string, string> = {
  low: 'text-green-700 bg-green-100',
  medium: 'text-yellow-700 bg-yellow-100',
  high: 'text-orange-700 bg-orange-100',
  critical: 'text-red-700 bg-red-100',
}

function StatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICON[status] ?? Clock
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? 'text-gray-600 bg-gray-100'}`}>
      <Icon size={10} />
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function AiWorkDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/ai-work/tasks/dashboard/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Active Tasks', value: (data?.statusSummary['running'] ?? 0) + (data?.statusSummary['planning'] ?? 0), icon: Play, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Completed (30d)', value: data?.last30Days.totalTasks ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Awaiting Approval', value: data?.statusSummary['waiting_for_approval'] ?? 0, icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Failed', value: (data?.statusSummary['failed'] ?? 0), icon: XCircle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Work</h1>
            <p className="text-sm text-gray-500">Claude Digital Employee — long-running business tasks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/ai-work/schedule" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Calendar size={14} /> Schedules
          </Link>
          <Link href="/ai-work/activity" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Activity size={14} /> Activity
          </Link>
          <Link href="/ai-work/tasks" className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <ListTodo size={14} /> All Tasks
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                <Icon size={16} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{loading ? '–' : s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Token usage summary */}
      {data && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-8">
          <div>
            <div className="text-xs text-gray-500">Tokens used (30d)</div>
            <div className="text-xl font-bold text-indigo-700">{data.last30Days.totalTokens.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Estimated cost (30d)</div>
            <div className="text-xl font-bold text-indigo-700">${data.last30Days.totalCostUsd.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">By provider</div>
            <div className="flex gap-2 mt-1">
              {data.byProvider.map(p => (
                <span key={p.provider} className="text-xs px-2 py-0.5 bg-white border border-indigo-200 rounded-full text-indigo-700">
                  {p.provider === 'mock' ? 'Reno Brain' : 'Claude'}: {p.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent tasks */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Tasks</h2>
          <Link href="/ai-work/tasks" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : !data?.recentTasks.length ? (
          <div className="p-8 text-center text-gray-400">
            <Bot size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No tasks yet. Start by creating an AI work task.</p>
            <Link href="/ai-work/tasks" className="inline-flex mt-3 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              Create Task
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.recentTasks.map(task => (
              <Link key={task.id} href={`/ai-work/tasks/${task.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{task.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {task.provider === 'mock' ? 'Reno Brain' : 'Claude'} · {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLOR[task.riskLevel]}`}>{task.riskLevel}</span>
                  <StatusBadge status={task.status} />
                  {task.status === 'running' && (
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${task.progressPct}%` }} />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
