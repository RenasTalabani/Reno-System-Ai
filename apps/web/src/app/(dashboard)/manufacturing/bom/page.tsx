'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, ChevronRight } from 'lucide-react'

interface Bom {
  id: string
  code: string
  name: string
  version: string
  type: string
  isDefault: boolean
  quantity: number
  finishedProduct: { name: string; code: string }
  routing: { name: string } | null
  _count: { lines: number }
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  production: 'bg-blue-100 text-blue-700',
  phantom: 'bg-gray-100 text-gray-600',
  subcontract: 'bg-purple-100 text-purple-700',
  kit: 'bg-orange-100 text-orange-700',
}

export default function BomPage() {
  const [items, setItems] = useState<Bom[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/v1/manufacturing/bom?limit=100')
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? items.filter(i => i.code.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()) || i.finishedProduct.name.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
          <p className="text-gray-500 text-sm mt-1">{total} BOMs total</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New BOM
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search BOMs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">Code / Version</th>
              <th className="px-4 py-3 font-medium text-gray-500">Finished Product</th>
              <th className="px-4 py-3 font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 font-medium text-gray-500">Qty</th>
              <th className="px-4 py-3 font-medium text-gray-500">Components</th>
              <th className="px-4 py-3 font-medium text-gray-500">Routing</th>
              <th className="px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No BOMs found</td></tr>
            ) : filtered.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3">
                  <p className="font-mono text-sm text-gray-900">{b.code}</p>
                  <p className="text-xs text-gray-400">v{b.version}{b.isDefault && <span className="ml-1 text-blue-500">· default</span>}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{b.finishedProduct.name}</p>
                  <p className="text-xs text-gray-400">{b.finishedProduct.code}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[b.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {b.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{Number(b.quantity)}</td>
                <td className="px-4 py-3 text-gray-600">{b._count.lines}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{b.routing?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <ChevronRight size={14} className="text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
