'use client'
import { useState, useEffect } from 'react'
import { ShoppingCart, Package, Truck, DollarSign, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Order { id: string; orderNo: string; status: string; channel: string; total: number; currency: string; placedAt: string; _count: { lines: number; shipments: number } }
interface Summary { totalOrders: number; pendingOrders: number; shippedOrders: number; totalRevenue: number }

const statusColor = (s: string) => ({ pending: 'bg-amber-500/10 text-amber-400', confirmed: 'bg-blue-500/10 text-blue-400', shipped: 'bg-indigo-500/10 text-indigo-400', delivered: 'bg-emerald-500/10 text-emerald-400', cancelled: 'bg-red-500/10 text-red-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function OrdersPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, o] = await Promise.all([
      fetch(`${API}/v1/oms/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/oms/orders`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setOrders(o.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-500" /> Order Management</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Order</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Orders', value: summary.totalOrders, icon: ShoppingCart },
            { label: 'Pending', value: summary.pendingOrders, icon: Package },
            { label: 'Shipped', value: summary.shippedOrders, icon: Truck },
            { label: 'Total Revenue', value: `$${Number(summary.totalRevenue).toLocaleString()}`, icon: DollarSign },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className="w-4 h-4 text-indigo-400" /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {orders.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No orders yet.</p>}
          {orders.map(o => (
            <div key={o.id} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-medium text-foreground">{o.orderNo}</p>
                  <span className="text-xs text-muted-foreground capitalize">{o.channel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{o._count.lines} items · {new Date(o.placedAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>{o.status}</span>
              <p className="text-sm font-bold text-foreground">${Number(o.total).toLocaleString()} {o.currency}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
