'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, CheckCircle, XCircle, Play, Pause, AlertTriangle, Clock, Bot } from 'lucide-react'

interface AuditLog {
  id: string; taskId: string | null; userId: string | null
  action: string; provider: string | null; details: Record<string, unknown> | null
  occurredAt: string
}

const ACTION_ICON: Record<string, any> = {
  task_created: Bot,
  task_planning_started: Clock,
  task_execution_started: Play,
  task_completed: CheckCircle,
  task_failed: XCircle,
  task_paused: Pause,
  task_cancelled: XCircle,
  task_resumed: Play,
  schedule_created: Clock,
}

const ACTION_COLOR: Record<string, string> = {
  task_created: 'text-blue-600 bg-blue-50',
  task_planning_started: 'text-purple-600 bg-purple-50',
  task_execution_started: 'text-indigo-600 bg-indigo-50',
  task_completed: 'text-green-700 bg-green-100',
  task_failed: 'text-red-700 bg-red-100',
  task_paused: 'text-orange-600 bg-orange-50',
  task_cancelled: 'text-gray-600 bg-gray-100',
  task_resumed: 'text-indigo-600 bg-indigo-50',
  schedule_created: 'text-teal-700 bg-teal-50',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AiWorkActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/ai-work/tasks/activity/feed?limit=100')
      .then(r => r.json())
      .then(d => { setLogs(d.feed ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">AI Activity Feed</h1>
      </div>
      <p className="text-sm text-gray-500">Every action taken by Claude and Reno Brain on your behalf.</p>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading activity...</div>
        ) : !logs.length ? (
          <div className="p-8 text-center text-gray-400">
            <Activity size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No activity yet.</p>
          </div>
        ) : logs.map(log => {
          const Icon = ACTION_ICON[log.action] ?? Bot
          const colorClass = ACTION_COLOR[log.action] ?? 'text-gray-600 bg-gray-100'
          return (
            <div key={log.id} className="flex items-start gap-3 p-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800">
                  <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                  {log.provider && <span className="ml-1.5 text-xs text-gray-400">via {log.provider === 'mock' ? 'Reno Brain' : 'Claude'}</span>}
                </div>
                {log.taskId && (
                  <Link href={`/ai-work/tasks/${log.taskId}`} className="text-xs text-indigo-500 hover:underline mt-0.5 block">
                    View task →
                  </Link>
                )}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-1 text-xs text-gray-400">
                    {Object.entries(log.details).slice(0, 3).map(([k, v]) => (
                      <span key={k} className="mr-3">{k}: {String(v)}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 shrink-0">{timeAgo(log.occurredAt)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
