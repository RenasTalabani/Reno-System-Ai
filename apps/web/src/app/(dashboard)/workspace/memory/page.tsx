'use client'

import { useEffect, useState } from 'react'
import { Brain, Plus, Trash2, RefreshCw, Clock } from 'lucide-react'

const TENANT_ID = 'default-tenant'
const USER_ID = 'default-user'

interface MemoryItem {
  id: string; memKey: string; memValue: unknown; scope: string; source: string | null
  expiresAt: string | null; createdAt: string; updatedAt: string
}

const SCOPE_COLORS: Record<string, string> = {
  user: 'bg-blue-50 text-blue-700 border-blue-100',
  team: 'bg-violet-50 text-violet-700 border-violet-100',
  tenant: 'bg-amber-50 text-amber-700 border-amber-100',
}

export default function WorkspaceMemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ key: '', value: '', scope: 'user', ttlDays: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/v1/ai-workspace/memory?tenantId=${TENANT_ID}&userId=${USER_ID}`)
      .then(r => r.json()).catch(() => ({}))
    setMemories(res.memories ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    let parsedValue: unknown = form.value
    try { parsedValue = JSON.parse(form.value) } catch { parsedValue = form.value }
    await fetch('/api/v1/ai-workspace/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: TENANT_ID, userId: USER_ID,
        key: form.key, value: parsedValue, scope: form.scope, source: 'manual',
        ttlDays: form.ttlDays ? parseInt(form.ttlDays) : undefined,
      }),
    })
    setShowAdd(false)
    setForm({ key: '', value: '', scope: 'user', ttlDays: '' })
    load()
    setSaving(false)
  }

  async function handleDelete(key: string) {
    await fetch(`/api/v1/ai-workspace/memory/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, userId: USER_ID }),
    })
    load()
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-violet-600" />
          <h1 className="text-xl font-bold text-gray-900">Workspace Memory</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
            <Plus size={14} /> Add Memory
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Reno Brain remembers your preferences and learned patterns across sessions. You can manage or clear memories here.
      </p>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-gray-900">Add Memory</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Key</label>
              <input required value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                placeholder="e.g. preferred_language, favorite_module"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
              <input required value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder='e.g. "en" or true or 42'
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Scope</label>
                <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="user">User</option>
                  <option value="team">Team</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expires in (days, optional)</label>
                <input type="number" min={1} value={form.ttlDays} onChange={e => setForm(f => ({ ...f, ttlDays: e.target.value }))}
                  placeholder="Never"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Memory'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm"><RefreshCw size={20} className="mx-auto mb-2 animate-spin text-violet-400" />Loading memories...</div>
        ) : memories.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Brain size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No memories yet. Chat with the AI workspace to start building memory.</p>
          </div>
        ) : memories.map(mem => (
          <div key={mem.id} className="flex items-start gap-4 p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">{mem.memKey}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${SCOPE_COLORS[mem.scope] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                  {mem.scope}
                </span>
                {mem.source && (
                  <span className="text-xs text-gray-400">{mem.source === 'auto' ? '🤖 auto-learned' : `📝 ${mem.source}`}</span>
                )}
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 font-mono">
                {JSON.stringify(mem.memValue)}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span>Updated {new Date(mem.updatedAt).toLocaleDateString()}</span>
                {mem.expiresAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> Expires {new Date(mem.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button type="button" onClick={() => handleDelete(mem.memKey)}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
