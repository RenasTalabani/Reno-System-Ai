'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Plus, Search, Building2, Users, Package, FolderKanban, DollarSign, AlertTriangle, X } from 'lucide-react'

type MemoryType = 'company' | 'customer' | 'supplier' | 'employee' | 'project' | 'financial' | 'incident' | 'decision'

interface BusinessMemory {
  id: string
  memoryType: MemoryType
  entityName: string | null
  title: string
  content: string
  confidence: number
  importance: number
  tags: string[]
  learnedAt: string
}

const TYPE_CONFIG: Record<MemoryType, { label: string; icon: typeof Brain; color: string }> = {
  company: { label: 'Company', icon: Building2, color: 'text-blue-500 bg-blue-500/10' },
  customer: { label: 'Customer', icon: Users, color: 'text-green-500 bg-green-500/10' },
  supplier: { label: 'Supplier', icon: Package, color: 'text-purple-500 bg-purple-500/10' },
  employee: { label: 'Employee', icon: Users, color: 'text-cyan-500 bg-cyan-500/10' },
  project: { label: 'Project', icon: FolderKanban, color: 'text-amber-500 bg-amber-500/10' },
  financial: { label: 'Financial', icon: DollarSign, color: 'text-emerald-500 bg-emerald-500/10' },
  incident: { label: 'Incident', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
  decision: { label: 'Decision', icon: Brain, color: 'text-pink-500 bg-pink-500/10' },
}

const ALL_TYPES = Object.keys(TYPE_CONFIG) as MemoryType[]

export default function MemoryPage() {
  const [memories, setMemories] = useState<BusinessMemory[]>([])
  const [filter, setFilter] = useState<MemoryType | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ memoryType: 'company' as MemoryType, title: '', content: '', entityName: '', confidence: 0.8, importance: 0.5 })

  const fetchMemories = async () => {
    try {
      const params = new URLSearchParams()
      if (filter) params.set('type', filter)
      const res = await fetch(`/api/v1/brain/memory/business?${params}`)
      if (res.ok) {
        const data = await res.json() as { memories: BusinessMemory[] }
        setMemories(data.memories)
      }
    } finally {
      setLoading(false)
    }
  }

  const createMemory = async () => {
    try {
      const res = await fetch('/api/v1/brain/memory/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const m = await res.json() as BusinessMemory
        setMemories((prev) => [m, ...prev])
        setShowCreate(false)
        setForm({ memoryType: 'company', title: '', content: '', entityName: '', confidence: 0.8, importance: 0.5 })
      }
    } catch { /* no-op */ }
  }

  const deleteMemory = async (id: string) => {
    await fetch(`/api/v1/brain/memory/business/${id}`, { method: 'DELETE' })
    setMemories((prev) => prev.filter((m) => m.id !== id))
  }

  useEffect(() => { void fetchMemories() }, [filter])

  const filtered = memories.filter((m) =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Business Memory</h1>
            <p className="text-sm text-muted-foreground">AI knowledge about your business, customers, and operations</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Memory
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!filter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
        >
          All
        </button>
        {ALL_TYPES.map((type) => {
          const cfg = TYPE_CONFIG[type]
          const Icon = cfg.icon
          return (
            <button
              type="button"
              key={type}
              onClick={() => setFilter(type === filter ? null : type)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search memories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Memory grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <Brain className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No business memories yet.</p>
          <p className="text-sm text-muted-foreground">AI will accumulate memories as it learns from your data and interactions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((memory) => {
            const cfg = TYPE_CONFIG[memory.memoryType]
            const Icon = cfg.icon
            return (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => void deleteMemory(memory.id)}
                  className="absolute top-3 right-3 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete memory"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{cfg.label}</span>
                    {memory.entityName && (
                      <span className="text-xs text-muted-foreground ml-1">· {memory.entityName}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{memory.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-3">{memory.content}</p>
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[10px] text-muted-foreground">Confidence</span>
                      <span className="text-[10px] font-medium text-foreground">{Math.round(memory.confidence * 100)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${memory.confidence * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl z-10">
            <h3 className="font-semibold text-foreground mb-4">Add Business Memory</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="mem-type">Memory Type</label>
                <select
                  id="mem-type"
                  value={form.memoryType}
                  onChange={(e) => setForm((f) => ({ ...f, memoryType: e.target.value as MemoryType }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="mem-entity">Entity Name (optional)</label>
                <input
                  id="mem-entity"
                  type="text"
                  value={form.entityName}
                  onChange={(e) => setForm((f) => ({ ...f, entityName: e.target.value }))}
                  placeholder="Acme Corp, John Smith…"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="mem-title">Title</label>
                <input
                  id="mem-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="mem-content">Memory Content</label>
                <textarea
                  id="mem-content"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Cancel</button>
                <button type="button" onClick={() => void createMemory()} disabled={!form.title || !form.content} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
