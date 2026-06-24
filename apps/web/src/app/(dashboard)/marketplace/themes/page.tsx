'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Palette, Star, Search, Check, Paintbrush } from 'lucide-react'

const THEME_CATS = ['All', 'general', 'corporate', 'minimal', 'colorful', 'dark', 'light']

export default function ThemesPage() {
  const [themes, setThemes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [applying, setApplying] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '20', offset: '0', ...(search && { search }), ...(category !== 'All' && { category }) })
    fetch(`/api/v1/marketplace/themes?${params}`)
      .then((r) => r.json())
      .then((d) => { setThemes(d.data ?? []); setTotal(d.meta?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, category])

  const installTheme = async (id: string) => {
    const r = await fetch(`/api/v1/marketplace/themes/${id}/install`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (r.ok) load()
  }

  const applyTheme = async (id: string) => {
    setApplying(id)
    const r = await fetch(`/api/v1/marketplace/themes/${id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (r.ok) load()
    setApplying(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Themes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} themes available</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search themes..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {THEME_CATS.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c === 'All' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /></div>
      ) : themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Palette className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No themes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {themes.map((t) => (
            <ThemeCard key={t.id} theme={t} onInstall={() => installTheme(t.id)} onApply={() => applyTheme(t.id)} applying={applying === t.id} />
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeCard({ theme, onInstall, onApply, applying }: { theme: any; onInstall: () => void; onApply: () => void; applying: boolean }) {
  const install_ = theme.tenantInstall
  const isActive = install_?.isActive

  return (
    <div className={`group relative rounded-xl border bg-white overflow-hidden transition-all hover:shadow-md ${isActive ? 'border-violet-400 ring-2 ring-violet-200' : 'border-gray-200 hover:border-violet-300'}`}>
      {/* Color preview */}
      <div className="h-24 w-full relative" style={{ background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)` }}>
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-violet-700 flex items-center gap-1"><Check className="h-3 w-3" /> Active</span>
          </div>
        )}
        {theme.darkModeSupport && <span className="absolute top-2 right-2 rounded-full bg-black/30 px-1.5 py-0.5 text-xs text-white">Dark</span>}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1 mb-1">
          <div className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: theme.primaryColor }} />
          <div className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: theme.secondaryColor }} />
          {theme.accentColor && <div className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: theme.accentColor }} />}
        </div>
        <p className="font-semibold text-sm text-gray-900 truncate">{theme.name}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Star className="h-3 w-3 fill-current" />
            {theme.rating.toFixed(1)}
          </div>
          <span className="text-xs text-gray-400">{theme.installCount} installs</span>
        </div>

        <div className="mt-2 flex gap-1">
          {!install_ ? (
            <button onClick={onInstall} className="flex-1 rounded-lg bg-violet-50 px-2 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
              Install
            </button>
          ) : isActive ? (
            <button className="flex-1 rounded-lg bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-700 flex items-center justify-center gap-1" disabled>
              <Check className="h-3 w-3" /> Active
            </button>
          ) : (
            <button onClick={onApply} disabled={applying} className="flex-1 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {applying ? 'Applying...' : 'Apply'}
            </button>
          )}
          <Link href={`/marketplace/themes/${theme.id}`} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Details
          </Link>
        </div>
      </div>
    </div>
  )
}
