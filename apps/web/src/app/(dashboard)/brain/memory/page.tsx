'use client'

import { useEffect, useState } from 'react'
import { Brain, Trash2, Search } from 'lucide-react'

interface Memory {
  id: string
  scope: string
  type: string
  key: string
  value: any
  summary: string | null
  importance: number
  expiresAt: string | null
  lastAccessedAt: string | null
  accessCount: number
  createdAt: string
  agent: { name: string } | null
}

const SCOPE_STYLES: Record<string, string> = {
  global: 'bg-indigo-100 text-indigo-700',
  agent: 'bg-blue-100 text-blue-700',
  user: 'bg-green-100 text-green-700',
  conversation: 'bg-yellow-100 text-yellow-700',
}

const TYPE_STYLES: Record<string, string> = {
  fact: 'bg-gray-100 text-gray-600',
  preference: 'bg-purple-100 text-purple-700',
  context: 'bg-orange-100 text-orange-700',
  summary: 'bg-cyan-100 text-cyan-700',
  instruction: 'bg-teal-100 text-teal-700',
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [scopeFilter, setScopeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadMemories()
  }, [scopeFilter, typeFilter])

  async function loadMemories() {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (scopeFilter) params.set('scope', scopeFilter)
    if (typeFilter) params.set('type', typeFilter)
    const r = await fetch(`/api/v1/brain/memory?${params}`)
    const d = await r.json()
    setMemories(d.data ?? [])
    setLoading(false)
  }

  async function deleteMemory(id: string) {
    await fetch(`/api/v1/brain/memory/${id}`, { method: 'DELETE' })
    setMemories(prev => prev.filter(m => m.id !== id))
  }

  const filtered = memories.filter(m =>
    !search || m.key.toLowerCase().includes(search.toLowerCase()) || m.summary?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Memory</h1>
        <p className="text-gray-500 text-sm">Stored context and facts used by Reno Brain across conversations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 w-48" />
        </div>
        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Scopes</option>
          {['global', 'agent', 'user', 'conversation'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Types</option>
          {['fact', 'preference', 'context', 'summary', 'instruction'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} entries</span>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading memories...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Brain size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No memories stored yet. Reno Brain will learn as you chat.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Key', 'Scope', 'Type', 'Summary', 'Access', 'Importance', 'Stored', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 max-w-xs truncate">{m.key}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SCOPE_STYLES[m.scope] ?? 'bg-gray-100 text-gray-600'}`}>{m.scope}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLES[m.type] ?? 'bg-gray-100 text-gray-600'}`}>{m.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-sm truncate">{m.summary ?? JSON.stringify(m.value).slice(0, 80)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.accessCount}x</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i <= m.importance ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteMemory(m.id)} className="p-1 text-gray-300 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
