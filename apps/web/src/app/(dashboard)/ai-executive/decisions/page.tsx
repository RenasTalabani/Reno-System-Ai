'use client'

import { useEffect, useState } from 'react'
import { Target, BookOpen, Plus, Loader2 } from 'lucide-react'

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [tab, setTab] = useState<'decisions' | 'lessons'>('decisions')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', context: '', decision: '', executiveRole: 'ceo' })

  const load = () => {
    Promise.all([
      fetch('/api/v1/ai-exec/decisions').then(r => r.json()),
      fetch('/api/v1/ai-exec/decisions/lessons').then(r => r.json()),
    ]).then(([d, l]) => { setDecisions(d.data ?? []); setLessons(l.data ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.title.trim() || !form.decision.trim()) return
    setSaving(true)
    try {
      await fetch('/api/v1/ai-exec/decisions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setForm({ title: '', context: '', decision: '', executiveRole: 'ceo' })
      setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  const generateLesson = async (id: string) => {
    setGenerating(id)
    try {
      await fetch(`/api/v1/ai-exec/decisions/${id}/generate-lesson`, { method: 'POST' })
      load()
    } finally { setGenerating(null) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Decision History & Lessons</h1>
          <p className="text-sm text-gray-500">Track strategic decisions and build organizational memory</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" />Record Decision
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['decisions', 'lessons'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'decisions' ? `Decisions (${decisions.length})` : `Lessons (${lessons.length})`}
          </button>
        ))}
      </div>

      {/* Record Decision form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Record a Decision</h3>
          <div className="space-y-3">
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={form.executiveRole} onChange={e => setForm(f => ({ ...f, executiveRole: e.target.value }))}>
              {['ceo', 'coo', 'cfo', 'chro', 'sales_director', 'analyst'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Decision title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="Business context..." rows={2} value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} />
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="The decision made..." rows={3} value={form.decision} onChange={e => setForm(f => ({ ...f, decision: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim() || !form.decision.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        tab === 'decisions' ? (
          decisions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No decisions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map(d => (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{d.executiveRole}</span>
                        <span className="text-xs text-gray-500">{new Date(d.decisionDate).toLocaleDateString()}</span>
                        {d.outcome && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">outcome recorded</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{d.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{d.decision}</p>
                      {d.outcome && <p className="text-xs text-gray-500 mt-2 italic">Actual outcome: {d.outcome}</p>}
                    </div>
                    {d.outcome && !d.lessons && (
                      <button onClick={() => generateLesson(d.id)} disabled={generating === d.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm hover:bg-purple-100 disabled:opacity-50 shrink-0">
                        {generating === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                        Generate Lesson
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          lessons.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No lessons learned yet</p>
              <p className="text-sm text-gray-400 mt-1">Record a decision with an outcome to generate AI lessons</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map(l => (
                <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{l.category}</span>
                    <span className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{l.title}</h3>
                  <p className="text-sm text-gray-700 mt-2 leading-relaxed">{l.lesson}</p>
                  {l.tags?.length > 0 && (
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {(l.tags as string[]).map((tag: string) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )
      }
    </div>
  )
}
