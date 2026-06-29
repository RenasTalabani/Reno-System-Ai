'use client'
import { useState, useEffect } from 'react'
import { Store, Download, Star, Check, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface App { id: string; name: string; slug: string; description: string | null; iconUrl: string | null; category: string; version: string; author: string; isFree: boolean; price: number; installs: number; rating: number; installedBy: { id: string; status: string }[] }

const CATEGORIES = ['All', 'CRM', 'HR', 'Finance', 'Analytics', 'Productivity', 'Integration', 'AI']

export default function AppStorePage() {
  const { token } = useAuthStore()
  const [apps, setApps] = useState<App[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (category !== 'All') q.set('category', category)
    const r = await fetch(`${API}/v1/app-store/apps?${q}`, { headers: h }).then(x => x.json())
    setApps(r.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token, category])

  const install = async (id: string) => { await fetch(`${API}/v1/app-store/apps/${id}/install`, { method: 'POST', headers: h }); load() }
  const uninstall = async (id: string) => { await fetch(`${API}/v1/app-store/apps/${id}/install`, { method: 'DELETE', headers: h }); load() }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Store className="w-5 h-5 text-indigo-500" /> App Marketplace</h1>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search apps..." className="w-full bg-muted/30 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${category === c ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <p className="col-span-3 text-center py-12 text-muted-foreground text-sm">Loading...</p>}
        {apps.map(app => {
          const installed = app.installedBy.some(i => i.status === 'active')
          return (
            <div key={app.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">{app.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{app.name}</p>
                  <p className="text-xs text-muted-foreground">{app.author} · {app.category}</p>
                  <div className="flex items-center gap-1 mt-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="text-xs text-muted-foreground">{Number(app.rating).toFixed(1)} · {app.installs.toLocaleString()} installs</span></div>
                </div>
              </div>
              {app.description && <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                <span className="text-xs font-medium text-foreground">{app.isFree ? 'Free' : `$${app.price}/mo`}</span>
                <button onClick={() => installed ? uninstall(app.id) : install(app.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${installed ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                  {installed ? <><Check className="w-3 h-3" /> Installed</> : <><Download className="w-3 h-3" /> Install</>}
                </button>
              </div>
            </div>
          )
        })}
        {!loading && apps.length === 0 && <p className="col-span-3 text-center py-12 text-muted-foreground text-sm">No apps found. Try a different search.</p>}
      </div>
    </div>
  )
}
