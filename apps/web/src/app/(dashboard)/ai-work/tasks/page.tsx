'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, Plus, Play, Clock, CheckCircle, XCircle, AlertTriangle, Pause, Zap, Filter } from 'lucide-react'

interface Task {
  id: string; title: string; status: string; provider: string
  riskLevel: string; priority: string; progressPct: number
  createdAt: string; completedAt: string | null; module: string | null
  _count: { steps: number }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-500 bg-gray-100',
  queued: 'text-blue-600 bg-blue-50',
  planning: 'text-purple-600 bg-purple-50',
  running: 'text-indigo-600 bg-indigo-50 animate-pulse',
  waiting_for_approval: 'text-yellow-700 bg-yellow-50',
  paused: 'text-orange-600 bg-orange-50',
  completed: 'text-green-700 bg-green-100',
  failed: 'text-red-700 bg-red-100',
  cancelled: 'text-gray-500 bg-gray-100',
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-700 bg-green-100',
  medium: 'text-yellow-700 bg-yellow-100',
  high: 'text-orange-700 bg-orange-100',
  critical: 'text-red-700 bg-red-100',
}

const ALL_STATUSES = ['draft', 'queued', 'planning', 'running', 'waiting_for_approval', 'paused', 'completed', 'failed', 'cancelled']

export default function AiWorkTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', request: '', provider: 'mock', priority: 'normal', riskLevel: 'low' })
  const [creating, setCreating] = useState(false)

  async function loadTasks() {
    setLoading(true)
    const url = `/api/v1/ai-work/tasks${statusFilter ? `?status=${statusFilter}` : ''}`
    const res = await fetch(url).then(r => r.json()).catch(() => ({}))
    setTasks(res.tasks ?? [])
    setTotal(res.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [statusFilter])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/v1/ai-work/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { task } = await res.json()
      await fetch(`/api/v1/ai-work/tasks/${task.id}/start`, { method: 'POST' })
      setShowCreate(false)
      setForm({ title: '', request: '', provider: 'mock', priority: 'normal', riskLevel: 'low' })
      loadTasks()
    }
    setCreating(false)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Tasks</h1>
          <p className="text-sm text-gray-500">{total} total tasks</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setStatusFilter('')} className={`px-3 py-1 text-xs rounded-full font-medium border ${!statusFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-300 hover:border-gray-400'}`}>
          All
        </button>
        {ALL_STATUSES.map(s => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`px-3 py-1 text-xs rounded-full font-medium border ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-300 hover:border-gray-400'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Create task modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Create AI Task</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Task Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Analyze why profit dropped this month" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Request (what Claude should do)</label>
              <textarea required rows={4} value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe in detail what you want Claude to analyze, prepare, or complete..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">AI Provider</label>
                <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="mock">Reno Brain</option>
                  <option value="anthropic">Claude</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Risk Level</label>
                <select value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            {form.provider === 'anthropic' && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Claude will only execute read-only tools. Any write actions will create proposals requiring your approval.
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {creating ? 'Starting...' : 'Create & Start'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task list */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading tasks...</div>
        ) : !tasks.length ? (
          <div className="p-8 text-center">
            <Bot size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No tasks found. Create one to get started.</p>
          </div>
        ) : tasks.map(task => (
          <Link key={task.id} href={`/ai-work/tasks/${task.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">{task.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {task.provider === 'mock' ? 'Reno Brain' : 'Claude'}
                {task.module ? ` · ${task.module}` : ''}
                · {task._count.steps} steps
                · {new Date(task.createdAt).toLocaleDateString()}
              </div>
              {task.status === 'running' && (
                <div className="mt-1.5 w-48 bg-gray-200 rounded-full h-1">
                  <div className="bg-indigo-600 h-1 rounded-full transition-all" style={{ width: `${task.progressPct}%` }} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[task.riskLevel]}`}>{task.riskLevel}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? 'text-gray-600 bg-gray-100'}`}>
                {task.status.replace(/_/g, ' ')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
