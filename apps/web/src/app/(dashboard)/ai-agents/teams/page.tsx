'use client'

import { useEffect, useState } from 'react'
import { Users, Bot, Plus } from 'lucide-react'

interface Team {
  id: string; name: string; purpose: string; supervisorSlug: string
  agentSlugs: string[]; status: string; createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-indigo-600 bg-indigo-50',
  completed: 'text-green-700 bg-green-100',
  cancelled: 'text-gray-500 bg-gray-100',
}

export default function AiAgentTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', purpose: '', supervisorSlug: 'ceo', agentSlugs: 'ceo,cfo,data-analyst' })
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/v1/ai-agents/teams/list').then(r => r.json()).catch(() => ({}))
    setTeams(res.teams ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    await fetch('/api/v1/ai-agents/teams/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, agentSlugs: form.agentSlugs.split(',').map(s => s.trim()).filter(Boolean) }),
    })
    setShowCreate(false)
    load()
    setCreating(false)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users size={20} className="text-violet-600" /><h1 className="text-xl font-bold text-gray-900">AI Teams</h1></div>
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
          <Plus size={14} /> Create Team
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-gray-900">Create Agent Team</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Team Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g. Cost Reduction Task Force" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purpose</label>
              <textarea required rows={2} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Agent Slugs (comma-separated)</label>
              <input value={form.agentSlugs} onChange={e => setForm(f => ({ ...f, agentSlugs: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="ceo,cfo,data-analyst" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          : !teams.length ? (
            <div className="p-8 text-center text-gray-400"><Users size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">No teams yet.</p></div>
          ) : teams.map(team => (
            <div key={team.id} className="flex items-start gap-4 p-4">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0"><Bot size={14} className="text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{team.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{team.purpose}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(team.agentSlugs as any as string[]).map(s => (
                    <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{s}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[team.status] ?? 'text-gray-500 bg-gray-100'}`}>{team.status}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
