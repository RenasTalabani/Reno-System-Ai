'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Puzzle, Star, Search, Filter, ChevronDown } from 'lucide-react'

const CATEGORIES = ['All', 'crm', 'hr', 'accounting', 'communication', 'analytics', 'ecommerce', 'logistics', 'productivity', 'security', 'integration']

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [pricing, setPricing] = useState('all')
  const [sort, setSort] = useState('featured')
  const [offset, setOffset] = useState(0)
  const LIMIT = 12

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(offset),
      ...(search && { search }),
      ...(category !== 'All' && { category }),
      ...(pricing === 'free' && { pricingModel: 'free' }),
    })
    fetch(`/api/v1/marketplace/plugins?${params}`)
      .then((r) => r.json())
      .then((d) => { setPlugins(d.data ?? []); setTotal(d.meta?.total ?? 0) })
      .finally(() => setLoading(false))
  }, [search, category, pricing, offset])

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plugins</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} plugins available</p>
        </div>
        <Link href="/marketplace/developer" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Become a Developer
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0) }}
            placeholder="Search plugins..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setOffset(0) }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={pricing} onChange={(e) => { setPricing(e.target.value); setOffset(0) }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
          <option value="all">All Pricing</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => { setCategory(c); setOffset(0) }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c === 'All' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      ) : plugins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Puzzle className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No plugins found</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {plugins.map((p) => <PluginCard key={p.id} plugin={p} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
          <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setOffset(offset + LIMIT)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
        </div>
      )}
    </div>
  )
}

function PluginCard({ plugin }: { plugin: any }) {
  const isInstalled = !!plugin.tenantInstall
  const priceLabel = plugin.pricingModel === 'free' ? 'Free' : `$${plugin.price}`

  return (
    <Link href={`/marketplace/plugins/${plugin.id}`} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:border-violet-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
          {plugin.iconUrl ? <img src={plugin.iconUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <Puzzle className="h-6 w-6 text-violet-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900 group-hover:text-violet-700 transition-colors truncate">{plugin.name}</p>
            {plugin.isOfficial && <span className="flex-shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">Official</span>}
          </div>
          <p className="text-xs text-gray-500 capitalize mt-0.5">{plugin.category}</p>
        </div>
      </div>
      <p className="text-xs text-gray-600 line-clamp-2 flex-1">{plugin.shortDescription}</p>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Star className="h-3 w-3 fill-current" />
            <span>{plugin.rating.toFixed(1)}</span>
            <span className="text-gray-400">({plugin.ratingCount})</span>
          </div>
          <span className="text-xs text-gray-400">{plugin.installCount.toLocaleString()} installs</span>
        </div>
        <div className="flex items-center gap-2">
          {isInstalled && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Installed</span>}
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{priceLabel}</span>
        </div>
      </div>
    </Link>
  )
}
