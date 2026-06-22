'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, Building2, Target, Phone, Mail, Calendar, AlertTriangle, CheckCircle, DollarSign, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'

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

export default function CrmDashboardPage() {
  const { token } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [trend, setTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch(`${API}/v1/crm/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/crm/dashboard/sales-trend?months=6`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([dash, tr]) => {
      if (dash.success) setData(dash.data)
      if (tr.success) setTrend(tr.data)
    }).finally(() => setLoading(false))
  }, [token])

  const fmtCurrency = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toLocaleString()}`

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  const kpis = data?.kpis ?? {}

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Sales pipeline and customer relationship overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/contacts" className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors">Contacts</Link>
          <Link href="/crm/opportunities" className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">Pipeline</Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Contacts" value={kpis.totalContacts?.toLocaleString() ?? '0'} sub={`${kpis.newLeadsThisMonth ?? 0} new leads this month`} icon={Users} color="indigo" />
        <KpiCard label="Companies" value={kpis.totalCompanies?.toLocaleString() ?? '0'} sub="Active accounts" icon={Building2} color="blue" />
        <KpiCard label="Open Deals" value={kpis.openOpportunities?.toLocaleString() ?? '0'} sub={`${fmtCurrency(kpis.pipelineValue ?? 0)} pipeline value`} icon={Target} color="amber" />
        <KpiCard label="Won This Month" value={kpis.wonThisMonth?.count?.toLocaleString() ?? '0'} sub={`${fmtCurrency(kpis.wonThisMonth?.value ?? 0)} revenue`} icon={DollarSign} color="green" />
        <KpiCard label="Win Rate" value={`${kpis.winRate ?? 0}%`} sub={`${kpis.lostThisMonth ?? 0} lost this month`} icon={TrendingUp} color="purple" />
        <KpiCard label="Activities" value={kpis.activitiesThisMonth?.toLocaleString() ?? '0'} sub="This month" icon={Phone} color="indigo" />
        <KpiCard label="Overdue" value={kpis.overdueActivities?.toLocaleString() ?? '0'} sub="Activities past due" icon={AlertTriangle} color="red" />
        <KpiCard label="Pipeline Value" value={fmtCurrency(kpis.pipelineValue ?? 0)} sub="All open deals" icon={BarChart3} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline by Stage */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-1">
          <h2 className="font-semibold text-foreground mb-4">Pipeline by Stage</h2>
          <div className="space-y-3">
            {(data?.stageBreakdown ?? []).map((s: any) => (
              <div key={s.stageId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{s.stageName}</span>
                  <span className="text-muted-foreground">{s.count} · {fmtCurrency(s.totalValue)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: s.stageColor,
                      width: kpis.pipelineValue > 0 ? `${Math.min((s.totalValue / kpis.pipelineValue) * 100, 100)}%` : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
            {(!data?.stageBreakdown?.length) && (
              <p className="text-sm text-muted-foreground text-center py-4">No open deals yet</p>
            )}
          </div>
        </div>

        {/* Top Opportunities */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Top Opportunities</h2>
            <Link href="/crm/opportunities" className="text-xs text-indigo-500 hover:text-indigo-600">View all</Link>
          </div>
          <div className="space-y-3">
            {(data?.topOpportunities ?? []).map((o: any) => (
              <Link key={o.id} href={`/crm/opportunities`} className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: o.stage?.color ?? '#6366f1' }}>
                  {o.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.company?.name ?? o.contact ? `${o.contact?.firstName} ${o.contact?.lastName}` : '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground tabular-nums">{fmtCurrency(Number(o.value))}</p>
                  <Badge className="text-[10px] capitalize">{o.stage?.name}</Badge>
                </div>
              </Link>
            ))}
            {(!data?.topOpportunities?.length) && (
              <p className="text-sm text-muted-foreground text-center py-6">No opportunities yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Activities</h2>
          <Link href="/crm/contacts" className="text-xs text-indigo-500 hover:text-indigo-600">View contacts</Link>
        </div>
        <div className="divide-y divide-border">
          {(data?.recentActivities ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                {a.activityType === 'call' ? <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  : a.activityType === 'email' ? <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  : <Calendar className="w-3.5 h-3.5 text-indigo-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">{a.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : a.company?.name ?? '—'}
                  · {new Date(a.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <Badge variant={a.status === 'completed' ? 'success' : a.status === 'scheduled' ? 'info' as any : 'default'} className="capitalize text-xs shrink-0">
                {a.status}
              </Badge>
            </div>
          ))}
          {(!data?.recentActivities?.length) && (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activities</p>
          )}
        </div>
      </div>

      {/* Contacts by Type */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(data?.contactsByType ?? []).map((g: any) => {
          const typeColor: Record<string, string> = { lead: 'text-amber-500', prospect: 'text-blue-500', customer: 'text-green-500', churned: 'text-red-500' }
          return (
            <div key={g.type} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${typeColor[g.type] ?? 'text-foreground'}`}>{g.count}</p>
              <p className="text-sm text-muted-foreground capitalize mt-1">{g.type}s</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
