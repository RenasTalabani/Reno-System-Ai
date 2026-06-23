'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, ShoppingCart, AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardData {
  invoiceCount: number
  orderCount: number
  overdueCount: number
  recentInvoices: { id: string; number: string; status: string; totalAmount: number; currency: string; dueDate?: string }[]
}

export default function CustomerPortalPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    fetch('/api/v1/portal/customer/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const stats = [
    { label: 'Total Invoices', value: data?.invoiceCount ?? 0, icon: FileText, href: '/portal/customer/invoices', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Orders', value: data?.orderCount ?? 0, icon: ShoppingCart, href: '/portal/customer/orders', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Overdue Invoices', value: data?.overdueCount ?? 0, icon: AlertCircle, href: '/portal/customer/invoices?status=overdue', color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-secondary, #8b5cf6))' }}>
        <h1 className="text-2xl font-bold">Customer Portal</h1>
        <p className="text-white/80 mt-1">View your invoices, track orders, and get support</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href} className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-all">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'View Invoices', href: '/portal/customer/invoices', icon: FileText },
          { label: 'Track Orders', href: '/portal/customer/orders', icon: ShoppingCart },
          { label: 'Get Support', href: '/portal/tickets', icon: AlertCircle },
        ].map(a => {
          const Icon = a.icon
          return (
            <Link key={a.href} href={a.href} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all text-center">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-indigo-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">{a.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Recent Invoices</h2>
          <Link href="/portal/customer/invoices" className="text-xs text-indigo-600 hover:text-indigo-700">View all</Link>
        </div>
        {!data?.recentInvoices?.length ? (
          <p className="text-sm text-gray-400 text-center py-4">No invoices yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{inv.number}</p>
                  {inv.dueDate && <p className="text-xs text-gray-400">Due {new Date(inv.dueDate).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {inv.currency} {Number(inv.totalAmount).toLocaleString()}
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', {
                    'bg-green-100 text-green-700': inv.status === 'paid',
                    'bg-red-100 text-red-700': inv.status === 'overdue',
                    'bg-yellow-100 text-yellow-700': inv.status === 'sent' || inv.status === 'draft',
                  })}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
