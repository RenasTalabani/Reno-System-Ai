'use client'

import { useState, useEffect } from 'react'
import { Handshake, Plus, TrendingUp, DollarSign, Users, Link, ChevronRight, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const TIER_COLORS: Record<string, string> = {
  standard: 'bg-slate-500/20 text-slate-400',
  silver: 'bg-slate-400/20 text-slate-300',
  gold: 'bg-amber-500/20 text-amber-400',
  platinum: 'bg-indigo-500/20 text-indigo-400',
}

const DEAL_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']

interface Partner {
  id: string; name: string; type: string; status: string; contactEmail: string | null
  tier: string; commissionRate: number; totalRevenue: number; totalCommission: number
  _count?: { referrals: number; deals: number }
}
interface Dashboard {
  activePartners: number; pendingCommissionAmount: number; pendingCommissionCount: number
  conversionsLast30Days: number; topPartners: Array<{ id: string; name: string; tier: string; totalRevenue: number; totalCommission: number }>
}
interface Referral { id: string; code: string; status: string; dealValue: number | null; commission: number | null; convertedAt: string | null }

export default function PartnersPage() {
  const { token } = useAuthStore()
  const [partners, setPartners] = useState<Partner[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [selected, setSelected] = useState<Partner | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [generatingCode, setGeneratingCode] = useState(false)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/v1/partners`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/partners/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([p, d]) => { setPartners(p.data ?? []); setDashboard(d.data) })
  }, [token])

  const selectPartner = async (p: Partner) => {
    setSelected(p)
    const r = await fetch(`${API}/v1/partners/${p.id}/referrals`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    setReferrals(r.data ?? [])
  }

  const createPartner = async () => {
    const res = await fetch(`${API}/v1/partners`, { method: 'POST', headers, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.data) { setPartners(p => [data.data, ...p]); setShowCreate(false); setForm({}) }
  }

  const generateCode = async () => {
    if (!selected) return
    setGeneratingCode(true)
    const res = await fetch(`${API}/v1/partners/${selected.id}/referral-codes`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.data) setReferrals(r => [data.data, ...r])
    setGeneratingCode(false)
  }

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Handshake className="w-5 h-5 text-indigo-500" /> Partner & Reseller Platform
          </h1>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>

        {dashboard && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Active Partners', value: dashboard.activePartners, icon: Users, color: 'text-indigo-400' },
              { label: 'Pending Commissions', value: fmt(Number(dashboard.pendingCommissionAmount)), icon: DollarSign, color: 'text-amber-400' },
              { label: 'Conversions (30d)', value: dashboard.conversionsLast30Days, icon: TrendingUp, color: 'text-green-400' },
              { label: 'Pending Payouts', value: dashboard.pendingCommissionCount, icon: CheckCircle, color: 'text-blue-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <div className={`${stat.color} mb-1`}><stat.icon className="w-4 h-4" /></div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {partners.map(p => (
            <div key={p.id} onClick={() => selectPartner(p)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-4 ${selected?.id === p.id ? 'border-indigo-500' : 'border-border'}`}>
              <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                <Handshake className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm">{p.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TIER_COLORS[p.tier] ?? 'bg-muted text-muted-foreground'}`}>{p.tier}</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.contactEmail ?? p.type} · {p.commissionRate}% commission</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{fmt(Number(p.totalRevenue))}</p>
                <p className="text-xs text-muted-foreground">revenue</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
          {partners.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No partners yet</p>}
        </div>
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground">{selected.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{selected.contactEmail}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Revenue', value: fmt(Number(selected.totalRevenue)) },
              { label: 'Commission', value: fmt(Number(selected.totalCommission)) },
              { label: 'Rate', value: `${selected.commissionRate}%` },
              { label: 'Tier', value: selected.tier },
            ].map(s => (
              <div key={s.label} className="bg-background rounded-lg p-2.5">
                <p className="text-sm font-semibold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground">Referral Codes</h3>
              <button onClick={generateCode} disabled={generatingCode}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors disabled:opacity-50">
                <Link className="w-3 h-3" />{generatingCode ? '...' : 'Generate'}
              </button>
            </div>
            <div className="space-y-2">
              {referrals.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-foreground">{r.code}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.status === 'converted' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>{r.status}</span>
                </div>
              ))}
              {referrals.length === 0 && <p className="text-xs text-muted-foreground">No referral codes yet</p>}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Partner</h2>
            <div className="space-y-3">
              {[
                { field: 'name', label: 'Company Name' },
                { field: 'contactEmail', label: 'Contact Email' },
                { field: 'contactName', label: 'Contact Name' },
                { field: 'website', label: 'Website' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Tier</label>
                  <select value={form.tier ?? 'standard'} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['standard', 'silver', 'gold', 'platinum'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Commission %</label>
                  <input type="number" min="0" max="50" value={form.commissionRate ?? '10'} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={createPartner} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Add Partner</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
