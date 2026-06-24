'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Pencil, CheckCircle, XCircle, BarChart3, Star, Ticket } from 'lucide-react'

interface Agent {
  id: string
  userId: string
  maxTickets: number
  isAvailable: boolean
  specializations: string[]
  isActive: boolean
  user?: {
    firstName?: string
    lastName?: string
    displayName?: string
    email?: string
  }
  activeTickets?: number
  utilizationPct?: number
}

interface AgentStats {
  agentId: string
  agentName: string
  resolved: number
  avgCsat: number | null
  resolutionRate: number
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [workload, setWorkload] = useState<Agent[]>([])
  const [stats, setStats] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'workload' | 'stats'>('workload')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<any[]>([])

  const [form, setForm] = useState({
    userId: '', maxTickets: 20, isAvailable: true, specializations: '',
  })

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const [agRes, wRes, sRes, uRes] = await Promise.all([
      fetch('/api/v1/helpdesk/agents', { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/helpdesk/agents/workload/summary', { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/helpdesk/agents/leaderboard/stats', { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/users', { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [agData, wData, sData, uData] = await Promise.all([agRes.json(), wRes.json(), sRes.json(), uRes.json()])
    if (agData.success) setAgents(agData.data)
    if (wData.success) setWorkload(wData.data)
    if (sData.success) setStats(sData.data)
    if (uData.success) setUsers(uData.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function agentName(a: Agent) {
    return a.user?.firstName ? `${a.user.firstName} ${a.user.lastName ?? ''}`.trim() : a.user?.displayName ?? a.user?.email ?? 'Agent'
  }

  function openCreate() {
    setEditing(null)
    setForm({ userId: '', maxTickets: 20, isAvailable: true, specializations: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(a: Agent) {
    setEditing(a)
    setForm({ userId: a.userId, maxTickets: a.maxTickets, isAvailable: a.isAvailable, specializations: a.specializations?.join(', ') ?? '' })
    setError('')
    setShowModal(true)
  }

  async function save() {
    if (!form.userId) { setError('User is required'); return }
    setSaving(true)
    setError('')
    const body = {
      userId: form.userId,
      maxTickets: form.maxTickets,
      isAvailable: form.isAvailable,
      specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
    }
    const url = editing ? `/api/v1/helpdesk/agents/${editing.id}` : '/api/v1/helpdesk/agents'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) { setShowModal(false); await load() } else { setError(data.error ?? 'Failed') }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Agents</h1>
          <p className="text-sm text-gray-500 mt-1">Manage agents, workload, and performance</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Agent
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('workload')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'workload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-2"><Ticket className="w-3.5 h-3.5" /> Workload</span>
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'stats' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Performance</span>
        </button>
      </div>

      {tab === 'workload' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {workload.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No agents configured</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Active Tickets</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Max Tickets</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Specializations</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {workload.map(agent => {
                  const pct = agent.utilizationPct ?? 0
                  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-green-500'
                  return (
                    <tr key={agent.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm text-indigo-700 font-bold">
                            {agentName(agent).charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{agentName(agent)}</p>
                            <p className="text-xs text-gray-400">{agent.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {agent.isAvailable ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Available
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{agent.activeTickets ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{agent.maxTickets}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {agent.specializations?.map((s: string) => (
                            <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(agent)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {stats.length === 0 ? (
            <div className="p-16 text-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No performance data yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Resolved</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Avg CSAT</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Resolution Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.map((s, i) => (
                  <tr key={s.agentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm text-indigo-700 font-bold">
                          {s.agentName.charAt(0)}
                        </div>
                        <p className="font-medium text-gray-800">{s.agentName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{s.resolved}</td>
                    <td className="px-4 py-3">
                      {s.avgCsat != null ? (
                        <span className="flex items-center gap-1 text-sm font-semibold text-yellow-600">
                          <Star className="w-3.5 h-3.5 fill-current" /> {Number(s.avgCsat).toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(s.resolutionRate, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(s.resolutionRate)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Agent' : 'Add Agent'}</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">User <span className="text-red-500">*</span></label>
              <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                disabled={!!editing}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50">
                <option value="">Select user...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Concurrent Tickets</label>
              <input type="number" min={1} max={100} value={form.maxTickets}
                onChange={e => setForm(f => ({ ...f, maxTickets: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Specializations (comma separated)</label>
              <input value={form.specializations} onChange={e => setForm(f => ({ ...f, specializations: e.target.value }))}
                placeholder="billing, technical, onboarding"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.isAvailable} onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))} className="w-4 h-4 rounded" />
              Available for ticket assignment
            </label>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
