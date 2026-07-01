'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'
type Tab = 'dashboard' | 'explorer' | 'entities' | 'relations' | 'facts' | 'query' | 'timeline'

interface Entity { id: string; type: string; name: string; importance: number; tags: string[]; summary: string | null; _count?: { outgoing: number; incoming: number } }
interface Relation { id: string; fromId: string; toId: string; type: string; label: string | null; weight: number; from?: { name: string; type: string }; to?: { name: string; type: string } }
interface Fact { id: string; content: string; importance: string; source: string | null; entityIds: string[]; createdAt: string }

const ENTITY_COLORS: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800',
  employee: 'bg-green-100 text-green-800',
  project: 'bg-purple-100 text-purple-800',
  goal: 'bg-yellow-100 text-yellow-800',
  decision: 'bg-red-100 text-red-800',
  meeting: 'bg-pink-100 text-pink-800',
  contract: 'bg-orange-100 text-orange-800',
  initiative: 'bg-indigo-100 text-indigo-800',
  signal: 'bg-gray-100 text-gray-800',
  product: 'bg-teal-100 text-teal-800',
  supplier: 'bg-lime-100 text-lime-800',
  event: 'bg-cyan-100 text-cyan-800',
  document: 'bg-slate-100 text-slate-800',
  order: 'bg-amber-100 text-amber-800',
  department: 'bg-violet-100 text-violet-800',
  integration: 'bg-emerald-100 text-emerald-800',
}

const ENTITY_ICONS: Record<string, string> = {
  customer: '👤', employee: '👨‍💼', project: '📋', goal: '🎯',
  decision: '⚖️', meeting: '🤝', contract: '📄', initiative: '🚀',
  signal: '📡', product: '📦', supplier: '🏭', event: '📅',
  document: '📃', order: '🛒', department: '🏢', integration: '🔌',
}

const IMPORTANCE_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

function useApi(path: string) {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [path])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

async function apiPost(path: string, body: unknown = {}) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return res.json()
}

