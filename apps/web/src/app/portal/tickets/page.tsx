'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ticket {
  id: string
  number: string
  subject: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  _count?: { replies: number }
}

interface Reply {
  id: string
  content: string
  userId: string
  createdAt: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-100 text-gray-500',
}

export default function PortalTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replies, setReplies] = useState<Record<string, Reply[]>>({})
  const [replyText, setReplyText] = useState('')
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'normal' })
  const [submitting, setSubmitting] = useState(false)

  const token = () => localStorage.getItem('accessToken') ?? ''

  useEffect(() => {
    fetch('/api/v1/portal/tickets', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setTickets(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const expandTicket = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!replies[id]) {
      const res = await fetch(`/api/v1/portal/tickets/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      const data = await res.json()
      if (data.success) setReplies(prev => ({ ...prev, [id]: data.data.replies ?? [] }))
    }
  }

  const submitTicket = async () => {
    if (!form.subject || !form.description) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/portal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, portalType: 'employee' }),
      })
      const data = await res.json()
      if (data.success) {
        setTickets(prev => [data.data, ...prev])
        setShowForm(false)
        setForm({ subject: '', description: '', category: 'general', priority: 'normal' })
      }
    } finally { setSubmitting(false) }
  }

  const sendReply = async (ticketId: string) => {
    if (!replyText.trim()) return
    const res = await fetch(`/api/v1/portal/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ content: replyText }),
    })
    const data = await res.json()
    if (data.success) {
      setReplies(prev => ({ ...prev, [ticketId]: [...(prev[ticketId] ?? []), data.data] }))
      setReplyText('')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Get help from our team</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--portal-primary, #6366f1)' }}
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Submit Support Ticket</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brief description of your issue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {['general', 'billing', 'technical', 'hr', 'procurement'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {['low', 'normal', 'high', 'urgent'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Describe your issue in detail..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={submitTicket}
              disabled={submitting || !form.subject || !form.description}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--portal-primary, #6366f1)' }}
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {!tickets.length ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tickets yet. Need help? Submit a ticket.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => expandTicket(ticket.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-gray-400 shrink-0">{ticket.number}</span>
                  <p className="font-medium text-gray-800 truncate">{ticket.subject}</p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0">{ticket.category}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100 text-gray-600')}>
                    {ticket.priority}
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600')}>
                    {ticket.status}
                  </span>
                  {ticket._count && <span className="text-xs text-gray-400">{ticket._count.replies} replies</span>}
                  {expanded === ticket.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expanded === ticket.id && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Replies */}
                  {(replies[ticket.id] ?? []).length > 0 && (
                    <div className="space-y-3">
                      {(replies[ticket.id] ?? []).map(reply => (
                        <div key={reply.id} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm text-gray-800">{reply.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(reply.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {ticket.status !== 'closed' && (
                    <div className="flex items-end gap-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Add a reply..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                      <button
                        onClick={() => sendReply(ticket.id)}
                        disabled={!replyText.trim()}
                        className="p-2 rounded-lg text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'var(--portal-primary, #6366f1)' }}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
