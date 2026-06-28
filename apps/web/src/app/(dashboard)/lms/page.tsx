'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, Plus, BookOpen, Users, CheckCircle, Play, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-blue-500/20 text-blue-400',
  advanced: 'bg-purple-500/20 text-purple-400',
  expert: 'bg-red-500/20 text-red-400',
}

interface Course { id: string; title: string; category: string | null; level: string; status: string; durationMin: number; isMandatory: boolean; passScore: number; _count?: { lessons: number; enrollments: number } }
interface Dashboard { totalCourses: number; publishedCourses: number; totalEnrollments: number; completionRate: number }

export default function LmsPage() {
  const { token } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Course | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (statusFilter) q.set('status', statusFilter)
    Promise.all([
      fetch(`${API}/v1/lms/courses?${q}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/lms/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([c, d]) => { setCourses(c.data ?? []); setDashboard(d.data) })
  }

  useEffect(() => { load() }, [search, statusFilter, token])

  const create = async () => {
    const res = await fetch(`${API}/v1/lms/courses`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, isMandatory: form.isMandatory === 'true', passScore: parseInt(form.passScore ?? '70') }) }).then(r => r.json())
    if (res.data) { setCourses(c => [res.data, ...c]); setShowCreate(false); setForm({}) }
  }

  const publish = async (id: string) => {
    await fetch(`${API}/v1/lms/courses/${id}/publish`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setCourses(c => c.map(x => x.id === id ? { ...x, status: 'published' } : x))
    if (selected?.id === id) setSelected(s => s ? { ...s, status: 'published' } : null)
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-500" /> Learning Management
          </h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Course
          </button>
        </div>

        {dashboard && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Courses', value: dashboard.totalCourses, icon: BookOpen },
              { label: 'Published', value: dashboard.publishedCourses, icon: CheckCircle },
              { label: 'Enrollments', value: dashboard.totalEnrollments, icon: Users },
              { label: 'Completion Rate', value: `${dashboard.completionRate}%`, icon: GraduationCap },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <s.icon className="w-4 h-4 text-indigo-400 mb-1" />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground" />
          </div>
          {['', 'draft', 'published'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {courses.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-4 ${selected?.id === c.id ? 'border-indigo-500' : 'border-border'}`}>
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm truncate">{c.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${LEVEL_COLORS[c.level] ?? 'bg-muted text-muted-foreground'}`}>{c.level}</span>
                  {c.isMandatory && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Required</span>}
                </div>
                <p className="text-xs text-muted-foreground">{c.category ?? 'Uncategorized'} · {c._count?.lessons ?? 0} lessons · {c._count?.enrollments ?? 0} enrolled</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{c.durationMin}m</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>{c.status}</span>
              </div>
            </div>
          ))}
          {courses.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No courses yet</p>}
        </div>
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground">{selected.title}</h2>
            <div className="flex gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[selected.level] ?? 'bg-muted text-muted-foreground'}`}>{selected.level}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selected.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>{selected.status}</span>
            </div>
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'Category', value: selected.category },
              { label: 'Duration', value: `${selected.durationMin} minutes` },
              { label: 'Pass Score', value: `${selected.passScore}%` },
              { label: 'Lessons', value: selected._count?.lessons },
              { label: 'Enrolled', value: selected._count?.enrollments },
              { label: 'Mandatory', value: selected.isMandatory ? 'Yes' : 'No' },
            ].filter(r => r.value !== null && r.value !== undefined).map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{String(row.value)}</span>
              </div>
            ))}
          </div>
          {selected.status === 'draft' && (
            <button onClick={() => publish(selected.id)} className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Publish Course
            </button>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Create Course</h2>
            <div className="space-y-3">
              {[{ field: 'title', label: 'Course Title' }, { field: 'category', label: 'Category' }].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Description</label>
                <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Level</label>
                  <select value={form.level ?? 'beginner'} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['beginner','intermediate','advanced','expert'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Pass Score (%)</label>
                  <input type="number" value={form.passScore ?? '70'} onChange={e => setForm(f => ({ ...f, passScore: e.target.value }))} min="0" max="100"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mandatory" checked={form.isMandatory === 'true'} onChange={e => setForm(f => ({ ...f, isMandatory: String(e.target.checked) }))} className="rounded" />
                <label htmlFor="mandatory" className="text-sm text-muted-foreground">Mark as mandatory</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={create} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
