'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Wrench, AlertTriangle, Shield, Search, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-green-500/20 text-green-400',
  good: 'bg-blue-500/20 text-blue-400',
  fair: 'bg-amber-500/20 text-amber-400',
  poor: 'bg-red-500/20 text-red-400',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  maintenance: 'bg-amber-500/20 text-amber-400',
  retired: 'bg-slate-500/20 text-slate-400',
}

interface Asset { id: string; assetTag: string; name: string; category: string | null; status: string; condition: string; location: string | null; assignedTo: string | null; purchaseDate: string | null; purchasePrice: number | null; warrantyExpiry: string | null; _count?: { maintenance: number } }
interface Dashboard { totalAssets: number; byStatus: Record<string, number>; warrantyExpiring: number; upcomingService: number }

export default function AssetsPage() {
  const { token } = useAuthStore()
  const [assets, setAssets] = useState<Asset[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (statusFilter) q.set('status', statusFilter)
    Promise.all([
      fetch(`${API}/v1/assets?${q}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/assets/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([a, d]) => { setAssets(a.data ?? []); setDashboard(d.data) })
  }

  useEffect(() => { load() }, [search, statusFilter, token])

  const create = async () => {
    const res = await fetch(`${API}/v1/assets`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined, depreciationYrs: form.depreciationYrs ? parseInt(form.depreciationYrs) : 5 }) }).then(r => r.json())
    if (res.data) { setAssets(a => [res.data, ...a]); setShowCreate(false); setForm({}) }
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" /> Asset Management
          </h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>

        {dashboard && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Assets', value: dashboard.totalAssets, icon: Package, color: 'text-indigo-400' },
              { label: 'Active', value: dashboard.byStatus?.active ?? 0, icon: Package, color: 'text-green-400' },
              { label: 'Warranty Expiring', value: dashboard.warrantyExpiring, icon: Shield, color: dashboard.warrantyExpiring > 0 ? 'text-amber-400' : 'text-muted-foreground' },
              { label: 'Service Due', value: dashboard.upcomingService, icon: Wrench, color: dashboard.upcomingService > 0 ? 'text-red-400' : 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, tag, serial..."
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground" />
          </div>
          {['', 'active', 'assigned', 'maintenance', 'retired'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {assets.map(a => (
            <div key={a.id} onClick={() => setSelected(a)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-4 ${selected?.id === a.id ? 'border-indigo-500' : 'border-border'}`}>
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm truncate">{a.name}</p>
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{a.assetTag}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${CONDITION_COLORS[a.condition] ?? 'bg-muted text-muted-foreground'}`}>{a.condition}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{a.category ?? 'Uncategorized'}{a.location ? ` · ${a.location}` : ''}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[a.status] ?? 'bg-muted text-muted-foreground'}`}>{a.status}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
          {assets.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No assets yet</p>}
        </div>
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground">{selected.name}</h2>
            <p className="text-xs text-muted-foreground">{selected.assetTag}</p>
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'Status', value: selected.status },
              { label: 'Condition', value: selected.condition },
              { label: 'Category', value: selected.category },
              { label: 'Location', value: selected.location },
              { label: 'Purchase Price', value: selected.purchasePrice ? `$${Number(selected.purchasePrice).toLocaleString()}` : null },
              { label: 'Purchase Date', value: selected.purchaseDate ? new Date(selected.purchaseDate).toLocaleDateString() : null },
              { label: 'Warranty Expiry', value: selected.warrantyExpiry ? new Date(selected.warrantyExpiry).toLocaleDateString() : null },
              { label: 'Maintenance Records', value: selected._count?.maintenance ?? 0 },
            ].filter(r => r.value !== null && r.value !== undefined).map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium text-right max-w-[160px] truncate">{String(row.value)}</span>
              </div>
            ))}
          </div>
          {selected.warrantyExpiry && new Date(selected.warrantyExpiry) < new Date(Date.now() + 30 * 24 * 3600 * 1000) && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Warranty expiring soon
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Asset</h2>
            <div className="space-y-3">
              {[
                { field: 'assetTag', label: 'Asset Tag' },
                { field: 'name', label: 'Asset Name' },
                { field: 'category', label: 'Category' },
                { field: 'serialNumber', label: 'Serial Number' },
                { field: 'manufacturer', label: 'Manufacturer' },
                { field: 'model', label: 'Model' },
                { field: 'location', label: 'Location' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Purchase Price</label>
                  <input type="number" value={form.purchasePrice ?? ''} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Condition</label>
                  <select value={form.condition ?? 'good'} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['excellent','good','fair','poor'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Purchase Date</label>
                  <input type="date" value={form.purchaseDate ?? ''} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Warranty Expiry</label>
                  <input type="date" value={form.warrantyExpiry ?? ''} onChange={e => setForm(f => ({ ...f, warrantyExpiry: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={create} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Add Asset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
