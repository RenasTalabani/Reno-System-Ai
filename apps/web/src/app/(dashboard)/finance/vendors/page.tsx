'use client'

import { useEffect, useState } from 'react'
import { Users, Search, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export default function VendorsPage() {
  const { token } = useAuthStore()
  const [vendors, setVendors] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '50', page: '1' })
    if (search) params.set('search', search)
    const res = await fetch(`${API}/v1/finance/vendors?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) { setVendors(json.data); setTotal(json.meta?.pagination?.total ?? 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [token])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} vendors total</p>
        </div>
        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Search vendors..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Vendor</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Email</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Currency</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Payment Terms</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">Bills</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : vendors.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No vendors yet
              </td></tr>
            ) : vendors.map(v => (
              <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-foreground">{v.name}</p>
                  {v.code && <p className="text-xs text-muted-foreground">{v.code}</p>}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{v.email ?? '—'}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{v.currency}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{v.paymentTerms ? `Net ${v.paymentTerms}` : '—'}</td>
                <td className="px-5 py-3.5 text-right text-muted-foreground">{v._count?.bills ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
