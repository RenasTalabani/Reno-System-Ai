'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Bot, MessageSquare, GitBranch, Vote, Calendar, Layers, Plus, Play } from 'lucide-react'

interface DashboardData {
  teams: number; meetings: number; delegations: number; decisions: number
  recentConversations: { id: string; title: string; status: string; createdAt: string; summary: string | null }[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-indigo-600 bg-indigo-50',
  completed: 'text-green-700 bg-green-100',
  cancelled: 'text-gray-500 bg-gray-100',
}

export default function AiAgentsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDelegate, setShowDelegate] = useState(false)
  const [form, setForm] = useState({ title: '', request: '', provider: 'mock' })
  const [delegating, setDelegating] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/ai-agents/dashboard/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelegate(e: React.FormEvent) {
    e.preventDefault()
    setDelegating(true)
    const res = await fetch('/api/v1/ai-agents/delegate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setResult(json.result)
    setDelegating(false)
    setShowDelegate(false)
    // Reload dashboard
    fetch('/api/v1/ai-agents/dashboard/summary').then(r => r.json()).then(setData)
  }

  const stats = [
    { label: 'Agent Teams', value: data?.teams ?? 0, icon: Users, color: 'text-violet-600 bg-violet-50' },
    { label: 'Meetings (30d)', value: data?.meetings ?? 0, icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Delegations (30d)', value: data?.delegations ?? 0, icon: GitBranch, color: 'text-blue-600 bg-blue-50' },
    { label: 'Decisions (30d)', value: data?.decisions ?? 0, icon: Vote, color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Organization</h1>
            <p className="text-sm text-gray-500">Multi-agent collaboration under Reno Brain governance</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/ai-agents/teams" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"><Users size={13} /> Teams</Link>
          <Link href="/ai-agents/workspace" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"><Layers size={13} /> Workspace</Link>
          <Link href="/ai-agents/meetings" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"><Calendar size={13} /> Meetings</Link>
          <button type="button" onClick={() => setShowDelegate(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Play size={13} /> Delegate Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}><Icon size={16} /></div>
              <div className="text-2xl font-bold text-gray-900">{loading ? '–' : s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Last result */}
      {result && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-violet-800 font-semibold text-sm">
            <Bot size={16} /> AI Organization Result — {result.agentsInvolved?.length} agents · {result.delegations} delegations · {result.decisions} decisions
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.executiveSummary}</div>
          <Link href={`/ai-agents/workspace`} className="text-xs text-violet-600 hover:underline">View shared workspace →</Link>
        </div>
      )}

      {/* Agent org chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">AI Digital Employees</h2>
          <span className="text-xs text-gray-400">20 active agents</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {[
            { slug: 'ceo', name: 'CEO', color: 'bg-violet-100 text-violet-700 border-violet-200' },
            { slug: 'cfo', name: 'CFO', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            { slug: 'coo', name: 'COO', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
            { slug: 'cto', name: 'CTO', color: 'bg-blue-100 text-blue-700 border-blue-200' },
            { slug: 'hr-director', name: 'HR Director', color: 'bg-pink-100 text-pink-700 border-pink-200' },
            { slug: 'sales-director', name: 'Sales Director', color: 'bg-orange-100 text-orange-700 border-orange-200' },
            { slug: 'finance-manager', name: 'Finance Manager', color: 'bg-green-100 text-green-700 border-green-200' },
            { slug: 'data-analyst', name: 'Data Analyst', color: 'bg-purple-100 text-purple-700 border-purple-200' },
            { slug: 'support-manager', name: 'Support Manager', color: 'bg-sky-100 text-sky-700 border-sky-200' },
            { slug: 'project-manager', name: 'Project Manager', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
          ].map(a => (
            <div key={a.slug} className={`border rounded-lg px-2 py-1.5 text-center text-xs font-medium ${a.color}`}>
              <Bot size={12} className="mx-auto mb-0.5" />{a.name}
            </div>
          ))}
          <div className="border rounded-lg px-2 py-1.5 text-center text-xs font-medium text-gray-400 border-dashed">+10 more</div>
        </div>
      </div>

      {/* Recent conversations */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Collaborations</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
        ) : !data?.recentConversations.length ? (
          <div className="p-8 text-center text-gray-400">
            <MessageSquare size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No collaborations yet. Delegate a task to your AI organization.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.recentConversations.map(c => (
              <div key={c.id} className="flex items-start gap-3 p-4">
                <MessageSquare size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.title}</div>
                  {c.summary && <div className="text-xs text-gray-400 mt-0.5 truncate">{c.summary}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'text-gray-500 bg-gray-100'}`}>{c.status}</span>
                  <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delegate modal */}
      {showDelegate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={handleDelegate} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="font-bold text-gray-900">Delegate to AI Organization</h2>
            <p className="text-xs text-gray-500">Claude will automatically select the relevant department heads and coordinate a collaborative analysis.</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g. Reduce company costs by 10%" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Detailed request</label>
              <textarea required rows={4} value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Analyze costs across all departments and recommend where we can safely reduce 10% without impacting key operations..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI Provider</label>
              <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="mock">Reno Brain (default)</option>
                <option value="anthropic">Claude (requires consent)</option>
              </select>
            </div>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              All agents will only read data and create proposals. No writes or critical actions will execute without your approval.
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowDelegate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={delegating} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
                {delegating ? 'Coordinating agents...' : 'Delegate'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
