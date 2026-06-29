'use client'
import { useState, useEffect } from 'react'
import { Wand2, Play, Pause, Plus, Zap, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Workflow { id: string; name: string; description: string | null; status: string; isActive: boolean; runCount: number; lastRunAt: string | null; createdAt: string }
interface Run { id: string; status: string; startedAt: string; finishedAt: string | null; durationMs: number | null; workflow: { name: string } }
interface Summary { total: number; active: number; runsToday: number }

const runStatusIcon = (s: string) => ({ completed: <CheckCircle className="w-4 h-4 text-emerald-400" />, failed: <XCircle className="w-4 h-4 text-red-400" />, running: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" /> }[s] ?? <Clock className="w-4 h-4 text-muted-foreground" />)

export default function AiStudioPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [tab, setTab] = useState<'workflows' | 'runs'>('workflows')
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, w, r] = await Promise.all([
      fetch(`${API}/v1/ai-studio/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/ai-studio/workflows`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/ai-studio/runs`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setWorkflows(w.data ?? []); setRuns(r.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  const trigger = async (id: string) => { await fetch(`${API}/v1/ai-studio/workflows/${id}/run`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}' }); setTimeout(load, 1500) }
  const toggle = async (wf: Workflow) => {
    const ep = wf.isActive ? 'deactivate' : 'activate'
    await fetch(`${API}/v1/ai-studio/workflows/${wf.id}/${ep}`, { method: 'POST', headers: h })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Wand2 className="w-5 h-5 text-indigo-500" /> AI Automation Studio</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors"><Plus className="w-4 h-4" /> New Workflow</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Total Workflows', value: summary.total }, { label: 'Active', value: summary.active }, { label: "Runs Today", value: summary.runsToday }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5"><p className="text-2xl font-bold text-foreground">{c.value}</p><p className="text-xs text-muted-foreground mt-1">{c.label}</p></div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {(['workflows', 'runs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm px-4 py-2 rounded-lg transition-colors capitalize ${tab === t ? 'bg-card border border-border text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
        ))}
      </div>

      {tab === 'workflows' && (
        <div className="space-y-3">
          {workflows.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No workflows yet. Build your first automation.</p>}
          {workflows.map(wf => (
            <div key={wf.id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-indigo-500/40 transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${wf.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{wf.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{wf.runCount} runs · {wf.lastRunAt ? `Last: ${new Date(wf.lastRunAt).toLocaleString()}` : 'Never run'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => trigger(wf.id)} className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors"><Zap className="w-3 h-3" /> Run</button>
                <button onClick={() => toggle(wf)} className={`flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg transition-colors ${wf.isActive ? 'text-amber-400 hover:border-amber-500/50' : 'text-emerald-400 hover:border-emerald-500/50'}`}>{wf.isActive ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Activate</>}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'runs' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {runs.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No runs yet</p>}
            {runs.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                {runStatusIcon(r.status)}
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{r.workflow.name}</p><p className="text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</p></div>
                {r.durationMs && <span className="text-xs text-muted-foreground">{r.durationMs}ms</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
