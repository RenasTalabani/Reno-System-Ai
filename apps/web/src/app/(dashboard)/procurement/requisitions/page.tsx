'use client'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'

interface Requisition {
  id: string
  number: string
  title: string
  status: string
  priority: string
  requiredDate: string | null
  createdAt: string
  _count: { lines: number }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  ordered: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600',
}

export default function RequisitionsPage() {
  const [items, setItems] = useState<Requisition[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (status = statusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (status) params.set('status', status)
    fetch(`/api/v1/procurement/requisitions?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = async (id: string, action: string) => {
    await fetch(`/api/v1/procurement/requisitions/${id}/${action}`, { method: 'POST' })
    load()
  }

  const filtered = search
    ? items.filter(i => i.number.toLowerCase().includes(search.toLowerCase()) || i.title.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
          <p className="text-gray-500 text-sm mt-1">{total} requisitions total</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Requisition
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search requisitions..."
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
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="ordered">Ordered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">Number</th>
              <th className="px-4 py-3 font-medium text-gray-500">Title</th>
              <th className="px-4 py-3 font-medium text-gray-500">Priority</th>
              <th className="px-4 py-3 font-medium text-gray-500">Lines</th>
              <th className="px-4 py-3 font-medium text-gray-500">Required By</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No requisitions found</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[r.priority] ?? 'text-gray-500'}`}>
                    {r.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{r._count.lines}</td>
                <td className="px-4 py-3 text-gray-500">
                  {r.requiredDate ? new Date(r.requiredDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {r.status === 'draft' && (
                      <button
                        onClick={() => handleAction(r.id, 'submit')}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Submit
                      </button>
                    )}
                    {r.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleAction(r.id, 'approve')}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'reject')}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
