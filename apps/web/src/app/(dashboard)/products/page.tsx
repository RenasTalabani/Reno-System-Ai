'use client'
import { useState, useEffect } from 'react'
import { Package, Tag, Layers, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { totalProducts: number; activeProducts: number; categories: number }
interface Product { id: string; name: string; sku: string; basePrice: number; currency: string; isActive: boolean; category: { name: string } | null; _count: { variants: number } }

export default function ProductsPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, p] = await Promise.all([
      fetch(`${API}/v1/products/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/products/`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setProducts(p.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Package className="w-5 h-5 text-indigo-500" /> Product Catalog</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> Add Product</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Products', value: summary.totalProducts, icon: Package, color: 'text-blue-400' },
            { label: 'Active', value: summary.activeProducts, icon: Layers, color: 'text-emerald-400' },
            { label: 'Categories', value: summary.categories, icon: Tag, color: 'text-indigo-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {products.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">SKU: {p.sku} · {p.category?.name ?? 'Uncategorized'} · {p._count.variants} variants</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{p.currency} {Number(p.basePrice).toFixed(2)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && products.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No products yet.</p>}
      </div>
    </div>
  )
}