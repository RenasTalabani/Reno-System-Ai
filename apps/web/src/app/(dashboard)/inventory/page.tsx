'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Warehouse, ArrowRightLeft, AlertTriangle, TrendingUp, ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const MOVEMENT_LABELS: Record<string, string> = {
  receipt: 'Receipt', issue: 'Issue',
  transfer_in: 'Transfer In', transfer_out: 'Transfer Out',
  adjustment_in: 'Adj +', adjustment_out: 'Adj −',
  opening: 'Opening', return_in: 'Return In', return_out: 'Return Out',
}
const MOVEMENT_COLORS: Record<string, string> = {
  receipt: 'bg-green-500/10 text-green-500',
  issue: 'bg-red-500/10 text-red-500',
  transfer_in: 'bg-blue-500/10 text-blue-500',
  transfer_out: 'bg-orange-500/10 text-orange-500',
  adjustment_in: 'bg-green-500/10 text-green-600',
  adjustment_out: 'bg-red-500/10 text-red-600',
  opening: 'bg-purple-500/10 text-purple-500',
  return_in: 'bg-cyan-500/10 text-cyan-500',
  return_out: 'bg-pink-500/10 text-pink-500',
}

export default function InventoryDashboard() {
  const { token } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/v1/inventory/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data) })
      .finally(() => setLoading(false))
  }, [token])

  const fmt = (v: number) => `$${Number(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
    </div>
  )

  const kpis = data?.kpis ?? {}

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">Stock levels, movements, and warehouse management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Products', value: kpis.totalProducts ?? 0, icon: Package, color: 'text-indigo-500', href: '/inventory/products' },
          { label: 'Warehouses', value: kpis.totalWarehouses ?? 0, icon: Warehouse, color: 'text-blue-500', href: '/inventory/warehouses' },
          { label: "Movements Today", value: kpis.movementsToday ?? 0, icon: ArrowRightLeft, color: 'text-purple-500', href: '/inventory/movements' },
          { label: 'Low Stock Alerts', value: kpis.lowStockAlerts ?? 0, icon: AlertTriangle, color: kpis.lowStockAlerts > 0 ? 'text-red-500' : 'text-green-500', href: '/inventory/products' },
          { label: 'Inventory Value', value: fmt(kpis.totalInventoryValue ?? 0), icon: TrendingUp, color: 'text-green-500', href: '/inventory/products' },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Movements */}
        <div className="col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Movements</h2>
            <Link href="/inventory/movements" className="text-xs text-indigo-500 hover:underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium">Number</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium">Product</th>
                <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!data?.recentMovements?.length ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-xs">No movements yet</td></tr>
              ) : data.recentMovements.map((m: any) => (
                <tr key={m.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3 font-mono text-xs text-indigo-500">{m.number}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOVEMENT_COLORS[m.type] ?? 'bg-muted text-muted-foreground'}`}>
                      {MOVEMENT_LABELS[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-foreground">{m.productName}</p>
                    <p className="text-xs text-muted-foreground">{m.productCode}</p>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">{Number(m.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-foreground">Low Stock Alerts</h2>
          </div>
          <div className="divide-y divide-border">
            {!data?.lowStockItems?.length ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-xs">
                <Package className="w-6 h-6 mx-auto mb-2 opacity-30" />
                All stock levels are healthy
              </div>
            ) : data.lowStockItems.map((item: any) => (
              <div key={item.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.onHand <= 0 ? 'text-red-500' : 'text-amber-500'}`}>
                      {item.onHand <= 0 ? 'OUT' : item.onHand}
                    </p>
                    <p className="text-xs text-muted-foreground">min {Number(item.minStockLevel)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <Link href="/inventory/products" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
              <ClipboardList className="w-3 h-3" /> View all products
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'New Receipt', desc: 'Record incoming stock', href: '/inventory/receipts', icon: Package },
          { label: 'Stock Transfer', desc: 'Move stock between warehouses', href: '/inventory/transfers', icon: ArrowRightLeft },
          { label: 'Adjustment', desc: 'Cycle count or correction', href: '/inventory/adjustments', icon: ClipboardList },
          { label: 'Warehouse Setup', desc: 'Manage warehouses & zones', href: '/inventory/warehouses', icon: Warehouse },
        ].map(a => (
          <Link key={a.label} href={a.href} className="bg-card border border-border rounded-xl p-4 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group">
            <a.icon className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-sm font-medium text-foreground group-hover:text-indigo-500 transition-colors">{a.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
