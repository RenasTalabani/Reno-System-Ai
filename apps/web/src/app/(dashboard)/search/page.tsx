'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, FileText, User, Users, Ticket, BookOpen, Briefcase } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const ENTITY_ICONS: Record<string, any> = {
  knowledge_article: BookOpen,
  crm_contact: User,
  employee: Users,
  helpdesk_ticket: Ticket,
  document: FileText,
  project: Briefcase,
}

interface SearchResult {
  id: string
  entityType: string
  entityId: string
  title: string
  excerpt: string
  score: number
  url: string
  metadata: Record<string, unknown>
}

export default function SemanticSearchPage() {
  const { token } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setSearched(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/v1/search?q=${encodeURIComponent(query)}&limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setResults(data.data ?? [])
        setSearched(true)
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }, 350)
  }, [query, token])

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const g = r.entityType ?? 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(r)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Semantic Search</h1>
        <p className="text-sm text-muted-foreground">AI-powered search across all your business data</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search employees, contacts, articles, tickets…"
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-base"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1 opacity-60">Try a different search term or enable an AI provider for semantic matching</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const Icon = ENTITY_ICONS[type] ?? FileText
        return (
          <div key={type} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {type.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-muted-foreground/60">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map(r => (
                <Link key={r.id} href={r.url} className="block bg-card border border-border rounded-xl p-4 hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{r.title}</p>
                      {r.excerpt && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.excerpt}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/60 bg-muted rounded px-1.5 py-0.5">
                      {Math.round(r.score * 100)}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
