'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, FileText, CheckCircle2, ArrowRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupplierDash {
  pendingPos: number
  sentRfqs: number
  receivedPos: number
  recentOrders: { id: string; number: string; status: string; totalAmount: number; currency: string; expectedDate?: string }[]
}

export default function SupplierPortalPage() {
  const [data, setData] = useState<SupplierDash | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    fetch('/api/v1/portal/supplier/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const stats = [
    { label: 'Pending POs', value: data?.pendingPos ?? 0, icon: Clock, href: '/portal/supplier/orders?status=sent', color: 'bg-amber-50 text-amber-600' },
    { label: 'Open RFQs', value: data?.sentRfqs ?? 0, icon: FileText, href: '/portal/supplier/rfqs', color: 'bg-blue-50 text-blue-600' },
    { label: 'Received POs', value: data?.receivedPos ?? 0, icon: CheckCircle2, href: '/portal/supplier/orders?status=received', color: 'bg-green-50 text-green-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-secondary, #8b5cf6))' }}>
        <h1 className="text-2xl font-bold">Supplier Portal</h1>
        <p className="text-white/80 mt-1">Manage purchase orders, respond to RFQs, and get support</p>
      </div>

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

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Purchase Orders', href: '/portal/supplier/orders', icon: ShoppingCart },
          { label: 'RFQs', href: '/portal/supplier/rfqs', icon: FileText },
          { label: 'Get Support', href: '/portal/tickets', icon: CheckCircle2 },
        ].map(a => {
          const Icon = a.icon
          return (
            <Link key={a.href} href={a.href} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all text-center">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">{a.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Recent Purchase Orders</h2>
          <Link href="/portal/supplier/orders" className="text-xs text-indigo-600">View all</Link>
        </div>
        {!data?.recentOrders?.length ? (
          <p className="text-sm text-gray-400 text-center py-4">No purchase orders yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recentOrders.map(po => (
              <div key={po.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{po.number}</p>
                  {po.expectedDate && <p className="text-xs text-gray-400">Expected {new Date(po.expectedDate).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{po.currency} {Number(po.totalAmount).toLocaleString()}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', {
                    'bg-yellow-100 text-yellow-700': po.status === 'sent',
                    'bg-green-100 text-green-700': po.status === 'received',
                    'bg-gray-100 text-gray-600': po.status === 'draft',
                  })}>
                    {po.status}
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
