'use client'

import { useEffect, useState } from 'react'
import { Command, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react'

const TENANT_ID = 'default-tenant'
const USER_ID = 'default-user'

interface WorkspaceCommand {
  id: string; prompt: string; commandType: string; status: string
  requiresApproval: boolean; approvedAt: string | null; executedAt: string | null
  error: string | null; createdAt: string
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending Approval', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  approved:  { label: 'Approved',         color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
  executed:  { label: 'Executed',         color: 'text-blue-700 bg-blue-50 border-blue-200',   icon: CheckCircle },
  rejected:  { label: 'Rejected',         color: 'text-red-700 bg-red-50 border-red-200',     icon: XCircle },
  failed:    { label: 'Failed',           color: 'text-red-700 bg-red-50 border-red-200',     icon: XCircle },
}

const TYPE_COLORS: Record<string, string> = {
  document: 'bg-amber-100 text-amber-700', dashboard: 'bg-cyan-100 text-cyan-700',
  task: 'bg-violet-100 text-violet-700', report: 'bg-emerald-100 text-emerald-700',
}

export default function WorkspaceCommandsPage() {
  const [commands, setCommands] = useState<WorkspaceCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [actioning, setActioning] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const statusParam = filter !== 'all' ? `&status=${filter}` : ''
    const res = await fetch(`/api/v1/ai-workspace/commands?tenantId=${TENANT_ID}&userId=${USER_ID}${statusParam}`)
      .then(r => r.json()).catch(() => ({}))
    setCommands(res.commands ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function handleApprove(id: string) {
    setActioning(id)
    await fetch(`/api/v1/ai-workspace/commands/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, userId: USER_ID }),
    })
    load()
    setActioning(null)
  }

  async function handleReject(id: string) {
    setActioning(id)
    await fetch(`/api/v1/ai-workspace/commands/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID }),
    })
    load()
    setActioning(null)
  }

  const pendingCount = commands.filter(c => c.status === 'pending').length

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Command size={20} className="text-violet-600" />
          <h1 className="text-xl font-bold text-gray-900">Command Approvals</h1>
          {pendingCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button type="button" onClick={load} className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
          <RefreshCw size={14} />
        </button>
      </div>

      <p className="text-sm text-gray-500">
        AI commands that create documents, tasks, or dashboards require your approval before being applied to the system.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            You have <strong>{pendingCount}</strong> command{pendingCount !== 1 ? 's' : ''} waiting for your approval. Review each one carefully before approving.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-violet-400" />Loading...
          </div>
        ) : commands.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Command size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No commands yet. Commands appear here when AI actions require approval.</p>
          </div>
        ) : commands.map(cmd => {
          const meta = STATUS_META[cmd.status] ?? STATUS_META['pending']
          const StatusIcon = meta.icon
          return (
            <div key={cmd.id} className="p-4 border-b border-gray-50 last:border-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${meta.color}`}>
                      <StatusIcon size={10} className="inline mr-1" />{meta.label}
                    </span>
                    {cmd.commandType && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[cmd.commandType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {cmd.commandType}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{cmd.prompt}</p>
                  <div className="text-xs text-gray-400 mt-1.5">
                    {new Date(cmd.createdAt).toLocaleString()}
                    {cmd.approvedAt && ` · Approved ${new Date(cmd.approvedAt).toLocaleDateString()}`}
                  </div>
                  {cmd.error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{cmd.error}</div>
                  )}
                </div>

                {cmd.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => handleReject(cmd.id)} disabled={actioning === cmd.id}
                      className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition">
                      Reject
                    </button>
                    <button type="button" onClick={() => handleApprove(cmd.id)} disabled={actioning === cmd.id}
                      className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition">
                      {actioning === cmd.id ? '...' : 'Approve'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
