'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Star, AlertTriangle } from 'lucide-react'

interface Supplier {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  country: string | null
  status: string
  overallScore: number | null
  aiRiskScore: number | null
  aiPerformanceScore: number | null
  category: { name: string } | null
  _count: { orders: number; evaluations: number }
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  blacklisted: 'bg-red-100 text-red-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (s = search, status = statusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (s) params.set('search', s)
    if (status) params.set('status', status)
    fetch(`/api/v1/procurement/suppliers?${params}`)
      .then(r => r.json())
      .then(d => { setSuppliers(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load() }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm mt-1">{total} suppliers total</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
        <select
          aria-label="Filter by status"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); load(search, e.target.value) }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">Code</th>
              <th className="px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 font-medium text-gray-500">Location</th>
              <th className="px-4 py-3 font-medium text-gray-500">Score</th>
              <th className="px-4 py-3 font-medium text-gray-500">Orders</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No suppliers found</td></tr>
            ) : suppliers.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.code}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{s.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-4 py-3">
                  {s.overallScore != null ? (
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{Number(s.overallScore).toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                  {s.aiRiskScore != null && Number(s.aiRiskScore) > 70 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertTriangle size={10} className="text-red-500" />
                      <span className="text-xs text-red-500">High risk</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{s._count.orders}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
