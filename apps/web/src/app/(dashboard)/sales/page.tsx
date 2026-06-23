'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, ShoppingCart, FileText, CreditCard, TrendingUp, RefreshCw, AlertTriangle, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function KpiCard({ label, value, sub, icon: Icon, color = 'indigo' }: any) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
  }
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export default function SalesDashboardPage() {
  const { token } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [trend, setTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch(`${API}/v1/sales/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/sales/dashboard/revenue-trend?months=6`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([dash, tr]) => {
      if (dash.success) setData(dash.data)
      if (tr.success) setTrend(tr.data)
    }).finally(() => setLoading(false))
  }, [token])

  const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  const revenue = data?.revenue ?? {}
  const invoices = data?.invoices ?? {}
  const counts = data?.counts ?? {}

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Revenue, invoices, and subscription analytics</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/quotations" className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors">Quotations</Link>
          <Link href="/sales/orders" className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors">Orders</Link>
          <Link href="/sales/invoices" className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">Invoices</Link>
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={fmt(revenue.total ?? 0)} sub="All time" icon={DollarSign} color="green" />
        <KpiCard label="This Month" value={fmt(revenue.thisMonth ?? 0)} sub="Collected revenue" icon={TrendingUp} color="indigo" />
        <KpiCard label="MRR" value={fmt(revenue.mrr ?? 0)} sub={`ARR: ${fmt(revenue.arr ?? 0)}`} icon={RefreshCw} color="purple" />
        <KpiCard label="Outstanding" value={fmt(invoices.totalOutstanding ?? 0)} sub={`${invoices.overdueCount ?? 0} overdue invoices`} icon={AlertTriangle} color={invoices.overdueCount > 0 ? 'red' : 'amber'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Quotations" value={(counts.quotations ?? 0).toLocaleString()} sub="Total created" icon={FileText} color="blue" />
        <KpiCard label="Orders" value={(counts.orders ?? 0).toLocaleString()} sub="Total orders" icon={ShoppingCart} color="indigo" />
        <KpiCard label="Invoices" value={(counts.invoices ?? 0).toLocaleString()} sub={`${invoices.paidThisMonth ?? 0} paid this month`} icon={CreditCard} color="green" />
        <KpiCard label="Subscriptions" value={(counts.activeSubscriptions ?? 0).toLocaleString()} sub="Active recurring" icon={RefreshCw} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h2 className="font-semibold text-foreground mb-4">Revenue Trend (6 months)</h2>
          {trend.length > 0 ? (
            <div className="flex items-end gap-2 h-32">
              {(() => {
                const max = Math.max(...trend.map(t => t.revenue), 1)
                return trend.map((t) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-indigo-500 rounded-t-sm transition-all"
                      style={{ height: `${Math.max((t.revenue / max) * 100, 4)}%` }}
                    />
                    <p className="text-[10px] text-muted-foreground">{t.month.slice(5)}</p>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No revenue data yet</p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Top Products</h2>
          <div className="space-y-3">
            {(data?.topProducts ?? []).map((p: any, i: number) => (
              <div key={p.productId ?? i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{p.name}</p>
                </div>
                <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(p.totalRevenue)}</p>
              </div>
            ))}
            {(!data?.topProducts?.length) && (
              <p className="text-sm text-muted-foreground text-center py-4">No sales data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Invoices</h2>
          <Link href="/sales/invoices" className="text-xs text-indigo-500 hover:text-indigo-600">View all</Link>
        </div>
        <div className="divide-y divide-border">
          {(data?.recentInvoices ?? []).map((inv: any) => {
            const statusColor: Record<string, string> = { paid: 'text-green-500 bg-green-500/10', sent: 'text-blue-500 bg-blue-500/10', overdue: 'text-red-500 bg-red-500/10', draft: 'text-muted-foreground bg-muted', void: 'text-muted-foreground bg-muted', partial: 'text-amber-500 bg-amber-500/10' }
            return (
              <Link key={inv.id} href={`/sales/invoices/${inv.id}`} className="flex items-center gap-4 py-3 hover:bg-muted/30 rounded-lg px-2 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex-1" />
                <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(Number(inv.total))}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[inv.status] ?? 'text-muted-foreground bg-muted'}`}>{inv.status}</span>
              </Link>
            )
          })}
          {(!data?.recentInvoices?.length) && (
            <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
