'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Play, Lightbulb } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  implemented: 'bg-green-100 text-green-700',
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

export default function RecommendationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    const qs = status ? `?status=${status}` : ''
    fetch(`/api/v1/ai-exec/recommendations${qs}`).then(r => r.json()).then(d => { setItems(d.data ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [status])

  const act = async (id: string, action: 'approve' | 'reject' | 'implement', notes?: string) => {
    setActing(id)
    try {
      await fetch(`/api/v1/ai-exec/recommendations/${id}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { reason: notes } : { notes, outcomeNotes: notes }),
      })
      load()
    } finally { setActing(null) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Recommendations</h1>
          <p className="text-sm text-gray-500">Review and approve AI executive recommendations</p>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="implemented">Implemented</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recommendations found</p>
            <p className="text-sm text-gray-400 mt-1">Chat with an AI executive to generate recommendations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${IMPACT_COLORS[item.impactLevel] ?? 'bg-gray-100 text-gray-600'}`}>{item.impactLevel} impact</span>
                      {item.executiveRole && <span className="text-xs text-gray-500">from {item.executiveRole}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    {item.rationale && <p className="text-xs text-gray-500 mt-2 italic">Rationale: {item.rationale}</p>}
                  </div>
                  {item.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => act(item.id, 'approve')} disabled={acting === item.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                        <CheckCircle className="w-3.5 h-3.5" />Approve
                      </button>
                      <button onClick={() => act(item.id, 'reject', 'Rejected by user')} disabled={acting === item.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </button>
                    </div>
                  )}
                  {item.status === 'approved' && (
                    <button onClick={() => act(item.id, 'implement', 'Implemented successfully')} disabled={acting === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 shrink-0">
                      <Play className="w-3.5 h-3.5" />Mark Implemented
                    </button>
                  )}
                </div>
                {item.outcome && <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">Outcome: {item.outcome}</p>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
