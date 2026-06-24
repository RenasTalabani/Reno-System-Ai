'use client'

import { useEffect, useState, useCallback } from 'react'
import { Megaphone, Plus, Star, Eye, CheckCircle, AlertTriangle, Pencil, Trash2 } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  important: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
const PRIORITY_ICONS: Record<string, any> = {
  normal: null,
  important: AlertTriangle,
  critical: AlertTriangle,
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', isPinned: false, expiresAt: '' })

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const res = await fetch('/api/v1/comm/announcements?limit=50', { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    if (data.success) setAnnouncements(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ title: '', content: '', priority: 'normal', isPinned: false, expiresAt: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(a: any) {
    setEditing(a)
    setForm({ title: a.title, content: a.content, priority: a.priority, isPinned: a.isPinned, expiresAt: a.expiresAt?.split('T')[0] ?? '' })
    setError('')
    setShowModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content required'); return }
    setSaving(true); setError('')
    const body = { ...form, expiresAt: form.expiresAt || undefined }
    const url = editing ? `/api/v1/comm/announcements/${editing.id}` : '/api/v1/comm/announcements'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) { setShowModal(false); await load() } else setError(data.error ?? 'Failed')
    setSaving(false)
  }

  async function markRead(id: string) {
    await fetch(`/api/v1/comm/announcements/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } })
    await load()
  }

  async function del(id: string) {
    if (!confirm('Delete this announcement?')) return
    await fetch(`/api/v1/comm/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    await load()
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">Company-wide and team announcements</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => {
            const isRead = a.reads?.length > 0
            const PIcon = PRIORITY_ICONS[a.priority]
            return (
              <div key={a.id} className={`bg-white border rounded-xl p-5 ${!isRead ? 'border-indigo-200' : 'border-gray-100'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.priority === 'critical' ? 'bg-red-100' : a.priority === 'important' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    {PIcon ? <PIcon className={`w-5 h-5 ${a.priority === 'critical' ? 'text-red-600' : 'text-orange-600'}`} /> : <Megaphone className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.isPinned && <Star className="w-3.5 h-3.5 text-yellow-500 fill-current shrink-0" />}
                        <h2 className="text-sm font-semibold text-gray-800">{a.title}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[a.priority] ?? ''}`}>
                          {a.priority}
                        </span>
                        {!isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => del(a.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {a._count?.reads ?? 0} read</span>
                      {a.team && <span>Team: {a.team.name}</span>}
                      {a.expiresAt && <span>Expires: {new Date(a.expiresAt).toLocaleDateString()}</span>}
                    </div>
                    {!isRead && (
                      <button onClick={() => markRead(a.id)}
                        className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                        <CheckCircle className="w-3 h-3" /> Mark as read
                      </button>
                    )}
                    {isRead && <p className="mt-2 flex items-center gap-1 text-xs text-green-500"><CheckCircle className="w-3 h-3" /> Read</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Content <span className="text-red-500">*</span></label>
              <textarea rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {['normal', 'important', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expires At</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} className="w-4 h-4 rounded" />
              <Star className="w-3.5 h-3.5 text-yellow-500" /> Pin this announcement
            </label>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Saving...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
