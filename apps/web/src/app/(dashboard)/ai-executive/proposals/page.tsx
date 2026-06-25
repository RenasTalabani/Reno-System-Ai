'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Play, Target, AlertTriangle } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  executed: 'bg-green-100 text-green-700',
  executing: 'bg-indigo-100 text-indigo-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    const qs = status ? `?status=${status}` : ''
    fetch(`/api/v1/ai-exec/proposals${qs}`).then(r => r.json()).then(d => { setProposals(d.data ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [status])

  const act = async (id: string, action: 'approve' | 'reject' | 'execute', notes?: string) => {
    setActing(id)
    try {
      await fetch(`/api/v1/ai-exec/proposals/${id}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { reason: notes ?? 'Rejected by user' } : { notes }),
      })
      load()
    } finally { setActing(null) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Proposals</h1>
          <p className="text-sm text-gray-500">AI-generated task and workflow proposals — human approval required</p>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="executed">Executed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Human approval gate notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900 text-sm">Human Approval Gate Active</p>
          <p className="text-xs text-amber-700 mt-0.5">All AI proposals require explicit human approval before any action is taken. The AI cannot self-approve or auto-execute.</p>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading proposals...</div> :
        proposals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No proposals found</p>
            <p className="text-sm text-gray-400 mt-1">Chat with an AI executive to receive proposals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{p.status?.replace('_', ' ')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[p.priority] ?? 'bg-gray-100 text-gray-600'}`}>{p.priority}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.proposalType}</span>
                      {p.executiveRole && <span className="text-xs text-gray-500">from {p.executiveRole}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                    {p.rationale && <p className="text-xs text-gray-500 mt-2 italic">Rationale: {p.rationale}</p>}
                    {p.estimatedImpact && <p className="text-xs text-indigo-600 mt-1">Expected impact: {p.estimatedImpact}</p>}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {p.status === 'pending_approval' && (
                      <>
                        <button onClick={() => act(p.id, 'approve')} disabled={acting === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" />Approve
                        </button>
                        <button onClick={() => act(p.id, 'reject')} disabled={acting === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" />Reject
                        </button>
                      </>
                    )}
                    {p.status === 'approved' && (
                      <button onClick={() => act(p.id, 'execute')} disabled={acting === p.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                        <Play className="w-3.5 h-3.5" />Execute
                      </button>
                    )}
                  </div>
                </div>
                {p.approvalNote && <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">Note: {p.approvalNote}</p>}
                {p.executionResult && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-green-600">Execution result: {JSON.stringify(p.executionResult)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
