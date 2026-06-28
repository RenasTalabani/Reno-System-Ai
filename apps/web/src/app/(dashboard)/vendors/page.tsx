'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Star, FileText, ChevronRight, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Vendor { id: string; name: string; code: string | null; category: string | null; status: string; contactEmail: string | null; paymentTerms: number; rating: number; currency: string; _count?: { quotes: number } }
interface Dashboard { totalVendors: number; pendingQuotes: number; topRated: Array<{ id: string; name: string; rating: number; category: string | null }> }

export default function VendorsPage() {
  const { token } = useAuthStore()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Vendor | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [ratingVendor, setRatingVendor] = useState<string | null>(null)

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    Promise.all([
      fetch(`${API}/v1/vendors?${q}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/vendors/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([v, d]) => { setVendors(v.data ?? []); setDashboard(d.data) })
  }

  useEffect(() => { load() }, [search, token])

  const create = async () => {
    const res = await fetch(`${API}/v1/vendors`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, paymentTerms: parseInt(form.paymentTerms ?? '30'), rating: parseInt(form.rating ?? '3') }) }).then(r => r.json())
    if (res.data) { setVendors(v => [res.data, ...v]); setShowCreate(false); setForm({}) }
  }

  const setRating = async (id: string, rating: number) => {
    await fetch(`${API}/v1/vendors/${id}/rating`, { method: 'PATCH', headers: h, body: JSON.stringify({ rating }) })
    setVendors(v => v.map(x => x.id === id ? { ...x, rating } : x))
    if (selected?.id === id) setSelected(s => s ? { ...s, rating } : null)
    setRatingVendor(null)
  }

  const StarRating = ({ rating, vendorId }: { rating: number; vendorId: string }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={e => { e.stopPropagation(); setRating(vendorId, n) }}
          className={`w-3.5 h-3.5 transition-colors ${n <= rating ? 'text-amber-400' : 'text-muted-foreground/30'}`}>
          <Star className="w-full h-full fill-current" />
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" /> Vendor Portal
          </h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>

        {dashboard && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Vendors', value: dashboard.totalVendors },
              { label: 'Pending Quotes', value: dashboard.pendingQuotes },
              { label: 'Top Rated', value: dashboard.topRated[0]?.name ?? '—' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {vendors.map(v => (
            <div key={v.id} onClick={() => setSelected(v)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-4 ${selected?.id === v.id ? 'border-indigo-500' : 'border-border'}`}>
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm truncate">{v.name}</p>
                  {v.code && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{v.code}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{v.category ?? 'General'} · Net-{v.paymentTerms}</p>
              </div>
              <StarRating rating={v.rating} vendorId={v.id} />
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
          {vendors.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No vendors yet</p>}
        </div>
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground">{selected.name}</h2>
            {selected.code && <p className="text-xs text-muted-foreground">{selected.code}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rating</p>
            <StarRating rating={selected.rating} vendorId={selected.id} />
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'Category', value: selected.category },
              { label: 'Contact', value: selected.contactEmail },
              { label: 'Payment Terms', value: `Net-${selected.paymentTerms}` },
              { label: 'Currency', value: selected.currency },
              { label: 'Quotes', value: selected._count?.quotes ?? 0 },
              { label: 'Status', value: selected.status },
            ].filter(r => r.value !== null && r.value !== undefined).map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{String(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Vendor</h2>
            <div className="space-y-3">
              {[
                { field: 'name', label: 'Company Name' },
                { field: 'code', label: 'Vendor Code' },
                { field: 'category', label: 'Category' },
                { field: 'contactEmail', label: 'Contact Email' },
                { field: 'contactName', label: 'Contact Name' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Payment Terms (days)</label>
                  <input type="number" value={form.paymentTerms ?? '30'} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Currency</label>
                  <input value={form.currency ?? 'USD'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={create} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Add Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
