'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, AlertTriangle, Clock, User, Tag, MessageSquare,
  Send, Lock, Unlock, CheckCircle, RefreshCw, Star,
} from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
}

const STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed', 'cancelled']
const PRIORITIES = ['critical', 'high', 'medium', 'low']

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [csatRating, setCsatRating] = useState<number | null>(null)
  const [csatSubmitting, setCsatSubmitting] = useState(false)

  const token = () => localStorage.getItem('accessToken') ?? ''

  const loadTicket = useCallback(async () => {
    const [tRes, cRes, aRes] = await Promise.all([
      fetch(`/api/v1/helpdesk/tickets/${id}`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`/api/v1/helpdesk/tickets/${id}/comments`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/helpdesk/agents', { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [tData, cData, aData] = await Promise.all([tRes.json(), cRes.json(), aRes.json()])
    if (tData.success) setTicket(tData.data)
    if (cData.success) setComments(cData.data)
    if (aData.success) setAgents(aData.data)
    setLoading(false)
  }, [id])

  useEffect(() => { loadTicket() }, [loadTicket])

  async function patchTicket(path: string, body: any) {
    const res = await fetch(`/api/v1/helpdesk/tickets/${id}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) setTicket(data.data)
    return data
  }

  async function submitComment() {
    if (!commentText.trim()) return
    setCommenting(true)
    const res = await fetch(`/api/v1/helpdesk/tickets/${id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText.trim(), isInternal }),
    })
    const data = await res.json()
    if (data.success) {
      setComments(prev => [...prev, data.data])
      setCommentText('')
      await loadTicket()
    }
    setCommenting(false)
  }

  async function submitCsat() {
    if (!csatRating) return
    setCsatSubmitting(true)
    const res = await fetch(`/api/v1/helpdesk/tickets/${id}/csat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: csatRating }),
    })
    const data = await res.json()
    if (data.success) await loadTicket()
    setCsatSubmitting(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }
  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">Ticket not found</p>
        <Link href="/helpdesk/tickets" className="text-indigo-600 text-sm hover:underline">Back to tickets</Link>
      </div>
    )
  }

  const isClosed = ['closed', 'cancelled', 'resolved'].includes(ticket.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-indigo-600 font-medium">{ticket.number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[ticket.priority] ?? ''}`}>
              {ticket.priority}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status] ?? ''}`}>
              {ticket.status?.replace(/_/g, ' ')}
            </span>
            {ticket.slaBreached && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> SLA Breached
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            {ticket.tags?.length > 0 && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                {ticket.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Comments ({comments.length})</h2>
            </div>

            <div className="divide-y divide-gray-50">
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No comments yet</p>
              )}
              {comments.map(c => (
                <div key={c.id} className={`p-5 ${c.isInternal ? 'bg-yellow-50/50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 font-bold">
                        {c.user?.firstName?.charAt(0) ?? 'U'}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {c.user?.firstName ? `${c.user.firstName} ${c.user.lastName ?? ''}`.trim() : 'Unknown'}
                      </span>
                      {c.isInternal && (
                        <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" /> Internal
                        </span>
                      )}
                      {c.isAiSuggested && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">AI</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>

            {/* Add comment */}
            {!isClosed && (
              <div className="p-5 border-t border-gray-100">
                <textarea
                  rows={3}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-4 h-4 rounded" />
                    {isInternal ? <Lock className="w-3.5 h-3.5 text-yellow-600" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                    Internal note
                  </label>
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim() || commenting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> {commenting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CSAT */}
          {(ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.csat && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Rate this resolution</h2>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setCsatRating(n)}
                    className={`p-1 rounded transition-colors ${csatRating === n ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                  >
                    <Star className={`w-7 h-7 ${csatRating && n <= csatRating ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <button
                  onClick={submitCsat}
                  disabled={!csatRating || csatSubmitting}
                  className="ml-4 px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {csatSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          )}
          {ticket.csat && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-700">
                CSAT rating submitted: {ticket.csat.rating}/5
                {ticket.csat.feedback && ` — "${ticket.csat.feedback}"`}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar panel */}
        <div className="space-y-4">
          {/* Ticket info */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Ticket Details</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Type</span>
                <span className="text-gray-700 capitalize">{ticket.type}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Source</span>
                <span className="text-gray-700 capitalize">{ticket.source?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Category</span>
                <span className="text-gray-700">{ticket.category?.name ?? '—'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Requester</span>
                <span className="text-gray-700">{ticket.requesterType ?? '—'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Created</span>
                <span className="text-gray-700">{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              {ticket.firstResponseAt && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 w-24 shrink-0">First Reply</span>
                  <span className="text-gray-700">{new Date(ticket.firstResponseAt).toLocaleString()}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Resolved</span>
                  <span className="text-gray-700">{new Date(ticket.resolvedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* SLA */}
          {(ticket.firstResponseDue || ticket.resolutionDue) && (
            <div className={`border rounded-xl p-5 ${ticket.slaBreached ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className={`w-4 h-4 ${ticket.slaBreached ? 'text-red-500' : 'text-gray-400'}`} />
                <h2 className="text-sm font-semibold text-gray-700">SLA</h2>
              </div>
              <div className="space-y-2 text-sm">
                {ticket.firstResponseDue && (
                  <div>
                    <p className="text-xs text-gray-400">First Response Due</p>
                    <p className={`font-medium ${ticket.slaBreached ? 'text-red-600' : 'text-gray-700'}`}>
                      {new Date(ticket.firstResponseDue).toLocaleString()}
                    </p>
                  </div>
                )}
                {ticket.resolutionDue && (
                  <div>
                    <p className="text-xs text-gray-400">Resolution Due</p>
                    <p className={`font-medium ${ticket.slaBreached ? 'text-red-600' : 'text-gray-700'}`}>
                      {new Date(ticket.resolutionDue).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          {!isClosed && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Actions</h2>

              {/* Status */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Change Status</label>
                <select
                  value={ticket.status}
                  onChange={e => patchTicket('/status', { status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Change Priority</label>
                <select
                  value={ticket.priority}
                  onChange={e => patchTicket('/priority', { priority: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Assign agent */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Assign Agent</label>
                <select
                  value={ticket.agentId ?? ''}
                  onChange={e => patchTicket('/assign', { agentId: e.target.value || null })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.user?.firstName ? `${a.user.firstName} ${a.user.lastName ?? ''}`.trim() : a.user?.displayName ?? 'Agent'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Close / Reopen */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                {ticket.status !== 'resolved' && (
                  <button
                    onClick={() => patchTicket('/status', { status: 'resolved' })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                  </button>
                )}
                <button
                  onClick={() => patchTicket('/close', {})}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close Ticket
                </button>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <button
                onClick={() => patchTicket('/reopen', {})}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 text-sm rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reopen Ticket
              </button>
            </div>
          )}

          {/* AI fields */}
          {(ticket.aiCategory || ticket.aiPriority || ticket.aiSentiment || ticket.aiSummary) && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
              <p className="text-xs font-semibold text-purple-700 mb-3 uppercase tracking-wide">AI Analysis</p>
              <div className="space-y-2 text-sm">
                {ticket.aiCategory && <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="text-purple-700 font-medium">{ticket.aiCategory}</span></div>}
                {ticket.aiPriority && <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="text-purple-700 font-medium">{ticket.aiPriority}</span></div>}
                {ticket.aiSentiment && <div className="flex justify-between"><span className="text-gray-500">Sentiment</span><span className="text-purple-700 font-medium">{ticket.aiSentiment}</span></div>}
                {ticket.aiConfidence != null && <div className="flex justify-between"><span className="text-gray-500">Confidence</span><span className="text-purple-700 font-medium">{Math.round(ticket.aiConfidence * 100)}%</span></div>}
                {ticket.aiSummary && <div className="mt-2"><p className="text-xs text-gray-400 mb-1">Summary</p><p className="text-gray-600 text-xs">{ticket.aiSummary}</p></div>}
              </div>
            </div>
          )}

          {/* Assignee info */}
          {ticket.agent && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Assigned Agent</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm text-indigo-700 font-bold">
                  {ticket.agent.user?.firstName?.charAt(0) ?? 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {ticket.agent.user?.firstName ? `${ticket.agent.user.firstName} ${ticket.agent.user.lastName ?? ''}`.trim() : 'Agent'}
                  </p>
                  <p className="text-xs text-gray-400">{ticket.agent.isAvailable ? 'Available' : 'Busy'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
