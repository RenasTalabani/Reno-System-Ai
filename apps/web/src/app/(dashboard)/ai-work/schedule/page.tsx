'use client'

import { useEffect, useState } from 'react'
import { Calendar, Plus, Trash2, ToggleLeft, ToggleRight, Clock } from 'lucide-react'

interface Schedule {
  id: string; title: string; request: string; provider: string
  intervalType: string; dayOfWeek: number | null; hourOfDay: number | null
  isEnabled: boolean; lastRunAt: string | null; nextRunAt: string | null; runCount: number
  createdAt: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AiWorkSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '', request: '', provider: 'mock',
    intervalType: 'weekly', dayOfWeek: 1, hourOfDay: 9,
  })
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/v1/ai-work/schedules').then(r => r.json()).catch(() => ({}))
    setSchedules(res.schedules ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    await fetch('/api/v1/ai-work/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowCreate(false)
    setForm({ title: '', request: '', provider: 'mock', intervalType: 'weekly', dayOfWeek: 1, hourOfDay: 9 })
    load()
    setCreating(false)
  }

  async function toggleEnabled(schedule: Schedule) {
    await fetch(`/api/v1/ai-work/schedules/${schedule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !schedule.isEnabled }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule?')) return
    await fetch(`/api/v1/ai-work/schedules/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Scheduled AI Tasks</h1>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={14} /> New Schedule
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="font-bold text-gray-900">Create Recurring Task</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Weekly CEO Report" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">What should Claude do?</label>
              <textarea required rows={3} value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Prepare a business health summary with revenue, active projects, and open tickets..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="mock">Reno Brain</option>
                  <option value="anthropic">Claude</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                <select value={form.intervalType} onChange={e => setForm(f => ({ ...f, intervalType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.intervalType === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Day of week</label>
                  <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: parseInt(e.target.value, 10) }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hour (0–23)</label>
                <input type="number" min={0} max={23} value={form.hourOfDay} onChange={e => setForm(f => ({ ...f, hourOfDay: parseInt(e.target.value, 10) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : !schedules.length ? (
          <div className="p-8 text-center text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No scheduled tasks. Create one to automate recurring AI work.</p>
          </div>
        ) : schedules.map(s => (
          <div key={s.id} className="flex items-start gap-4 p-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900">{s.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {s.provider === 'mock' ? 'Reno Brain' : 'Claude'}
                {' · '}
                {s.intervalType === 'weekly' && s.dayOfWeek !== null ? `Every ${DAYS[s.dayOfWeek]}` : s.intervalType}
                {s.hourOfDay !== null ? ` at ${String(s.hourOfDay).padStart(2, '0')}:00` : ''}
                {' · '} {s.runCount} runs
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {s.nextRunAt && <span>Next: {new Date(s.nextRunAt).toLocaleString()}</span>}
                {s.lastRunAt && <span className="ml-2">Last: {new Date(s.lastRunAt).toLocaleString()}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => toggleEnabled(s)} className="text-gray-400 hover:text-indigo-600">
                {s.isEnabled ? <ToggleRight size={20} className="text-indigo-600" /> : <ToggleLeft size={20} />}
              </button>
              <button type="button" onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
