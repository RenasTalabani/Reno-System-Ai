'use client'
import { useState, useEffect } from 'react'
import { BookOpen, Eye, ThumbsUp, Search, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Article { id: string; title: string; status: string; views: number; helpful: number; notHelpful: number; category: { name: string } | null; createdAt: string }
interface Summary { categories: number; publishedArticles: number; totalViews: number }

const statusColor = (s: string) => ({ published: 'text-emerald-400', draft: 'text-amber-400', archived: 'text-slate-400' }[s] ?? 'text-slate-400')

export default function KnowledgeBasePage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const q = new URLSearchParams({ status: 'published' })
    if (search) q.set('search', search)
    const [s, a] = await Promise.all([
      fetch(`${API}/v1/knowledge-base/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/knowledge-base/articles?${q}`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setArticles(a.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500" /> Knowledge Base</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Article</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Categories', value: summary.categories }, { label: 'Published Articles', value: summary.publishedArticles }, { label: 'Total Views', value: summary.totalViews.toLocaleString() }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search articles..." className="w-full bg-muted/30 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="space-y-2">
        {articles.map(a => (
          <div key={a.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                {a.category && <p className="text-xs text-muted-foreground mt-0.5">{a.category.name}</p>}
              </div>
              <span className={`text-xs font-medium capitalize shrink-0 ${statusColor(a.status)}`}>{a.status}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {a.views}</span>
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-emerald-400" /> {a.helpful}</span>
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-red-400 rotate-180" /> {a.notHelpful}</span>
            </div>
          </div>
        ))}
        {!loading && articles.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No articles found.</p>}
      </div>
    </div>
  )
}
