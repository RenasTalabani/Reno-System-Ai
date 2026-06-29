'use client'
import { useState, useEffect } from 'react'
import { ShieldCheck, AlertTriangle, ClipboardList, CheckSquare, RefreshCw, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface NC { id: string; title: string; severity: string; status: string; assignedTo: string | null; dueDate: string | null; createdAt: string }
interface Summary { totalAudits: number; openNCs: number; criticalNCs: number }

const sevColor = (s: string) => ({ critical: 'text-red-400 bg-red-500/10', major: 'text-orange-400 bg-orange-500/10', minor: 'text-amber-400 bg-amber-500/10', observation: 'text-blue-400 bg-blue-500/10' }[s] ?? 'text-slate-400 bg-slate-500/10')

export default function QMSPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [ncs, setNcs] = useState<NC[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, n] = await Promise.all([
      fetch(`${API}/v1/qms/summary`, { headers: h }).then(r => r.json()),
      fetch(`${API}/v1/qms/non-conformances`, { headers: h }).then(r => r.json()),
    ])
    setSummary(s.data); setNcs(n.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-500" /> Quality Management System</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 border border-border text-foreground text-sm px-4 py-2 rounded-lg hover:bg-muted transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors"><Plus className="w-4 h-4" /> New Audit</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Total Audits', value: summary.totalAudits, icon: ClipboardList, color: 'text-blue-400' }, { label: 'Open NCs', value: summary.openNCs, icon: AlertTriangle, color: 'text-amber-400' }, { label: 'Critical NCs', value: summary.criticalNCs, icon: AlertTriangle, color: 'text-red-400' }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-muted-foreground" /><h2 className="font-semibold text-foreground text-sm">Non-Conformances</h2></div>
        <div className="divide-y divide-border">
          {ncs.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No non-conformances. System is green.</p>}
          {ncs.map(nc => (
            <div key={nc.id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${sevColor(nc.severity)}`}>{nc.severity}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{nc.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{nc.status} {nc.dueDate ? `· Due ${new Date(nc.dueDate).toLocaleDateString()}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
