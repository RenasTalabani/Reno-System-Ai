'use client'
import { useState, useEffect } from 'react'
import { Briefcase, FolderKanban, TrendingUp, AlertOctagon, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Project { id: string; name: string; status: string; priority: string; progress: number; budget: number | null; spent: number; startDate: string | null; endDate: string | null }
interface Summary { portfolios: number; activeProjects: number; atRisk: number }

const statusColor = (s: string) => ({ planning: 'text-blue-400', active: 'text-emerald-400', on_hold: 'text-amber-400', at_risk: 'text-red-400', completed: 'text-slate-400' }[s] ?? 'text-slate-400')
const priorityDot = (p: string) => ({ critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-slate-500' }[p] ?? 'bg-slate-500')

export default function PortfolioPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, p] = await Promise.all([
      fetch(`${API}/v1/ppm/summary`, { headers: h }).then(r => r.json()),
      fetch(`${API}/v1/ppm/projects`, { headers: h }).then(r => r.json()),
    ])
    setSummary(s.data); setProjects(p.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-500" /> Project Portfolio Management</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors"><Plus className="w-4 h-4" /> New Project</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Portfolios', value: summary.portfolios, icon: FolderKanban, color: 'text-indigo-400' }, { label: 'Active Projects', value: summary.activeProjects, icon: TrendingUp, color: 'text-emerald-400' }, { label: 'At Risk', value: summary.atRisk, icon: AlertOctagon, color: 'text-red-400' }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className={`w-5 h-5 ${c.color}`} /></div><p className="text-2xl font-bold text-foreground">{c.value}</p></div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {projects.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${priorityDot(p.priority)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <span className={`text-xs font-medium ${statusColor(p.status)}`}>{p.status.replace('_', ' ')}</span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1"><span>Progress</span><span>{p.progress}%</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${p.progress}%` }} /></div>
                </div>
                {p.budget && <p className="text-xs text-muted-foreground mt-1.5">Budget: ${Number(p.budget).toLocaleString()} · Spent: ${Number(p.spent).toLocaleString()}</p>}
              </div>
            </div>
          </div>
        ))}
        {!loading && projects.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No projects yet. Create your first project.</p>}
      </div>
    </div>
  )
}
