'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  confirmed: 'bg-blue-500/10 text-blue-500',
  processing: 'bg-purple-500/10 text-purple-500',
  shipped: 'bg-amber-500/10 text-amber-500',
  delivered: 'bg-green-500/10 text-green-500',
  cancelled: 'bg-red-500/10 text-red-500',
}

export default function OrdersPage() {
  const { token } = useAuthStore()
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '50', page: '1' })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const res = await fetch(`${API}/v1/sales/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) { setOrders(json.data); setTotal(json.meta?.pagination?.total ?? 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [token, status])

  const fmt = (v: number) => `$${Number(v).toFixed(2)}`

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} orders total</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by number..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Order #</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Total</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Items</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Invoices</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No orders yet
              </td></tr>
            ) : orders.map(o => (
              <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5 font-mono font-medium text-indigo-500">{o.number}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>{o.status}</span>
                </td>
                <td className="px-5 py-3.5 font-medium tabular-nums">{fmt(Number(o.total))}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{o._count?.items ?? 0}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{o._count?.invoices ?? 0}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
