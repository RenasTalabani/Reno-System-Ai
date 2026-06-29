'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, TrendingDown, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Risk { id: string; title: string; category: string; likelihood: number; impact: number; score: number; status: string; mitigation: string | null; _count: { assessments: number } }
interface Summary { totalRisks: number; openRisks: number; criticalRisks: number; maxScore: number }

const scoreColor = (s: number) => s >= 15 ? 'bg-red-500/10 text-red-400' : s >= 9 ? 'bg-amber-500/10 text-amber-400' : s >= 4 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'

export default function RiskPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, r] = await Promise.all([
      fetch(`${API}/v1/risk/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/risk/items`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setRisks(r.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-indigo-500" /> Risk Management</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> Add Risk</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Risks', value: summary.totalRisks, icon: AlertTriangle, color: 'text-blue-400' },
            { label: 'Open Risks', value: summary.openRisks, icon: AlertTriangle, color: 'text-amber-400' },
            { label: 'Critical', value: summary.criticalRisks, icon: AlertTriangle, color: 'text-red-400' },
            { label: 'Highest Score', value: summary.maxScore, icon: TrendingDown, color: 'text-red-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {risks.map(r => (
          <div key={r.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-start gap-4">
              <span className={`text-xs font-bold px-2 py-1 rounded-lg min-w-[2rem] text-center ${scoreColor(r.score)}`}>{r.score}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Category: {r.category} · L:{r.likelihood} × I:{r.impact} · {r._count.assessments} assessments</p>
                {r.mitigation && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Mitigation: {r.mitigation}</p>}
              </div>
            </div>
          </div>
        ))}
        {!loading && risks.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No risks in register.</p>}
      </div>
    </div>
  )
}
