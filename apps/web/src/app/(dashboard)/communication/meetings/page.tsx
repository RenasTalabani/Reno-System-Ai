'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Video, Plus, Clock, Users, CheckCircle, XCircle, Zap, Calendar } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
}

const TYPE_ICONS: Record<string, any> = {
  instant: Zap,
  scheduled: Calendar,
  recurring: Clock,
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', type: 'scheduled', scheduledAt: '', maxParticipants: '' })

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50', ...(filter && { status: filter }) })
    const res = await fetch(`/api/v1/comm/meetings?${params}`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    if (data.success) setMeetings(data.data)
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function create() {
    if (!form.title.trim()) { setError('Title required'); return }
    setSaving(true); setError('')
    const body: any = { title: form.title.trim(), description: form.description || undefined, type: form.type }
    if (form.scheduledAt) body.scheduledAt = form.scheduledAt
    if (form.maxParticipants) body.maxParticipants = Number(form.maxParticipants)
    const res = await fetch('/api/v1/comm/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) { setShowModal(false); await load() } else setError(data.error ?? 'Failed')
    setSaving(false)
  }

  async function startMeeting(id: string) {
    await fetch(`/api/v1/comm/meetings/${id}/start`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } })
    await load()
  }

  async function endMeeting(id: string) {
    await fetch(`/api/v1/comm/meetings/${id}/end`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: '{}' })
    await load()
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">Audio calls, video meetings, and screen sharing</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setForm({ title: 'Instant Meeting', description: '', type: 'instant', scheduledAt: '', maxParticipants: '' }); setError(''); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            <Zap className="w-4 h-4 text-orange-500" /> Instant
          </button>
          <button onClick={() => { setForm({ title: '', description: '', type: 'scheduled', scheduledAt: '', maxParticipants: '' }); setError(''); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['', 'All'], ['scheduled', 'Scheduled'], ['active', 'Active'], ['ended', 'Ended']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${filter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Video className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No meetings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => {
            const TypeIcon = TYPE_ICONS[m.type] ?? Video
            return (
              <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.status === 'active' ? 'bg-green-100' : 'bg-indigo-50'}`}>
                      <TypeIcon className={`w-5 h-5 ${m.status === 'active' ? 'text-green-600' : 'text-indigo-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/communication/meetings/${m.id}`} className="text-sm font-semibold text-gray-800 hover:text-indigo-600 truncate">
                          {m.title}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status] ?? ''}`}>
                          {m.status}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">{m.type}</span>
                      </div>
                      {m.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{m.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {m.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(m.scheduledAt).toLocaleString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {m._count?.participants ?? 0} participants
                        </span>
                        {m.durationMinutes && (
                          <span>{m.durationMinutes} min</span>
                        )}
                        {m.channel && (
                          <span className="text-indigo-400">#{m.channel.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.status === 'scheduled' && (
                      <button onClick={() => startMeeting(m.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">
                        <Video className="w-3.5 h-3.5" /> Start
                      </button>
                    )}
                    {m.status === 'active' && (
                      <>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors">
                          <Video className="w-3.5 h-3.5" /> Join
                        </button>
                        <button onClick={() => endMeeting(m.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> End
                        </button>
                      </>
                    )}
                    {m.status === 'ended' && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                    <Link href={`/communication/meetings/${m.id}`}
                      className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors">
                      Details
                    </Link>
                  </div>
                </div>

                {/* AI Summary preview */}
                {m.aiSummary && (
                  <div className="mt-3 bg-purple-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-purple-700 mb-0.5">AI Summary</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{m.aiSummary}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {form.type === 'instant' ? 'Start Instant Meeting' : 'Schedule Meeting'}
            </h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>

            {form.type === 'scheduled' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled At</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Participants</label>
              <input type="number" min={2} value={form.maxParticipants} onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))}
                placeholder="No limit"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={create} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Creating...' : form.type === 'instant' ? 'Start Now' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
