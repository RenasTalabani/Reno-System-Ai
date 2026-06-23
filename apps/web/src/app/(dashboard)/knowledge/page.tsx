'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen, Search, Plus, Eye, ThumbsUp, ChevronRight,
  Tag, Clock, BarChart3, CheckCircle2, FileText, FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KbArticle {
  id: string
  title: string
  slug: string
  excerpt?: string
  status: string
  tags: string[]
  viewCount: number
  helpfulCount: number
  publishedAt?: string
  updatedAt: string
  category?: { id: string; name: string; slug: string; color?: string }
}

interface KbCategory {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  _count: { articles: number }
  children?: KbCategory[]
}

interface DashboardData {
  stats: {
    totalArticles: number
    publishedArticles: number
    draftArticles: number
    totalCategories: number
    totalViews: number
  }
  topArticles: { id: string; title: string; slug: string; viewCount: number; helpfulCount: number; category?: { name: string } }[]
  recentArticles: { id: string; title: string; slug: string; status: string; updatedAt: string; category?: { name: string } }[]
}

const CATEGORY_COLORS = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-purple-100 text-purple-700 border-purple-200',
]

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', {
      'bg-green-100 text-green-700': status === 'published',
      'bg-yellow-100 text-yellow-700': status === 'draft',
      'bg-gray-100 text-gray-500': status === 'archived',
    })}>
      {status}
    </span>
  )
}

export default function KnowledgePage() {
  const [search, setSearch] = useState('')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [categories, setCategories] = useState<KbCategory[]>([])
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'published' | 'draft'>('all')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch('/api/v1/kb/dashboard', { headers }).then(r => r.json()),
      fetch('/api/v1/kb/categories', { headers }).then(r => r.json()),
      fetch('/api/v1/kb/articles', { headers }).then(r => r.json()),
    ]).then(([dash, cats, arts]) => {
      if (dash.success) setDashboard(dash.data)
      if (cats.success) setCategories(cats.data)
      if (arts.success) setArticles(arts.data)
    }).finally(() => setLoading(false))
  }, [])

  const filteredArticles = articles.filter(a => {
    const matchesTab = tab === 'all' || a.status === tab
    const matchesSearch = !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.excerpt ?? '').toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  const stats = [
    { label: 'Total Articles', value: dashboard?.stats.totalArticles ?? 0, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Published', value: dashboard?.stats.publishedArticles ?? 0, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
    { label: 'Categories', value: dashboard?.stats.totalCategories ?? 0, icon: FolderOpen, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Views', value: dashboard?.stats.totalViews ?? 0, icon: Eye, color: 'bg-purple-50 text-purple-600' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">Internal wiki, policies, and company knowledge</p>
        </div>
        <Link
          href="/knowledge/articles/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Article
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', s.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Categories Grid */}
      {categories.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                className={cn('border rounded-xl p-3 cursor-pointer hover:shadow-md transition-all', CATEGORY_COLORS[i % CATEGORY_COLORS.length])}
              >
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-semibold">{cat.name}</span>
                </div>
                <p className="text-xs opacity-70">{cat._count.articles} articles</p>
              </div>
            ))}
            <button className="border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-500 flex flex-col items-center gap-1">
              <Plus className="w-4 h-4" />
              <span className="text-xs">Category</span>
            </button>
          </div>
        </section>
      )}

      {/* Top Articles (sidebar) + Article List */}
      <div className="grid grid-cols-3 gap-6">
        {/* Article List */}
        <div className="col-span-2 space-y-4">
          {/* Search + Tabs */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-1 text-xs">
              {(['all', 'published', 'draft'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn('px-3 py-1.5 rounded capitalize', tab === t ? 'bg-white shadow-sm font-medium' : 'text-gray-500')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Articles */}
          {!filteredArticles.length ? (
            <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No articles found</p>
              <Link href="/knowledge/articles/new" className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg">
                Write your first article
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/knowledge/articles/${article.id}`}
                  className="block bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {article.category && (
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {article.category.name}
                          </span>
                        )}
                        <StatusBadge status={article.status} />
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.excerpt}</p>
                      )}
                      {article.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {article.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {article.viewCount}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {article.helpfulCount}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{new Date(article.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Top Articles + Quick Links */}
        <div className="space-y-4">
          {dashboard?.topArticles && dashboard.topArticles.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Most Viewed
              </h3>
              <div className="space-y-3">
                {dashboard.topArticles.map((art, i) => (
                  <div key={art.id} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-indigo-400 w-4 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/knowledge/articles/${art.id}`} className="text-sm text-gray-800 hover:text-indigo-600 font-medium line-clamp-2 block">
                        {art.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {art.viewCount}</span>
                        <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" /> {art.helpfulCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Recent Updates
            </h3>
            {!dashboard?.recentArticles.length ? (
              <p className="text-xs text-gray-400">No recent articles</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentArticles.slice(0, 5).map(art => (
                  <div key={art.id} className="flex items-center justify-between">
                    <Link href={`/knowledge/articles/${art.id}`} className="text-xs text-gray-700 hover:text-indigo-600 line-clamp-1 flex-1">
                      {art.title}
                    </Link>
                    <StatusBadge status={art.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">AI Knowledge Assistant</h3>
            <p className="text-xs text-gray-600 mb-3">Ask Reno Brain to search and summarize articles for you.</p>
            <Link href="/brain/chat?agent=reno-analyst" className="block w-full text-center px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors">
              Ask Reno Brain
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
