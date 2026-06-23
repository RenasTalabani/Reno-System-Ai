'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, FileText, Users, TrendingUp, AlertTriangle, CheckCircle, DollarSign, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function KpiCard({ label, value, sub, icon: Icon, color = 'indigo', href }: any) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
  }
  const card = (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/30 transition-colors">
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
  return href ? <Link href={href}>{card}</Link> : card
}

export default function FinanceDashboardPage() {
  const { token } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/v1/finance/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => { if (json.success) setData(json.data) })
      .finally(() => setLoading(false))
  }, [token])

  const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  const ap = data?.ap ?? {}
  const ar = data?.ar ?? {}
  const journals = data?.journals ?? {}

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.currentPeriod ? `Current period: ${data.currentPeriod.name}` : 'No open accounting period'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/journals" className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors">Journals</Link>
          <Link href="/finance/reports" className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">Reports</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Accounts Payable" value={fmt(ap.outstanding ?? 0)} sub={`${ap.overdueCount ?? 0} overdue bills`} icon={DollarSign} color={ap.overdueCount > 0 ? 'red' : 'amber'} href="/finance/vendors" />
        <KpiCard label="Accounts Receivable" value={fmt(ar.outstanding ?? 0)} sub={`${ar.overdueCount ?? 0} overdue invoices`} icon={TrendingUp} color={ar.overdueCount > 0 ? 'red' : 'green'} href="/sales/invoices" />
        <KpiCard label="Journal Entries" value={(journals.total ?? 0).toLocaleString()} sub={`${journals.drafts ?? 0} pending approval`} icon={BookOpen} color="indigo" href="/finance/journals" />
        <KpiCard label="Chart of Accounts" value={(data?.accounts?.total ?? 0).toLocaleString()} sub="Accounts configured" icon={BarChart3} color="blue" href="/finance/accounts" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Vendors" value={(data?.vendors?.total ?? 0).toLocaleString()} sub="Active suppliers" icon={Users} color="purple" href="/finance/vendors" />
        <KpiCard label="Bills This Month" value={(ap.billsThisMonth ?? 0).toLocaleString()} sub="Vendor bills" icon={FileText} color="amber" />
        <KpiCard label="Posted Journals" value={(journals.posted ?? 0).toLocaleString()} sub="In general ledger" icon={CheckCircle} color="green" />
        <KpiCard label="Draft Journals" value={(journals.drafts ?? 0).toLocaleString()} sub="Pending posting" icon={AlertTriangle} color={journals.drafts > 0 ? 'amber' : 'indigo'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Journals */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recent Journal Entries</h2>
            <Link href="/finance/journals" className="text-xs text-indigo-500 hover:text-indigo-600">View all</Link>
          </div>
          <div className="space-y-2">
            {(data?.recentJournals ?? []).map((j: any) => {
              const statusColor: Record<string, string> = { posted: 'text-green-500 bg-green-500/10', draft: 'text-amber-500 bg-amber-500/10', void: 'text-muted-foreground bg-muted' }
              return (
                <Link key={j.id} href="/finance/journals" className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-lg transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-mono font-medium text-foreground">{j.number}</p>
                    <p className="text-xs text-muted-foreground truncate">{j.description ?? j.type}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[j.status] ?? 'bg-muted text-muted-foreground'}`}>{j.status}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(j.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </Link>
              )
            })}
            {(!data?.recentJournals?.length) && <p className="text-sm text-muted-foreground text-center py-4">No journal entries yet</p>}
          </div>
        </div>

        {/* Top Expenses */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Top Expense Accounts (YTD)</h2>
          <div className="space-y-3">
            {(data?.topExpenses ?? []).map((e: any, i: number) => (
              <div key={e.accountId} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{e.name}</p>
                </div>
                <p className="text-sm font-semibold text-foreground tabular-nums">{e.amount >= 1000 ? `$${(e.amount / 1000).toFixed(1)}K` : `$${e.amount.toFixed(0)}`}</p>
              </div>
            ))}
            {(!data?.topExpenses?.length) && <p className="text-sm text-muted-foreground text-center py-4">No expense data yet</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Link href="/finance/reports" className="text-xs text-indigo-500 hover:text-indigo-600">View full P&L report →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
