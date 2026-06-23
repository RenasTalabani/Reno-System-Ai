'use client'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'

interface MfgOrder {
  id: string
  number: string
  status: string
  finishedProduct: { name: string; code: string }
  bom: { code: string; name: string } | null
  plannedQty: number
  producedQty: number
  scrapQty: number
  scheduledStart: string | null
  scheduledEnd: string | null
  createdAt: string
  _count: { components: number; operations: number }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  released: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function ManufacturingOrdersPage() {
  const [orders, setOrders] = useState<MfgOrder[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (status = statusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (status) params.set('status', status)
    fetch(`/api/v1/manufacturing/orders?${params}`)
      .then(r => r.json())
      .then(d => { setOrders(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = search
    ? orders.filter(o => o.number.toLowerCase().includes(search.toLowerCase()) || o.finishedProduct.name.toLowerCase().includes(search.toLowerCase()))
    : orders

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manufacturing Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{total} orders total</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Order
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by MO number or product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); load(e.target.value) }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="released">Released</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">MO Number</th>
              <th className="px-4 py-3 font-medium text-gray-500">Product</th>
              <th className="px-4 py-3 font-medium text-gray-500">BOM</th>
              <th className="px-4 py-3 font-medium text-gray-500">Progress</th>
              <th className="px-4 py-3 font-medium text-gray-500">Scheduled End</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
            ) : filtered.map(o => {
              const progress = Number(o.plannedQty) > 0 ? (Number(o.producedQty) / Number(o.plannedQty)) * 100 : 0
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/manufacturing/orders/${o.id}`} className="font-mono text-sm text-blue-600 hover:underline">
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{o.finishedProduct.name}</p>
                    <p className="text-xs text-gray-400">{o.finishedProduct.code}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.bom?.code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{Number(o.producedQty)}/{Number(o.plannedQty)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {o.scheduledEnd ? new Date(o.scheduledEnd).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
