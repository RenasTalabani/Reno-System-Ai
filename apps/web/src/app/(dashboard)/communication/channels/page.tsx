'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Hash, Plus, Lock, Search, Users } from 'lucide-react'

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '', topic: '', type: 'public', teamId: '' })

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: '200', ...(teamFilter && { teamId: teamFilter }) })
    const [chRes, tRes] = await Promise.all([
      fetch(`/api/v1/comm/channels?${params}`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/comm/teams', { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [chData, tData] = await Promise.all([chRes.json(), tRes.json()])
    if (chData.success) setChannels(chData.data)
    if (tData.success) setTeams(tData.data)
    setLoading(false)
  }, [teamFilter])

  useEffect(() => { load() }, [load])

  const filtered = channels.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()))

  async function createChannel() {
    if (!form.name.trim()) { setError('Name required'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/v1/comm/channels', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, teamId: form.teamId || undefined }),
    })
    const data = await res.json()
    if (data.success) { setShowModal(false); await load() } else setError(data.error ?? 'Failed')
    setSaving(false)
  }

  async function joinChannel(id: string) {
    await fetch(`/api/v1/comm/channels/${id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } })
    await load()
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
          <p className="text-sm text-gray-500 mt-1">{channels.length} channels</p>
        </div>
        <button onClick={() => { setForm({ name: '', description: '', topic: '', type: 'public', teamId: '' }); setError(''); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Channel
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input placeholder="Search channels..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm focus:outline-none" />
        </div>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Channel grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Hash className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No channels found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ch => {
            const isMember = ch.members?.length > 0
            const isAnnouncement = ch.type === 'announcement'
            return (
              <div key={ch.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isAnnouncement ? 'bg-yellow-100' : 'bg-indigo-100'}`}>
                      <Hash className={`w-4 h-4 ${isAnnouncement ? 'text-yellow-600' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">#{ch.name}</p>
                      {ch.type !== 'public' && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Lock className="w-2.5 h-2.5" /> {ch.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="w-3 h-3" />
                    {ch._count?.members ?? 0}
                  </div>
                </div>
                {ch.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ch.description}</p>}
                {ch.topic && <p className="text-xs text-indigo-500 mb-3 italic line-clamp-1">📌 {ch.topic}</p>}
                <div className="flex items-center gap-2">
                  <Link href={`/communication/channels/${ch.id}`}
                    className="flex-1 text-center px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Open
                  </Link>
                  {!isMember && (
                    <button onClick={() => joinChannel(ch.id)}
                      className="px-3 py-1.5 text-xs font-medium border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                      Join
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">New Channel</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="e.g. engineering"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
              <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="What is this channel about?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {['public', 'private', 'announcement'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Team</label>
                <select value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">No Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={createChannel} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
