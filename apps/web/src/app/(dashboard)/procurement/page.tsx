'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Package, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react'

interface KPIs {
  totalSuppliers: number
  totalOrders: number
  openOrders: number
  pendingApproval: number
  pendingRequisitions: number
  totalSpend30d: number
}

interface RecentOrder {
  id: string
  number: string
  status: string
  supplierName: string
  totalAmount: number
  lineCount: number
  createdAt: string
}

interface TopSupplier {
  id: string
  name: string
  code: string
  overallScore: number | null
  totalSpend: number
  orderCount: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  sent: 'bg-purple-100 text-purple-700',
  partially_received: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function ProcurementDashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/procurement/dashboard')
      .then(r => r.json())
      .then(d => {
        setKpis(d.data.kpis)
        setRecentOrders(d.data.recentOrders)
        setTopSuppliers(d.data.topSuppliers)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading procurement data...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
        <p className="text-gray-500 text-sm mt-1">Purchase orders, suppliers, requisitions, and RFQs</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Package size={16} />
            <span className="text-xs font-medium">Suppliers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis?.totalSuppliers ?? 0}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <ShoppingCart size={16} />
            <span className="text-xs font-medium">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis?.totalOrders ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Clock size={16} />
            <span className="text-xs font-medium">Open Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis?.openOrders ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <AlertCircle size={16} />
            <span className="text-xs font-medium">Pending Approval</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis?.pendingApproval ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <CheckCircle size={16} />
            <span className="text-xs font-medium">Requisitions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis?.pendingRequisitions ?? 0}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <DollarSign size={16} />
            <span className="text-xs font-medium">Spend (30d)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${(kpis?.totalSpend30d ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <a href="/procurement/orders" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No orders yet</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{o.number}</p>
                  <p className="text-xs text-gray-500">{o.supplierName} · {o.lineCount} items</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    ${Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Top Suppliers</h2>
            <a href="/procurement/suppliers" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {topSuppliers.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No supplier data</p>
            ) : topSuppliers.map(s => (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.orderCount} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      ${Number(s.totalSpend).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    {s.overallScore != null && (
                      <p className="text-xs text-gray-400">Score: {Number(s.overallScore).toFixed(1)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/procurement/orders" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <ShoppingCart size={14} />
            New Purchase Order
          </a>
          <a href="/procurement/requisitions" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            <Package size={14} />
            New Requisition
          </a>
          <a href="/procurement/suppliers" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            <Package size={14} />
            Manage Suppliers
          </a>
        </div>
      </div>
    </div>
  )
}
