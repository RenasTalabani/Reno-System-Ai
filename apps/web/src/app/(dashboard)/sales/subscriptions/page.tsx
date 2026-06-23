'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  paused: 'bg-amber-500/10 text-amber-500',
  cancelled: 'bg-red-500/10 text-red-500',
  expired: 'bg-muted text-muted-foreground',
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: '/mo', quarterly: '/qtr', yearly: '/yr',
}

export default function SubscriptionsPage() {
  const { token } = useAuthStore()
  const [subs, setSubs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '50', page: '1' })
    if (status) params.set('status', status)
    const res = await fetch(`${API}/v1/sales/subscriptions?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) { setSubs(json.data); setTotal(json.meta?.pagination?.total ?? 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [token, status])

  const fmt = (v: number | string) => `$${Number(v).toFixed(2)}`

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} subscriptions</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Name</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Amount</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Interval</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Next Billing</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Billing Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : subs.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No subscriptions {status ? `with status "${status}"` : 'yet'}
              </td></tr>
            ) : subs.map(s => (
              <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-foreground">{s.planName}</p>
                  {s.product && <p className="text-xs text-muted-foreground">{s.product.name}</p>}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[s.status] ?? 'bg-muted text-muted-foreground'}`}>{s.status}</span>
                </td>
                <td className="px-5 py-3.5 font-medium tabular-nums">{fmt(s.amount)} {s.currency}</td>
                <td className="px-5 py-3.5 text-muted-foreground capitalize">{s.billingInterval}</td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{s.billingCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
