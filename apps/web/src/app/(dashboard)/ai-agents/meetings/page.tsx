'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Plus, Users, CheckCircle, Clock, Play } from 'lucide-react'

interface Meeting {
  id: string; title: string; agenda: string; status: string
  decisionsCount: number; startedAt: string | null; endedAt: string | null
  summary: string | null; createdAt: string
  participants: { agentSlug: string; role: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-blue-600 bg-blue-50',
  running: 'text-indigo-600 bg-indigo-50',
  completed: 'text-green-700 bg-green-100',
  cancelled: 'text-gray-500 bg-gray-100',
}

export default function AiMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', agenda: '', agentSlugs: 'ceo,cfo,data-analyst' })
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/v1/ai-agents/meetings/list').then(r => r.json()).catch(() => ({}))
    setMeetings(res.meetings ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    await fetch('/api/v1/ai-agents/meetings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, agentSlugs: form.agentSlugs.split(',').map(s => s.trim()) }),
    })
    setShowCreate(false)
    load()
    setCreating(false)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Calendar size={20} className="text-violet-600" /><h1 className="text-xl font-bold text-gray-900">AI Meetings</h1></div>
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
          <Plus size={14} /> Schedule Meeting
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-gray-900">Schedule AI Meeting</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Agenda</label>
              <textarea required rows={2} value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Participants (agent slugs, comma-separated)</label>
              <input value={form.agentSlugs} onChange={e => setForm(f => ({ ...f, agentSlugs: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg disabled:opacity-50">{creating ? 'Creating...' : 'Schedule'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          : !meetings.length ? (
            <div className="p-8 text-center text-gray-400"><Calendar size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">No meetings yet.</p></div>
          ) : meetings.map(m => (
            <div key={m.id}>
              <button type="button" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className="w-full flex items-start gap-4 p-4 hover:bg-gray-50 text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{m.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {m.participants?.length ?? 0} participants · {m.decisionsCount} decisions · {new Date(m.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
              {expandedId === m.id && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="text-xs text-gray-600"><strong>Agenda:</strong> {m.agenda}</div>
                  {m.summary && <div className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 border whitespace-pre-wrap">{m.summary.slice(0, 800)}</div>}
                  <div className="flex flex-wrap gap-1">
                    {m.participants?.map(p => (
                      <span key={p.agentSlug} className={`text-xs px-1.5 py-0.5 rounded border ${p.role === 'chair' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {p.agentSlug} {p.role === 'chair' ? '(chair)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
