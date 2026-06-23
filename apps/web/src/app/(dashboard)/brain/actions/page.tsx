'use client'

import { useEffect, useState } from 'react'
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface Action {
  id: string
  actionType: string
  module: string
  title: string
  description: string | null
  payload: any
  riskLevel: string
  status: string
  requiresApproval: boolean
  proposedAt: string
  createdBy: string
  agent: { name: string; slug: string } | null
}

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  executed: 'bg-blue-100 text-blue-700',
  failed: 'bg-gray-100 text-gray-600',
}

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadActions()
  }, [statusFilter])

  async function loadActions() {
    setLoading(true)
    const r = await fetch(`/api/v1/brain/actions?status=${statusFilter}&limit=50`)
    const d = await r.json()
    setActions(d.data ?? [])
    setLoading(false)
  }

  async function approve(id: string) {
    await fetch(`/api/v1/brain/actions/${id}/approve`, { method: 'POST' })
    loadActions()
  }

  async function reject(id: string) {
    await fetch(`/api/v1/brain/actions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    setRejecting(null)
    setRejectReason('')
    loadActions()
  }

  const pendingCount = actions.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Action Approval Queue</h1>
          <p className="text-gray-500 text-sm">AI-proposed actions awaiting human review before execution</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm font-semibold rounded-lg">
            {pendingCount} Pending
          </span>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'executed', 'failed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading actions...</div>
      ) : actions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No {statusFilter} actions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map(action => (
            <div key={action.id} className={`bg-white rounded-xl border ${action.status === 'pending' ? 'border-orange-200' : 'border-gray-200'} overflow-hidden`}>
              <div className="p-4 flex items-start gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  action.riskLevel === 'critical' ? 'bg-red-100' :
                  action.riskLevel === 'high' ? 'bg-orange-100' :
                  action.riskLevel === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  {action.status === 'approved' || action.status === 'executed'
                    ? <CheckCircle size={14} className="text-green-600" />
                    : action.status === 'rejected'
                    ? <XCircle size={14} className="text-red-500" />
                    : action.riskLevel === 'critical' || action.riskLevel === 'high'
                    ? <AlertTriangle size={14} className="text-orange-600" />
                    : <Clock size={14} className="text-yellow-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{action.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STYLES[action.riskLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                      {action.riskLevel} risk
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[action.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {action.status}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{action.module}</span>
                  </div>
                  {action.description && (
                    <p className="text-sm text-gray-500 mb-2">{action.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {action.agent && <span>Agent: {action.agent.name}</span>}
                    <span>Type: {action.actionType}</span>
                    <span>{new Date(action.proposedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600">
                    {expandedId === action.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {action.status === 'pending' && (
                    <>
                      <button onClick={() => approve(action.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
                        Approve
                      </button>
                      <button onClick={() => setRejecting(action.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg hover:bg-red-100">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded payload */}
              {expandedId === action.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Action Payload</p>
                  <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-700">
                    {JSON.stringify(action.payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Reject reason input */}
              {rejecting === action.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rejection reason (optional)</label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Explain why this action was rejected..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-400"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => reject(action.id)}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">
                      Confirm Reject
                    </button>
                    <button onClick={() => { setRejecting(null); setRejectReason('') }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