async function apiDelete(path: string) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return res.json()
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, loading, reload } = useApi('/knowledge-graph/dashboard')
  const d = data as { totalEntities: number; totalRelations: number; totalFacts: number; totalQueries: number; byType: Record<string, number>; recentEntities: Entity[]; recentFacts: Fact[] } | null
  const [indexing, setIndexing] = useState(false)

  const autoIndex = async () => {
    setIndexing(true)
    await apiPost('/knowledge-graph/auto-index')
    await reload()
    setIndexing(false)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading graph dashboard...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Entities', value: d?.totalEntities ?? 0, color: 'text-blue-600', icon: '🔵' },
          { label: 'Relations', value: d?.totalRelations ?? 0, color: 'text-purple-600', icon: '🔗' },
          { label: 'Facts', value: d?.totalFacts ?? 0, color: 'text-green-600', icon: '💡' },
          { label: 'Queries', value: d?.totalQueries ?? 0, color: 'text-orange-600', icon: '🔍' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {d?.byType && Object.keys(d.byType).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Entities by Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(d.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${ENTITY_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}>
                <span>{ENTITY_ICONS[type] ?? '●'}</span>
                <span className="capitalize">{type}</span>
                <span className="font-bold">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={autoIndex} disabled={indexing} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {indexing ? 'Indexing...' : '⚡ Auto-Index from Reno Modules'}
        </button>
      </div>

      {d && d.recentEntities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Entities</h3>
          <div className="space-y-2">
            {d.recentEntities.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="text-lg">{ENTITY_ICONS[e.type] ?? '●'}</span>
                <span className="text-sm font-medium text-gray-800 flex-1">{e.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${ENTITY_COLORS[e.type] ?? 'bg-gray-100 text-gray-600'}`}>{e.type}</span>
                <span className="text-xs text-gray-400">{e.importance.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d && d.recentFacts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Facts</h3>
          <div className="space-y-2">
            {d.recentFacts.map(f => (
              <div key={f.id} className="flex items-start gap-3 text-sm">
                <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${IMPORTANCE_COLORS[f.importance] ?? 'bg-gray-100 text-gray-600'}`}>{f.importance}</span>
                <span className="text-gray-700">{f.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Graph Explorer ─────────────────────────────────────────────────────────────

function ExplorerTab() {
  const { data: entData, loading } = useApi('/knowledge-graph/entities')
  const entities = (entData ?? []) as Entity[]
  const [selected, setSelected] = useState<Entity | null>(null)
  const [traversal, setTraversal] = useState<{ nodes: Entity[]; edges: Relation[] } | null>(null)
  const [traversing, setTraversing] = useState(false)

  const explore = async (entity: Entity) => {
    setSelected(entity)
    setTraversing(true)
    const r = await fetch(`${API}?path=${encodeURIComponent(`/knowledge-graph/entities/${entity.id}/traverse?depth=2`)}`)
    const json = await r.json()
    if (json.success) setTraversal(json.data)
    setTraversing(false)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading graph explorer...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Select Entity to Explore</h3>
        {entities.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No entities yet. Go to Entities tab to create some.</div>
        ) : (
          entities.map(e => (
            <button key={e.id} onClick={() => explore(e)} className={`w-full text-left p-3 rounded-xl border transition-colors ${selected?.id === e.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}>
              <div className="flex items-center gap-2">
                <span>{ENTITY_ICONS[e.type] ?? '●'}</span>
                <span className="font-medium text-gray-800 flex-1">{e.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${ENTITY_COLORS[e.type] ?? 'bg-gray-100 text-gray-600'}`}>{e.type}</span>
                <span className="text-xs text-gray-400">{(e._count?.outgoing ?? 0) + (e._count?.incoming ?? 0)} links</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="space-y-3">
        {selected && (
          <>
            <h3 className="font-semibold text-gray-700">
              Graph: {ENTITY_ICONS[selected.type]} {selected.name} <span className="text-gray-400">(depth 2)</span>
            </h3>
            {traversing ? (
              <div className="text-center py-10 text-gray-400">Traversing graph...</div>
            ) : traversal ? (
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="text-xs text-gray-500 mb-2">{traversal.nodes.length} nodes · {traversal.edges.length} edges</div>
                  <div className="space-y-2">
                    {traversal.nodes.map(n => (
                      <div key={n.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${n.id === selected.id ? 'bg-indigo-100 border border-indigo-300' : 'bg-gray-50'}`}>
                        <span>{ENTITY_ICONS[n.type] ?? '●'}</span>
                        <span className="text-sm font-medium text-gray-800 flex-1">{n.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${ENTITY_COLORS[n.type] ?? 'bg-gray-100 text-gray-600'}`}>{n.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {traversal.edges.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="text-xs text-gray-500 mb-2">Relationships</div>
                    <div className="space-y-1.5">
                      {traversal.edges.map((e, i) => {
                        const fromNode = traversal.nodes.find(n => n.id === e.fromId)
                        const toNode = traversal.nodes.find(n => n.id === e.toId)
                        return (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="font-medium truncate max-w-[120px]">{fromNode?.name ?? e.fromId.slice(0, 8)}</span>
                            <span className="text-indigo-500 shrink-0">—{e.label ?? e.type}→</span>
                            <span className="font-medium truncate max-w-[120px]">{toNode?.name ?? e.toId.slice(0, 8)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
        {!selected && (
          <div className="text-center py-20 text-gray-400 text-sm">Click an entity on the left to explore its graph neighbourhood</div>
        )}
      </div>
    </div>
  )
}

// ── Entities Tab ──────────────────────────────────────────────────────────────

function EntitiesTab() {
  const { data, loading, reload } = useApi('/knowledge-graph/entities')
  const entities = (data ?? []) as Entity[]
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'customer', importance: '50', summary: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    await apiPost('/knowledge-graph/entities', { ...form, importance: Number(form.importance), tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] })
    await reload()
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', type: 'customer', importance: '50', summary: '', tags: '' })
  }

  const del = async (id: string) => {
    setDeleting(id)
    await apiDelete(`/knowledge-graph/entities/${id}`)
    await reload()
    setDeleting(null)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading entities...</div>

  const TYPES = ['customer', 'employee', 'project', 'goal', 'decision', 'meeting', 'contract', 'supplier', 'order', 'product', 'document', 'initiative', 'signal', 'event', 'department', 'integration']

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{entities.length} entities in the knowledge graph</p>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Entity</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">New Knowledge Graph Entity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Acme Corp, Sara Johnson, Project Alpha" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {TYPES.map(t => <option key={t} value={t} className="capitalize">{ENTITY_ICONS[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Importance (0-100)</label>
              <input type="number" min={0} max={100} value={form.importance} onChange={e => setForm(f => ({ ...f, importance: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Summary (optional)</label>
              <input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Brief description" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="vip, priority, engineering" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={!form.name || saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Entity'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {entities.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No entities yet. Create entities manually or use Auto-Index from the Dashboard tab.</div>
      ) : (
        <div className="space-y-2">
          {entities.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <span className="text-2xl shrink-0">{ENTITY_ICONS[e.type] ?? '●'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 truncate">{e.name}</span>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${ENTITY_COLORS[e.type] ?? 'bg-gray-100 text-gray-600'}`}>{e.type}</span>
                </div>
                {e.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {e.tags.slice(0, 4).map(t => <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium text-gray-600">{e.importance.toFixed(0)}</div>
                <div className="text-xs text-gray-400">importance</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium text-gray-600">{(e._count?.outgoing ?? 0) + (e._count?.incoming ?? 0)}</div>
                <div className="text-xs text-gray-400">links</div>
              </div>
              <button onClick={() => del(e.id)} disabled={deleting === e.id} className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50">
                {deleting === e.id ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Relations Tab ─────────────────────────────────────────────────────────────

function RelationsTab() {
  const { data: entData } = useApi('/knowledge-graph/entities')
  const entities = (entData ?? []) as Entity[]
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [relType, setRelType] = useState('related_to')
  const [label, setLabel] = useState('')
  const [inferred, setInferred] = useState<{ type: string; label: string; weight: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)

  const REL_TYPES = ['participates_in', 'owns', 'involves', 'causes', 'impacts', 'references', 'generates', 'affects', 'related_to', 'belongs_to', 'depends_on', 'works_with', 'created_by', 'resolved_by']

  const infer = async () => {
    if (!fromId || !toId) return
    const r = await apiPost('/knowledge-graph/relations/infer', { entityAId: fromId, entityBId: toId })
    if (r.success && r.data.suggestion) {
      setInferred(r.data.suggestion)
      setRelType(r.data.suggestion.type)
      setLabel(r.data.suggestion.label)
    }
  }

  const save = async () => {
    if (!fromId || !toId || !relType) return
    setSaving(true)
    await apiPost('/knowledge-graph/relations', { fromId, toId, type: relType, label: label || undefined })
    setSaving(false)
    setDone(d => d + 1)
    setFromId(''); setToId(''); setLabel(''); setInferred(null)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">Create Relationship</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Entity</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">— select —</option>
              {entities.map(e => <option key={e.id} value={e.id}>{ENTITY_ICONS[e.type]} {e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Entity</label>
            <select value={toId} onChange={e => setToId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">— select —</option>
              {entities.filter(e => e.id !== fromId).map(e => <option key={e.id} value={e.id}>{ENTITY_ICONS[e.type]} {e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Relation Type</label>
            <select value={relType} onChange={e => setRelType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {REL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Label (optional)</label>
            <input value={label} onChange={e => setLabel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. works on, approved" />
          </div>
        </div>

        {inferred && (
          <div className="mt-3 bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
            ✨ AI suggests: <strong>{inferred.type.replace(/_/g, ' ')}</strong> ("{inferred.label}") with weight {inferred.weight}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={infer} disabled={!fromId || !toId} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50">✨ AI Infer Type</button>
          <button onClick={save} disabled={!fromId || !toId || !relType || saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Relation'}
          </button>
        </div>
        {done > 0 && <p className="text-xs text-green-600 mt-2">{done} relation(s) created this session.</p>}
      </div>
    </div>
  )
}

// ── Facts Tab ─────────────────────────────────────────────────────────────────

function FactsTab() {
  const { data: factsData, loading, reload } = useApi('/knowledge-graph/facts')
  const { data: entData } = useApi('/knowledge-graph/entities')
  const facts = (factsData ?? []) as Fact[]
  const entities = (entData ?? []) as Entity[]
  const [form, setForm] = useState({ content: '', importance: 'medium', entityIds: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const save = async () => {
    if (!form.content) return
    setSaving(true)
    await apiPost('/knowledge-graph/facts', form)
    await reload()
    setSaving(false)
    setForm({ content: '', importance: 'medium', entityIds: [] })
  }

  const del = async (id: string) => {
    setDeleting(id)
    await apiDelete(`/knowledge-graph/facts/${id}`)
    await reload()
    setDeleting(null)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading facts...</div>

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">Add Semantic Fact</h3>
        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Enter a fact about the business, a decision, a relationship, or any relevant knowledge..." />
        <div className="flex gap-3 mt-3">
          <select value={form.importance} onChange={e => setForm(f => ({ ...f, importance: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {['low', 'medium', 'high', 'critical'].map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select multiple onChange={e => setForm(f => ({ ...f, entityIds: [...e.target.selectedOptions].map(o => o.value) }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 h-16">
            {entities.map(e => <option key={e.id} value={e.id}>{ENTITY_ICONS[e.type]} {e.name}</option>)}
          </select>
          <button onClick={save} disabled={!form.content || saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving...' : '+ Add Fact'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple entities to link this fact to.</p>
      </div>

      {facts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No facts yet. Add semantic facts to build the knowledge memory.</div>
      ) : (
        <div className="space-y-3">
          {facts.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{f.content}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded ${IMPORTANCE_COLORS[f.importance] ?? 'bg-gray-100 text-gray-600'}`}>{f.importance}</span>
                    {f.source && <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">{f.source}</span>}
                    <span className="text-xs text-gray-400">{f.entityIds.length} linked entities</span>
                    <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => del(f.id)} disabled={deleting === f.id} className="text-xs text-red-400 hover:text-red-600 shrink-0">
                  {deleting === f.id ? '...' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Query Tab ─────────────────────────────────────────────────────────────────

function QueryTab() {
  const { data: queryHistory } = useApi('/knowledge-graph/queries')
  const history = (queryHistory ?? []) as Array<{ id: string; question: string; answer: string | null; entitiesFound: number; durationMs: number | null; createdAt: string }>
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<{ answer: string; relevantEntities: Entity[]; confidence: number; reasoning: string; durationMs: number } | null>(null)
  const [asking, setAsking] = useState(false)

  const ask = async () => {
    if (!question.trim()) return
    setAsking(true)
    const r = await apiPost('/knowledge-graph/query', { question })
    if (r.success) setResult(r.data)
    setAsking(false)
  }

  const SAMPLE_QUESTIONS = [
    'What decisions were made recently?',
    'Who works on projects?',
    'What are the company goals?',
    'Show me customer relationships',
    'What is the relationship between projects and goals?',
  ]

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Ask the Knowledge Graph</h3>
        <div className="flex gap-3">
          <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm" placeholder="Ask a question about your business knowledge..." />
          <button onClick={ask} disabled={!question.trim() || asking} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {asking ? 'Searching...' : 'Ask'}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          {SAMPLE_QUESTIONS.map(q => (
            <button key={q} onClick={() => { setQuestion(q); }} className="text-xs bg-gray-100 text-gray-600 rounded-lg px-2.5 py-1 hover:bg-gray-200">{q}</button>
          ))}
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-400 mb-1">Answer</div>
            <p className="text-gray-800">{result.answer}</p>
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Confidence: <strong className="text-indigo-600">{result.confidence}%</strong></span>
            <span>Duration: <strong>{result.durationMs}ms</strong></span>
            <span>Entities: <strong>{result.relevantEntities.length}</strong></span>
          </div>
          {result.relevantEntities.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">Relevant Entities</div>
              <div className="flex flex-wrap gap-2">
                {result.relevantEntities.map(e => (
                  <span key={e.id} className={`text-xs px-2.5 py-1 rounded-lg ${ENTITY_COLORS[e.type] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ENTITY_ICONS[e.type]} {e.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-gray-400 italic">Reasoning: {result.reasoning}</div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Query History</h3>
          <div className="space-y-3">
            {history.map(q => (
              <div key={q.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="text-sm font-medium text-gray-800">{q.question}</div>
                {q.answer && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{q.answer}</div>}
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>{q.entitiesFound} entities</span>
                  <span>{q.durationMs}ms</span>
                  <span>{new Date(q.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────

function TimelineTab() {
  const { data: entData } = useApi('/knowledge-graph/entities')
  const entities = (entData ?? []) as Entity[]
  const [selectedId, setSelectedId] = useState('')
  const [timeline, setTimeline] = useState<Array<{ date: string; kind: string; description: string; importance: string }>>([])
  const [entity, setEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async (id: string) => {
    setLoading(true)
    const r = await fetch(`${API}?path=${encodeURIComponent(`/knowledge-graph/entities/${id}/timeline`)}`)
    const json = await r.json()
    if (json.success) { setTimeline(json.data.timeline); setEntity(json.data.entity) }
    setLoading(false)
  }

  const TIMELINE_COLORS: Record<string, string> = {
    fact: 'border-blue-400 bg-blue-50',
    relation: 'border-purple-400 bg-purple-50',
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Entity</label>
          <select value={selectedId} onChange={e => { setSelectedId(e.target.value); if (e.target.value) load(e.target.value) }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">— choose entity —</option>
            {entities.map(e => <option key={e.id} value={e.id}>{ENTITY_ICONS[e.type]} {e.name}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Loading timeline...</div>}

      {entity && !loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{ENTITY_ICONS[entity.type] ?? '●'}</span>
            <div>
              <h3 className="font-bold text-gray-800">{entity.name}</h3>
              <div className="text-xs text-gray-500 capitalize">{entity.type} · importance: {entity.importance.toFixed(0)}</div>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No facts or relations yet for this entity.</div>
          ) : (
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
              {timeline.map((item, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-4 w-2.5 h-2.5 rounded-full border-2 mt-1 ${item.kind === 'fact' ? 'border-blue-400 bg-blue-100' : 'border-purple-400 bg-purple-100'}`} />
                  <div className={`ml-2 rounded-lg border-l-2 p-3 ${TIMELINE_COLORS[item.kind] ?? 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800">{item.description}</p>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400 capitalize">{item.kind}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'explorer', label: 'Graph Explorer' },
  { key: 'entities', label: 'Entities' },
  { key: 'relations', label: 'Relations' },
  { key: 'facts', label: 'Facts' },
  { key: 'query', label: 'AI Query' },
  { key: 'timeline', label: 'Timeline' },
]

export default function KnowledgeGraphPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Enterprise Knowledge Graph</h1>
        <p className="text-sm text-gray-500 mt-1">Semantic memory · Entity relationships · Graph traversal · Natural language queries · Auto-index from all Reno modules</p>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'explorer' && <ExplorerTab />}
        {tab === 'entities' && <EntitiesTab />}
        {tab === 'relations' && <RelationsTab />}
        {tab === 'facts' && <FactsTab />}
        {tab === 'query' && <QueryTab />}
        {tab === 'timeline' && <TimelineTab />}
      </div>
    </div>
  )
}
