'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar, FileText, DollarSign, Bell, Plus, Clock,
  CheckCircle2, AlertCircle, ArrowRight, Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaveBalance {
  id: string
  leaveTypeId: string
  balance: number
  used: number
  leaveType?: { name: string; color?: string }
}

interface DashboardData {
  portalType: string
  notifications: any[]
  tickets: number
  unreadNotifications: number
  employee?: {
    leaveBalance: LeaveBalance[]
    pendingLeave: number
    recentPayslip?: { id: string; period: string; netPay: number; status: string; currency: string } | null
  }
}

function StatCard({ label, value, icon: Icon, color, href }: { label: string; value: string | number; icon: any; color: string; href?: string }) {
  const content = (
    <div className={cn('bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4', href && 'hover:shadow-md transition-all cursor-pointer')}>
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      {href && <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function EmployeePortalPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch('/api/v1/portal/dashboard', { headers }).then(r => r.json()),
      fetch('/api/v1/portal/employee/profile', { headers }).then(r => r.json()),
    ]).then(([dash, prof]) => {
      if (dash.success) setData(dash.data)
      if (prof.success) setProfile(prof.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const emp = data?.employee
  const greeting = profile?.firstName ? `Welcome back, ${profile.firstName}!` : 'Welcome!'

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-secondary, #8b5cf6))' }}
      >
        <h1 className="text-2xl font-bold">{greeting}</h1>
        {profile?.jobPosition?.title && (
          <p className="text-white/80 mt-1">{profile.jobPosition.title}</p>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-white/80">
          {profile?.department && <span>{profile.department}</span>}
          {profile?.startDate && <span>Since {new Date(profile.startDate).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Leave"
          value={emp?.pendingLeave ?? 0}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
          href="/portal/employee/leave"
        />
        <StatCard
          label="Open Tickets"
          value={data?.tickets ?? 0}
          icon={Inbox}
          color="bg-rose-50 text-rose-600"
          href="/portal/tickets"
        />
        <StatCard
          label="Unread Notifications"
          value={data?.unreadNotifications ?? 0}
          icon={Bell}
          color="bg-purple-50 text-purple-600"
          href="/portal/notifications"
        />
        <StatCard
          label="Latest Payslip"
          value={emp?.recentPayslip ? `${emp.recentPayslip.currency} ${Number(emp.recentPayslip.netPay).toLocaleString()}` : '—'}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
          href="/portal/employee/payslips"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Request Leave', href: '/portal/employee/leave', icon: Calendar, color: 'text-indigo-600' },
          { label: 'View Payslips', href: '/portal/employee/payslips', icon: DollarSign, color: 'text-green-600' },
          { label: 'My Documents', href: '/portal/employee/documents', icon: FileText, color: 'text-amber-600' },
          { label: 'Submit Ticket', href: '/portal/tickets', icon: Plus, color: 'text-rose-600' },
        ].map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon className={cn('w-5 h-5', action.color)} />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Balance */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Leave Balance</h2>
            <Link href="/portal/employee/leave" className="text-xs text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </div>
          {!emp?.leaveBalance?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">No leave balances configured</p>
          ) : (
            <div className="space-y-3">
              {emp.leaveBalance.slice(0, 5).map((lb) => (
                <div key={lb.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{lb.leaveType?.name ?? 'Leave'}</span>
                  <span className="text-sm font-semibold text-gray-900">{lb.balance} days</span>
                  <span className="text-xs text-gray-400">({lb.used} used)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Notifications</h2>
            <Link href="/portal/notifications" className="text-xs text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </div>
          {!data?.notifications?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">No new notifications</p>
          ) : (
            <div className="space-y-3">
              {data.notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', {
                    'bg-blue-400': notif.type === 'info',
                    'bg-green-400': notif.type === 'success',
                    'bg-amber-400': notif.type === 'warning',
                    'bg-red-400': notif.type === 'error',
                  })} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                    <p className="text-xs text-gray-500 truncate">{notif.body}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
