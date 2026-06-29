'use client'

import { useState, useEffect } from 'react'
import { Heart, Plus, TrendingDown, RefreshCw, DollarSign, AlertTriangle, Search, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const HEALTH_COLOR = (score: number) => score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
const HEALTH_BG = (score: number) => score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
const CHURN_COLORS: Record<string, string> = { low: 'bg-green-500/20 text-green-400', medium: 'bg-amber-500/20 text-amber-400', high: 'bg-red-500/20 text-red-400' }

interface Account { id: string; name: string; plan: string | null; mrr: number; healthScore: number; stage: string; churnRisk: string; renewalDate: string | null; npsScore: number | null; _count?: { touchpoints: number; successPlans: number } }
interface Dashboard { totalAccounts: number; totalMrr: number; atRisk: number; renewalsDue: number; byChurnRisk: Record<string, number> }

export default function CustomerSuccessPage() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Account | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [tpForm, setTpForm] = useState<Record<string, string>>({})
  const [showTp, setShowTp] = useState(false)

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    Promise.all([
      fetch(`${API}/v1/customer-success/accounts?${q}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/customer-success/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([a, d]) => { setAccounts(a.data ?? []); setDashboard(d.data) })
  }

  useEffect(() => { load() }, [search, token])

  const create = async () => {
    const res = await fetch(`${API}/v1/customer-success/accounts`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, mrr: parseFloat(form.mrr ?? '0') }) }).then(r => r.json())
    if (res.data) { setAccounts(a => [res.data, ...a]); setShowCreate(false); setForm({}) }
  }

  const logTouchpoint = async () => {
    if (!selected) return
    await fetch(`${API}/v1/customer-success/accounts/${selected.id}/touchpoints`, { method: 'POST', headers: h, body: JSON.stringify(tpForm) })
    const newScore = selected.healthScore + (tpForm.sentiment === 'positive' ? 5 : tpForm.sentiment === 'negative' ? -5 : 0)
    setAccounts(a => a.map(x => x.id === selected.id ? { ...x, healthScore: Math.max(0, Math.min(100, newScore)) } : x))
    setSelected(s => s ? { ...s, healthScore: Math.max(0, Math.min(100, newScore)) } : null)
    setShowTp(false); setTpForm({})
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-indigo-500" /> Customer Success
          </h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>

        {dashboard && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Accounts', value: dashboard.totalAccounts, icon: Heart, color: 'text-indigo-400' },
              { label: 'Total MRR', value: `$${Number(dashboard.totalMrr).toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
              { label: 'At Risk', value: dashboard.atRisk, icon: AlertTriangle, color: dashboard.atRisk > 0 ? 'text-red-400' : 'text-muted-foreground' },
              { label: 'Renewals (30d)', value: dashboard.renewalsDue, icon: RefreshCw, color: dashboard.renewalsDue > 0 ? 'text-amber-400' : 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {accounts.map(a => (
            <div key={a.id} onClick={() => setSelected(a)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-4 ${selected?.id === a.id ? 'border-indigo-500' : 'border-border'}`}>
              <div className="relative w-10 h-10 shrink-0">
                <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                  <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeDasharray={`${(a.healthScore / 100) * 94.2} 94.2`}
                    className={HEALTH_BG(a.healthScore).replace('bg-', 'stroke-').replace('/500', '')} strokeLinecap="round" />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${HEALTH_COLOR(a.healthScore)}`}>{a.healthScore}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm truncate">{a.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${CHURN_COLORS[a.churnRisk] ?? 'bg-muted text-muted-foreground'}`}>{a.churnRisk} risk</span>
                </div>
                <p className="text-xs text-muted-foreground">{a.plan ?? 'No plan'} · ${Number(a.mrr).toLocaleString()}/mo · {a.stage}</p>
              </div>
              {a.renewalDate && <p className="text-xs text-muted-foreground shrink-0">{new Date(a.renewalDate).toLocaleDateString()}</p>}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
          {accounts.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No accounts yet</p>}
        </div>
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground">{selected.name}</h2>
            <div className="flex gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CHURN_COLORS[selected.churnRisk]}`}>{selected.churnRisk} churn risk</span>
            </div>
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'Health Score', value: `${selected.healthScore}/100` },
              { label: 'Plan', value: selected.plan },
              { label: 'MRR', value: `$${Number(selected.mrr).toLocaleString()}` },
              { label: 'Stage', value: selected.stage },
              { label: 'NPS Score', value: selected.npsScore },
              { label: 'Renewal Date', value: selected.renewalDate ? new Date(selected.renewalDate).toLocaleDateString() : null },
              { label: 'Touchpoints', value: selected._count?.touchpoints ?? 0 },
              { label: 'Success Plans', value: selected._count?.successPlans ?? 0 },
            ].filter(r => r.value !== null && r.value !== undefined).map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{String(row.value)}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowTp(true)} className="w-full border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">
            + Log Touchpoint
          </button>
          {showTp && (
            <div className="space-y-2">
              <select value={tpForm.type ?? 'call'} onChange={e => setTpForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                {['call','email','meeting','qbr','support','other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={tpForm.sentiment ?? 'neutral'} onChange={e => setTpForm(f => ({ ...f, sentiment: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                {['positive','neutral','negative'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea value={tpForm.notes ?? ''} onChange={e => setTpForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes..." rows={2}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
              <div className="flex gap-2">
                <button onClick={() => { setShowTp(false); setTpForm({}) }} className="flex-1 border border-border text-foreground text-sm py-1.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button onClick={logTouchpoint} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-1.5 rounded-lg transition-colors">Log</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add CS Account</h2>
            <div className="space-y-3">
              {[{ field: 'name', label: 'Company Name' }, { field: 'plan', label: 'Plan' }].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">MRR ($)</label>
                  <input type="number" value={form.mrr ?? ''} onChange={e => setForm(f => ({ ...f, mrr: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Stage</label>
                  <select value={form.stage ?? 'onboarding'} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['onboarding','adopted','expanded','at_risk','churned'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Renewal Date</label>
                  <input type="date" value={form.renewalDate ?? ''} onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={create} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Add Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
