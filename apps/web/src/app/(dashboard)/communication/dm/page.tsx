'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { MessageSquare, Plus, Search, Users } from 'lucide-react'

export default function DmPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [starting, setStarting] = useState(false)
  const [groupName, setGroupName] = useState('')

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const [convRes, userRes] = await Promise.all([
      fetch('/api/v1/comm/dm', { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/users?limit=200', { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [convData, userData] = await Promise.all([convRes.json(), userRes.json()])
    if (convData.success) setConversations(convData.data)
    if (userData.success) setUsers(userData.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function convName(p: any) {
    if (p.conversation?.isGroup) return p.conversation.name ?? 'Group DM'
    const others = p.conversation?.participants?.filter((pt: any) => pt.userId !== p.userId) ?? []
    return others.length > 0 ? `DM with ${others[0].userId.slice(0, 8)}...` : 'Direct Message'
  }

  async function startDm() {
    if (!selectedUsers.length) return
    setStarting(true)
    const res = await fetch('/api/v1/comm/dm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantIds: selectedUsers,
        isGroup: selectedUsers.length > 1,
        name: groupName || undefined,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setShowModal(false)
      setSelectedUsers([])
      setGroupName('')
      await load()
    }
    setStarting(false)
  }

  const filteredUsers = users.filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Direct Messages</h1>
          <p className="text-sm text-gray-500 mt-1">{conversations.length} conversations</p>
        </div>
        <button onClick={() => { setShowModal(true); setSearch(''); setSelectedUsers([]) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Message
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No conversations yet</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-indigo-600 hover:underline">Start a conversation</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-50">
            {conversations.map(p => (
              <Link key={p.id} href={`/communication/dm/${p.conversation?.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${p.conversation?.isGroup ? 'bg-purple-500' : 'bg-indigo-500'}`}>
                  {p.conversation?.isGroup ? <Users className="w-5 h-5" /> : 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{convName(p)}</p>
                  <p className="text-xs text-gray-400">{p.conversation?._count?.messages ?? 0} messages</p>
                </div>
                {p.conversation?.lastMessageAt && (
                  <p className="text-xs text-gray-400 shrink-0">{new Date(p.conversation.lastMessageAt).toLocaleDateString()}</p>
                )}
                {!p.lastReadAt && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Start DM Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">New Direct Message</h2>

            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 text-sm focus:outline-none" />
            </div>

            {selectedUsers.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Group Name (optional)</label>
                <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Project Team"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            )}

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(uid => {
                  const u = users.find(x => x.id === uid)
                  return (
                    <span key={uid} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                      {u?.firstName ?? u?.email ?? uid.slice(0, 8)}
                      <button onClick={() => setSelectedUsers(prev => prev.filter(id => id !== uid))} className="hover:text-indigo-900">✕</button>
                    </span>
                  )
                })}
              </div>
            )}

            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
              {filteredUsers.slice(0, 50).map(u => {
                const isSelected = selectedUsers.includes(u.id)
                return (
                  <button key={u.id} onClick={() => setSelectedUsers(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 font-bold shrink-0">
                      {(u.firstName ?? u.email ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : u.email}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    {isSelected && <span className="ml-auto text-indigo-600">✓</span>}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={startDm} disabled={!selectedUsers.length || starting}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {starting ? 'Starting...' : `Start ${selectedUsers.length > 1 ? 'Group ' : ''}DM`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
