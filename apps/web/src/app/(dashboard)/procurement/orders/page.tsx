'use client'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  number: string
  status: string
  supplier: { name: string; code: string }
  totalAmount: number
  currency: string
  expectedDate: string | null
  createdAt: string
  _count: { lines: number; approvals: number }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  sent: 'bg-purple-100 text-purple-700',
  partially_received: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (s = search, status = statusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (s) params.set('search', s)
    if (status) params.set('status', status)
    fetch(`/api/v1/procurement/orders?${params}`)
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{total} orders total</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <form onSubmit={e => { e.preventDefault(); load() }} className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by PO number or supplier ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
        <select
          aria-label="Filter by status"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); load(search, e.target.value) }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
          <option value="partially_received">Partially Received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">PO Number</th>
              <th className="px-4 py-3 font-medium text-gray-500">Supplier</th>
              <th className="px-4 py-3 font-medium text-gray-500">Lines</th>
              <th className="px-4 py-3 font-medium text-gray-500">Total Amount</th>
              <th className="px-4 py-3 font-medium text-gray-500">Expected</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
            ) : orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/procurement/orders/${o.id}`} className="font-mono text-sm text-blue-600 hover:underline">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{o.supplier.name}</p>
                  <p className="text-xs text-gray-400">{o.supplier.code}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{o._count.lines}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">
                  {o.currency} {Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
