'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface ApprovalGate {
  id: string
  title: string
  description: string | null
  riskLevel: string
  status: string
  requestedAt: string
  requestedBy: string
  expiresAt: string | null
  payload: any
  workflow: { name: string; slug: string; category: string | null }
  execution: { status: string; triggerType: string; startedAt: string }
}

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
}

export default function ApprovalsPage() {
  const [gates, setGates] = useState<ApprovalGate[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => { load() }, [statusFilter])

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/v1/automation/approvals?status=${statusFilter}&limit=50`)
    const d = await r.json()
    setGates(d.data ?? [])
    setLoading(false)
  }

  async function approve(id: string) {
    setProcessing(id)
    await fetch(`/api/v1/automation/approvals/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setProcessing(null)
    load()
  }

  async function reject(id: string) {
    setProcessing(id)
    await fetch(`/api/v1/automation/approvals/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectNote }),
    })
    setProcessing(null)
    setRejectingId(null)
    setRejectNote('')
    load()
  }

  const pendingCount = gates.filter(g => g.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Approvals</h1>
          <p className="text-gray-500 text-sm">Human approval gates — review before automation continues</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-lg">
            {pendingCount} Pending
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'expired'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading approvals...</div>
      ) : gates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No {statusFilter} approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gates.map(gate => (
            <div key={gate.id}
              className={`bg-white rounded-xl border overflow-hidden ${gate.status === 'pending' ? 'border-yellow-200 shadow-sm' : 'border-gray-200'}`}>
              <div className="p-4 flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${RISK_STYLES[gate.riskLevel] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {gate.status === 'approved' ? <CheckCircle size={14} /> :
                   gate.status === 'rejected' ? <XCircle size={14} /> :
                   <AlertTriangle size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{gate.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_STYLES[gate.riskLevel] ?? 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                      {gate.riskLevel} risk
                    </span>
                  </div>
                  {gate.description && <p className="text-sm text-gray-500 mb-2">{gate.description}</p>}
                  <div className="text-xs text-gray-400 flex items-center gap-3">
                    <span>Workflow: {gate.workflow.name}</span>
                    <span>Trigger: {gate.execution.triggerType}</span>
                    <span>{new Date(gate.requestedAt).toLocaleString()}</span>
                    {gate.expiresAt && <span className="text-orange-500">Expires: {new Date(gate.expiresAt).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setExpandedId(expandedId === gate.id ? null : gate.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600">
                    {expandedId === gate.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {gate.status === 'pending' && (
                    <>
                      <button onClick={() => approve(gate.id)} disabled={processing === gate.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                        Approve
                      </button>
                      <button onClick={() => setRejectingId(gate.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg hover:bg-red-100">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expandedId === gate.id && gate.payload && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1 mt-3">Workflow Payload</p>
                  <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-700">
                    {JSON.stringify(gate.payload, null, 2)}
                  </pre>
                </div>
              )}

              {rejectingId === gate.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rejection reason (optional)</label>
                  <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={2}
                    placeholder="Explain why this workflow should not proceed..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-violet-400" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => reject(gate.id)} disabled={processing === gate.id}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50">
                      Confirm Reject
                    </button>
                    <button onClick={() => { setRejectingId(null); setRejectNote('') }}
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
