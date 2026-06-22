'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Clock, Calendar, FileText, DollarSign, Briefcase, TrendingUp, TrendingDown, AlertCircle, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

interface HrKpis {
  headcount: { total: number; active: number; onLeaveToday: number; newThisMonth: number; terminatedThisMonth: number; turnoverRate: number }
  pending: { leaveRequests: number; documentVerifications: number; expiringDocuments: number }
  payroll: { month: number; year: number; count: number; totalGross: number; totalNet: number }
  upcomingHolidays: Array<{ id: string; name: string; date: string; holidayType: string }>
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function KpiCard({ label, value, sub, icon: Icon, color, href }: { label: string; value: number | string; sub?: string; icon: any; color: string; href?: string }) {
  const content = (
    <div className={`bg-card border border-border rounded-xl p-5 flex items-start gap-4 ${href ? 'hover:border-indigo-500/50 transition-colors cursor-pointer' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function HrDashboardPage() {
  const { token } = useAuthStore()
  const [kpis, setKpis] = useState<HrKpis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/v1/hr/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setKpis(data.data)
      } finally {
        setLoading(false)
      }
    }
    if (token) load()
  }, [token])

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const quickLinks = [
    { label: 'Employees', href: '/hr/employees', icon: Users, desc: 'Manage employee profiles' },
    { label: 'Attendance', href: '/hr/attendance', icon: Clock, desc: 'Track daily attendance' },
    { label: 'Leave Requests', href: '/hr/leave', icon: Calendar, desc: 'Approve & manage leave' },
    { label: 'Payroll', href: '/hr/payroll', icon: DollarSign, desc: 'Process payslips' },
    { label: 'Documents', href: '/hr/documents', icon: FileText, desc: 'Employee documents' },
    { label: 'Settings', href: '/hr/settings', icon: Briefcase, desc: 'Positions, shifts, holidays' },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Human Resources — overview and quick access</p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : kpis ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Employees" value={kpis.headcount.total} sub={`${kpis.headcount.active} active`} icon={Users} color="bg-indigo-500" href="/hr/employees" />
            <KpiCard label="On Leave Today" value={kpis.headcount.onLeaveToday} icon={Calendar} color="bg-amber-500" href="/hr/leave" />
            <KpiCard label="Pending Leave" value={kpis.pending.leaveRequests} sub="awaiting approval" icon={AlertCircle} color="bg-red-500" href="/hr/leave" />
            <KpiCard label={`Payroll ${months[(kpis.payroll.month ?? 1) - 1]}`} value={`$${kpis.payroll.totalNet.toLocaleString()}`} sub={`${kpis.payroll.count} payslips`} icon={DollarSign} color="bg-emerald-500" href="/hr/payroll" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">This Month</span>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{kpis.headcount.newThisMonth}</p>
                    <p className="text-xs text-muted-foreground">New hires</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{kpis.headcount.terminatedThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Terminated</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-muted-foreground mb-3">Action Required</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/70">Expiring Documents</span>
                  <span className={`font-semibold ${kpis.pending.expiringDocuments > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{kpis.pending.expiringDocuments}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/70">Unverified Docs</span>
                  <span className={`font-semibold ${kpis.pending.documentVerifications > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{kpis.pending.documentVerifications}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-muted-foreground mb-3">Upcoming Holidays</p>
              {kpis.upcomingHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming holidays</p>
              ) : (
                <div className="space-y-2">
                  {kpis.upcomingHolidays.slice(0, 3).map(h => (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground/80 truncate">{h.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{new Date(h.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Quick Links */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">HR Modules</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-indigo-500/50 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                <link.icon className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
