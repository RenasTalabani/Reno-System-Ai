'use client'
import { useState, useEffect } from 'react'
import { Clock, AlertOctagon, CheckCircle2, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Definition { id: string; name: string; module: string; priority: string; responseHours: number; resolutionHours: number; isActive: boolean; _count: { breaches: number } }
interface Breach { id: string; type: string; dueAt: string; breachedAt: string | null; resolvedAt: string | null; minutesLate: number | null; sla: { name: string; module: string } }
interface Summary { activeDefinitions: number; totalBreaches: number; openBreaches: number }

const priorityColor = (p: string) => ({ critical: 'text-red-400', high: 'text-orange-400', medium: 'text-amber-400', low: 'text-blue-400' }[p] ?? 'text-slate-400')

export default function SLAPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [defs, setDefs] = useState<Definition[]>([])
  const [breaches, setBreaches] = useState<Breach[]>([])
  const [tab, setTab] = useState<'definitions' | 'breaches'>('definitions')
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    const [s, d, b] = await Promise.all([
      fetch(`${API}/v1/sla/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/sla/definitions`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/sla/breaches`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setDefs(d.data ?? []); setBreaches(b.data ?? [])
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> SLA Management</h1>
        <div className="flex gap-2">
          <button onClick={load} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className="w-4 h-4" /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New SLA</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Active SLAs', value: summary.activeDefinitions, icon: CheckCircle2, color: 'text-emerald-400' }, { label: 'Total Breaches', value: summary.totalBreaches, icon: AlertOctagon, color: 'text-amber-400' }, { label: 'Open Breaches', value: summary.openBreaches, icon: AlertOctagon, color: 'text-red-400' }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {(['definitions', 'breaches'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm px-4 py-2 rounded-lg capitalize transition-colors ${tab === t ? 'bg-card border border-border text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
        ))}
      </div>

      {tab === 'definitions' && (
        <div className="space-y-3">
          {defs.map(d => (
            <div key={d.id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-indigo-500/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Module: {d.module} · Response: {d.responseHours}h · Resolution: {d.resolutionHours}h</p>
              </div>
              <span className={`text-xs font-medium capitalize ${priorityColor(d.priority)}`}>{d.priority}</span>
              <span className="text-xs text-muted-foreground">{d._count.breaches} breaches</span>
              <div className={`w-2 h-2 rounded-full ${d.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </div>
          ))}
          {defs.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No SLA definitions.</p>}
        </div>
      )}

      {tab === 'breaches' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {breaches.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No breaches recorded.</p>}
            {breaches.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.sla.name}</p>
                  <p className="text-xs text-muted-foreground">{b.sla.module} · Due: {new Date(b.dueAt).toLocaleString()}</p>
                </div>
                {b.minutesLate && <span className="text-xs text-red-400">{b.minutesLate}min late</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.resolvedAt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{b.resolvedAt ? 'Resolved' : 'Open'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
