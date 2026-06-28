'use client'

import { useState, useRef } from 'react'
import { Search, Loader2, FileText, Users, BarChart2, CheckCircle, MessageSquare, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const TENANT_ID = 'default-tenant'

interface SearchResult {
  module: string; type: string; title: string; subtitle: string; id: string; url: string
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  HR: Users, Finance: BarChart2, 'AI Work': CheckCircle, Audit: FileText,
  Onboarding: CheckCircle, Workspace: MessageSquare,
}

const MODULE_COLORS: Record<string, string> = {
  HR: 'text-blue-600 bg-blue-50', Finance: 'text-emerald-600 bg-emerald-50',
  'AI Work': 'text-violet-600 bg-violet-50', Audit: 'text-amber-600 bg-amber-50',
  Onboarding: 'text-indigo-600 bg-indigo-50', Workspace: 'text-rose-600 bg-rose-50',
  People: 'text-blue-600 bg-blue-50', 'Recent Activity': 'text-gray-600 bg-gray-50',
  'AI Tasks': 'text-violet-600 bg-violet-50', 'Workspace Chat': 'text-rose-600 bg-rose-50',
}

export default function UniversalSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Record<string, SearchResult[]>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch('/api/v1/ai-workspace/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, query }),
    }).then(r => r.json()).catch(() => ({ results: {}, total: 0 }))
    setResults(res.results ?? {})
    setTotal(res.total ?? 0)
    setLoading(false)
    setSearched(true)
  }

  const modules = Object.entries(results)
  const IconFor = (module: string) => MODULE_ICONS[module] ?? FileText

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Search size={20} className="text-violet-600" />
        <h1 className="text-xl font-bold text-gray-900">Universal Search</h1>
      </div>
      <p className="text-sm text-gray-500">Search across all Reno modules from one place.</p>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search employees, invoices, tasks, documents..."
            className="flex-1 text-sm text-gray-800 focus:outline-none placeholder-gray-400 bg-transparent"
            autoFocus
          />
          {loading && <Loader2 size={14} className="text-violet-400 animate-spin shrink-0" />}
        </div>
        <button type="submit" disabled={!query.trim() || loading}
          className="px-5 py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition">
          Search
        </button>
      </form>

      {searched && (
        <div className="text-sm text-gray-500">
          {total === 0 ? 'No results found.' : `${total} result${total === 1 ? '' : 's'} across ${modules.length} module${modules.length === 1 ? '' : 's'}`}
        </div>
      )}

      {modules.map(([module, items]) => {
        const Icon = IconFor(module)
        const colorClass = MODULE_COLORS[module] ?? 'text-gray-600 bg-gray-50'
        return (
          <div key={module} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-100`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
                <Icon size={12} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{module}</span>
              <span className="ml-auto text-xs text-gray-400">{items.length} result{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.subtitle}</div>
                  </div>
                  <Link href={item.url}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-violet-600 transition rounded-lg hover:bg-violet-50">
                    <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {searched && total === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No results for "{query}"</p>
          <p className="text-xs mt-1 text-gray-400">Try different keywords or check a specific module directly</p>
        </div>
      )}
    </div>
  )
}
