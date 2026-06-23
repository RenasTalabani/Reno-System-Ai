'use client'

import { useEffect, useState } from 'react'
import { Zap, Download, Search, Clock, Hand, Globe, Brain } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  tags: string[]
  icon: string | null
  useCase: string | null
  triggerType: string
  isSystem: boolean
  usageCount: number
}

const TRIGGER_ICONS: Record<string, any> = { manual: Hand, scheduled: Clock, event: Zap, webhook: Globe }
const TRIGGER_COLORS: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-600', scheduled: 'bg-blue-100 text-blue-700',
  event: 'bg-violet-100 text-violet-700', webhook: 'bg-green-100 text-green-700',
}
const CATEGORY_COLORS: Record<string, string> = {
  hr: 'bg-purple-100 text-purple-700', sales: 'bg-blue-100 text-blue-700',
  finance: 'bg-green-100 text-green-700', inventory: 'bg-yellow-100 text-yellow-700',
  procurement: 'bg-orange-100 text-orange-700', manufacturing: 'bg-red-100 text-red-700',
  crm: 'bg-cyan-100 text-cyan-700', 'cross-module': 'bg-indigo-100 text-indigo-700',
  analytics: 'bg-teal-100 text-teal-700', brain: 'bg-pink-100 text-pink-700',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState<string | null>(null)

  useEffect(() => { load() }, [categoryFilter])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryFilter) params.set('category', categoryFilter)
    const r = await fetch(`/api/v1/automation/templates?${params}`)
    const d = await r.json()
    setTemplates(d.data ?? [])
    setLoading(false)
  }

  async function install(id: string, name: string) {
    setInstalling(id)
    const r = await fetch(`/api/v1/automation/templates/${id}/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (r.ok) setInstalled(id)
    setInstalling(null)
    load()
  }

  const categories = [...new Set(templates.map(t => t.category))].sort()
  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workflow Templates</h1>
        <p className="text-gray-500 text-sm">Ready-to-use automation blueprints — install and customize</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400 w-48" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400 bg-white">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} templates</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(tpl => {
            const TriggerIcon = TRIGGER_ICONS[tpl.triggerType] ?? Zap
            return (
              <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                    <TriggerIcon size={16} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 leading-tight">{tpl.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TRIGGER_COLORS[tpl.triggerType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {tpl.triggerType}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[tpl.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {tpl.category}
                      </span>
                      {tpl.isSystem && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">system</span>}
                    </div>
                  </div>
                </div>

                {tpl.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2 flex-1">{tpl.description}</p>
                )}
                {tpl.useCase && (
                  <p className="text-xs text-gray-400 italic mb-3 line-clamp-2">{tpl.useCase}</p>
                )}

                {tpl.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tpl.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                  <span className="text-xs text-gray-400">{tpl.usageCount} installs</span>
                  <button
                    onClick={() => install(tpl.id, tpl.name)}
                    disabled={installing === tpl.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      installed === tpl.id
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    } disabled:opacity-50`}>
                    <Download size={11} />
                    {installed === tpl.id ? 'Installed!' : installing === tpl.id ? 'Installing...' : 'Install'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
