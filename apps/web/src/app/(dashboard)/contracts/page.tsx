'use client'

import { useState, useEffect } from 'react'
import { FileSignature, Plus, AlertTriangle, CheckCircle, Clock, ChevronRight, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-400',
  review: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-indigo-500/20 text-indigo-400',
  active: 'bg-green-500/20 text-green-400',
  expired: 'bg-amber-500/20 text-amber-400',
  terminated: 'bg-red-500/20 text-red-400',
  rejected: 'bg-red-500/20 text-red-400',
}

const NEXT_STATUS: Record<string, string[]> = {
  draft: ['review'],
  review: ['approved', 'rejected'],
  approved: ['active'],
  active: ['terminated'],
}

interface Contract {
  id: string; title: string; type: string; status: string; counterparty: string | null
  value: number | null; currency: string; startDate: string | null; endDate: string | null
  autoRenew: boolean; _count?: { clauses: number; approvals: number }
}
interface Dashboard { byStatus: Record<string, number>; expiringIn30Days: number; activeContractValue: number; pendingApprovals: number }

export default function ContractsPage() {
  const { token } = useAuthStore()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Contract | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (statusFilter) q.set('status', statusFilter)
    Promise.all([
      fetch(`${API}/v1/clm?${q}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/clm/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([c, d]) => { setContracts(c.data ?? []); setDashboard(d.data) })
  }

  useEffect(() => { load() }, [search, statusFilter, token])

  const createContract = async () => {
    const res = await fetch(`${API}/v1/clm`, { method: 'POST', headers: h, body: JSON.stringify(form) }).then(r => r.json())
    if (res.data) { setContracts(c => [res.data, ...c]); setShowCreate(false); setForm({}) }
  }

  const advanceStatus = async (id: string, status: string) => {
    await fetch(`${API}/v1/clm/${id}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status }) })
    setContracts(c => c.map(x => x.id === id ? { ...x, status } : x))
    if (selected?.id === id) setSelected(s => s ? { ...s, status } : null)
  }

  const fmt = (n: number, cur = 'USD') => `${cur} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-indigo-500" /> Contract Management
          </h1>
          <button onClick={() => { setShowCreate(true); setForm({ currency: 'USD', type: 'service' }) }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>

        {dashboard && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Active Value', value: fmt(Number(dashboard.activeContractValue)), icon: FileSignature, color: 'text-green-400' },
              { label: 'Expiring (30d)', value: dashboard.expiringIn30Days, icon: AlertTriangle, color: dashboard.expiringIn30Days > 0 ? 'text-amber-400' : 'text-green-400' },
              { label: 'Pending Approvals', value: dashboard.pendingApprovals, icon: Clock, color: 'text-blue-400' },
              { label: 'Total Active', value: dashboard.byStatus?.active ?? 0, icon: CheckCircle, color: 'text-indigo-400' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <div className={s.color}><s.icon className="w-4 h-4" /></div>
                <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contracts..."
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground">
            <option value="">All statuses</option>
            {['draft','review','approved','active','expired','terminated'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {contracts.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-4 ${selected?.id === c.id ? 'border-indigo-500' : 'border-border'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground text-sm truncate">{c.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground'}`}>{c.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.counterparty ?? c.type}{c.endDate ? ` · expires ${new Date(c.endDate).toLocaleDateString()}` : ''}</p>
              </div>
              {c.value && <p className="text-sm font-semibold text-foreground shrink-0">{fmt(Number(c.value), c.currency)}</p>}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
          {contracts.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No contracts found</p>}
        </div>
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground text-sm">{selected.title}</h2>
            <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'Type', value: selected.type },
              { label: 'Counterparty', value: selected.counterparty },
              { label: 'Value', value: selected.value ? fmt(Number(selected.value), selected.currency) : '-' },
              { label: 'Start', value: selected.startDate ? new Date(selected.startDate).toLocaleDateString() : '-' },
              { label: 'End', value: selected.endDate ? new Date(selected.endDate).toLocaleDateString() : '-' },
              { label: 'Auto-renew', value: selected.autoRenew ? 'Yes' : 'No' },
              { label: 'Clauses', value: selected._count?.clauses ?? 0 },
            ].filter(r => r.value !== null && r.value !== undefined).map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{String(row.value)}</span>
              </div>
            ))}
          </div>
          {(NEXT_STATUS[selected.status] ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Actions</p>
              {(NEXT_STATUS[selected.status] ?? []).map(ns => (
                <button key={ns} onClick={() => advanceStatus(selected.id, ns)}
                  className={`w-full text-sm py-2 rounded-lg transition-colors capitalize ${ns === 'rejected' || ns === 'terminated' ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                  Move to {ns}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">New Contract</h2>
            <div className="space-y-3">
              {[
                { field: 'title', label: 'Title' },
                { field: 'counterparty', label: 'Counterparty' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Type</label>
                  <select value={form.type ?? 'service'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['service','nda','employment','vendor','partnership','saas'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Value</label>
                  <input type="number" value={form.value ?? ''} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Start Date</label>
                  <input type="date" value={form.startDate ?? ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">End Date</label>
                  <input type="date" value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={createContract} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
