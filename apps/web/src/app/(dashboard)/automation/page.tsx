'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Workflow, Zap, CheckCircle, XCircle, Clock, Play, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

interface DashboardData {
  summary: {
    totalWorkflows: number
    enabledWorkflows: number
    pendingApprovals: number
    executions7d: number
    totalEventTypes: number
  }
  statusBreakdown: Record<string, number>
  recentExecutions: {
    id: string
    status: string
    triggerType: string
    startedAt: string
    durationMs: number | null
    workflow: { name: string; category: string | null }
  }[]
  topWorkflows: {
    id: string
    name: string
    totalRuns: number
    successRuns: number
    failedRuns: number
    lastRunStatus: string | null
    isEnabled: boolean
  }[]
}

const STATUS_STYLES: Record<string, { color: string; icon: any }> = {
  completed: { color: 'text-green-600 bg-green-50', icon: CheckCircle },
  failed: { color: 'text-red-500 bg-red-50', icon: XCircle },
  running: { color: 'text-blue-600 bg-blue-50', icon: Activity },
  waiting_approval: { color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  cancelled: { color: 'text-gray-400 bg-gray-50', icon: XCircle },
  pending: { color: 'text-gray-500 bg-gray-50', icon: Clock },
}

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual', scheduled: 'Scheduled', event: 'Event', webhook: 'Webhook',
}

export default function AutomationPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/automation/dashboard')
      .then(r => r.json())
      .then(d => setData(d.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading Automation...</div>
  if (!data) return <div className="p-6 text-gray-500">No data</div>

  const successCount = data.statusBreakdown.completed ?? 0
  const failedCount = data.statusBreakdown.failed ?? 0
  const totalExec = Object.values(data.statusBreakdown).reduce((a, b) => a + b, 0)
  const successRate = totalExec > 0 ? Math.round((successCount / totalExec) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Workflow size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
            <p className="text-gray-500 text-sm">Cross-module workflow engine</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.summary.pendingApprovals > 0 && (
            <Link href="/automation/approvals"
              className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg hover:bg-yellow-100">
              {data.summary.pendingApprovals} Pending Approvals
            </Link>
          )}
          <Link href="/automation/workflows"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
            <Workflow size={14} />
            Workflows
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Workflows', value: data.summary.totalWorkflows, sub: `${data.summary.enabledWorkflows} enabled` },
          { label: 'Runs This Week', value: data.summary.executions7d, sub: 'Last 7 days' },
          { label: 'Success Rate', value: `${successRate}%`, sub: `${successCount} / ${totalExec} runs` },
          { label: 'Pending Approvals', value: data.summary.pendingApprovals, sub: 'Awaiting decision', urgent: data.summary.pendingApprovals > 0 },
          { label: 'Event Types', value: data.summary.totalEventTypes, sub: 'System events' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border p-4 ${s.urgent ? 'border-yellow-300' : 'border-gray-200'}`}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.urgent ? 'text-yellow-600' : 'text-gray-900'}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      {totalExec > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Execution Status (Last 30 Days)</h3>
          <div className="flex items-center gap-4 flex-wrap">
            {Object.entries(data.statusBreakdown).map(([status, count]) => {
              const style = STATUS_STYLES[status] ?? { color: 'text-gray-500 bg-gray-50', icon: Clock }
              const Icon = style.icon
              return (
                <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${style.color}`}>
                  <Icon size={12} />
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                  <span className="font-bold">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Executions</h3>
            <Link href="/automation/executions" className="text-xs text-violet-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentExecutions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No executions yet</div>
            ) : data.recentExecutions.map(exec => {
              const style = STATUS_STYLES[exec.status] ?? STATUS_STYLES.pending
              const Icon = style.icon
              return (
                <Link key={exec.id} href={`/automation/executions?id=${exec.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.color}`}>
                    <Icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate font-medium">{exec.workflow.name}</p>
                    <p className="text-xs text-gray-400">{TRIGGER_LABEL[exec.triggerType] ?? exec.triggerType} · {new Date(exec.startedAt).toLocaleString()}</p>
                  </div>
                  {exec.durationMs && (
                    <span className="text-xs text-gray-400">{exec.durationMs}ms</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Top Workflows */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Top Workflows</h3>
            <Link href="/automation/workflows" className="text-xs text-violet-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topWorkflows.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No workflows yet</div>
            ) : data.topWorkflows.map(wf => {
              const rate = wf.totalRuns > 0 ? Math.round((wf.successRuns / wf.totalRuns) * 100) : 0
              return (
                <Link key={wf.id} href={`/automation/workflows`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${wf.isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{wf.name}</p>
                    <p className="text-xs text-gray-400">{wf.totalRuns} runs · {rate}% success</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    wf.lastRunStatus === 'completed' ? 'bg-green-50 text-green-600' :
                    wf.lastRunStatus === 'failed' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'
                  }`}>{wf.lastRunStatus ?? 'never'}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'New Workflow', href: '/automation/workflows', icon: Workflow, color: 'bg-violet-50 text-violet-700 border-violet-200' },
          { label: 'Templates', href: '/automation/templates', icon: Zap, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label: 'Approvals', href: '/automation/approvals', icon: AlertTriangle, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          { label: 'Execution History', href: '/automation/executions', icon: Activity, color: 'bg-gray-50 text-gray-700 border-gray-200' },
        ].map(item => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 p-4 rounded-xl border hover:shadow-sm transition-all ${item.color}`}>
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
