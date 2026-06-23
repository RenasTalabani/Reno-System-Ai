'use client'

import { useEffect, useState } from 'react'
import { Package, Search, Plus, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const TYPE_COLORS: Record<string, string> = {
  storable: 'bg-blue-500/10 text-blue-500',
  consumable: 'bg-purple-500/10 text-purple-500',
  service: 'bg-muted text-muted-foreground',
}

export default function ProductsPage() {
  const { token } = useAuthStore()
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '50', page: '1' })
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    const res = await fetch(`${API}/v1/inventory/products?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) { setProducts(json.data); setTotal(json.meta?.pagination?.total ?? 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [token, type])

  const getTotalOnHand = (p: any) =>
    (p.stockBalances ?? []).reduce((s: number, b: any) => s + Number(b.onHand), 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} products total</p>
        </div>
        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by name, code, or barcode..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type"
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none">
          <option value="">All Types</option>
          <option value="storable">Storable</option>
          <option value="consumable">Consumable</option>
          <option value="service">Service</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Code</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Product</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Category</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">On Hand</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">Cost Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No products yet
              </td></tr>
            ) : products.map(p => {
              const onHand = getTotalOnHand(p)
              const isLow = p.minStockLevel != null && onHand < Number(p.minStockLevel)
              return (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{p.code}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">{p.name}</p>
                    {p.barcode && <p className="text-xs text-muted-foreground">Barcode: {p.barcode}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.category?.name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[p.type] ?? 'bg-muted text-muted-foreground'}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      <span className={`font-medium tabular-nums ${isLow ? 'text-amber-500' : 'text-foreground'}`}>
                        {onHand.toLocaleString()}
                      </span>
                      {p.unit && <span className="text-xs text-muted-foreground">{p.unit.symbol}</span>}
                    </div>
                    {isLow && <p className="text-xs text-muted-foreground">min {Number(p.minStockLevel)}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">
                    {p.costPrice ? `$${Number(p.costPrice).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
