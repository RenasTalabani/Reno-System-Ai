'use client'

import { useState, useEffect } from 'react'
import { Wrench, MapPin, Plus, AlertTriangle, Clock, CheckCircle, User, Play, Flag } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-slate-500/20 text-slate-400',
}

interface WorkOrder {
  id: string; title: string; type: string; priority: string; status: string
  customerName: string | null; location: string | null; scheduledAt: string | null
  slaDueAt: string | null; assignedTo: string | null; laborHours: number
  _count?: { checklists: number }
}
interface Dashboard { byStatus: Record<string, number>; scheduledToday: number; overdueOrders: number; availableTechnicians: number }

export default function FieldServicePage() {
  const { token } = useAuthStore()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [selected, setSelected] = useState<WorkOrder | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [completing, setCompleting] = useState(false)
  const [resolution, setResolution] = useState('')

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    const q = new URLSearchParams()
    if (statusFilter) q.set('status', statusFilter)
    Promise.all([
      fetch(`${API}/v1/fsm/work-orders?${q}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/fsm/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([o, d]) => { setOrders(o.data ?? []); setDashboard(d.data) })
  }

  useEffect(() => { load() }, [statusFilter, token])

  const create = async () => {
    const res = await fetch(`${API}/v1/fsm/work-orders`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, priority: form.priority || 'medium', type: form.type || 'maintenance' }) }).then(r => r.json())
    if (res.data) { setOrders(o => [res.data, ...o]); setShowCreate(false); setForm({}) }
  }

  const start = async (id: string) => {
    await fetch(`${API}/v1/fsm/work-orders/${id}/start`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setOrders(o => o.map(x => x.id === id ? { ...x, status: 'in_progress' } : x))
    if (selected?.id === id) setSelected(s => s ? { ...s, status: 'in_progress' } : null)
  }

  const complete = async (id: string) => {
    await fetch(`${API}/v1/fsm/work-orders/${id}/complete`, { method: 'PATCH', headers: h, body: JSON.stringify({ resolution }) })
    setOrders(o => o.map(x => x.id === id ? { ...x, status: 'completed' } : x))
    if (selected?.id === id) setSelected(s => s ? { ...s, status: 'completed' } : null)
    setCompleting(false); setResolution('')
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-500" /> Field Service Management
          </h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        </div>

        {dashboard && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Scheduled Today', value: dashboard.scheduledToday, icon: Clock, color: 'text-blue-400' },
              { label: 'Overdue', value: dashboard.overdueOrders, icon: AlertTriangle, color: dashboard.overdueOrders > 0 ? 'text-red-400' : 'text-green-400' },
              { label: 'In Progress', value: dashboard.byStatus?.in_progress ?? 0, icon: Play, color: 'text-amber-400' },
              { label: 'Available Techs', value: dashboard.availableTechnicians, icon: User, color: 'text-indigo-400' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <div className={s.color}><s.icon className="w-4 h-4" /></div>
                <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {['', 'open', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {orders.map(o => (
            <div key={o.id} onClick={() => setSelected(o)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-3 ${selected?.id === o.id ? 'border-indigo-500' : 'border-border'}`}>
              <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm truncate">{o.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[o.priority]}`}>{o.priority}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>{o.status}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{o.customerName ?? o.type}{o.location ? ` · ${o.location}` : ''}</p>
              </div>
              {o.scheduledAt && <p className="text-xs text-muted-foreground shrink-0">{new Date(o.scheduledAt).toLocaleDateString()}</p>}
            </div>
          ))}
          {orders.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No work orders</p>}
        </div>
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground text-sm">{selected.title}</h2>
            <div className="flex gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[selected.priority]}`}>{selected.priority}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[selected.status] ?? 'bg-muted text-muted-foreground'}`}>{selected.status}</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Customer', value: selected.customerName },
              { label: 'Location', value: selected.location },
              { label: 'Scheduled', value: selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleString() : null },
              { label: 'SLA Due', value: selected.slaDueAt ? new Date(selected.slaDueAt).toLocaleString() : null },
              { label: 'Labor Hours', value: selected.laborHours ? `${selected.laborHours}h` : null },
            ].filter(r => r.value).map(row => (
              <div key={row.label} className="flex justify-between">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium text-right max-w-[160px] truncate">{String(row.value)}</span>
              </div>
            ))}
          </div>

          {selected.status === 'open' && (
            <button onClick={() => start(selected.id)} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Start Work
            </button>
          )}
          {selected.status === 'in_progress' && !completing && (
            <button onClick={() => setCompleting(true)} className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Complete
            </button>
          )}
          {completing && (
            <div className="space-y-2">
              <textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolution notes..." rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setCompleting(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button onClick={() => complete(selected.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg transition-colors">Confirm</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">New Work Order</h2>
            <div className="space-y-3">
              {[{ field: 'title', label: 'Title' }, { field: 'customerName', label: 'Customer Name' }, { field: 'location', label: 'Location' }].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Priority</label>
                  <select value={form.priority ?? 'medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Type</label>
                  <select value={form.type ?? 'maintenance'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['maintenance','installation','repair','inspection','delivery'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Scheduled Date</label>
                  <input type="datetime-local" value={form.scheduledAt ?? ''} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={create} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
