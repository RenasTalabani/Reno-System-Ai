'use client'
import { useState, useEffect } from 'react'
import { PieChart, TrendingUp, TrendingDown, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Period { id: string; name: string; fiscalYear: number; status: string; totalBudget: number; _count: { lines: number } }
interface Line { id: string; category: string; description: string; budgeted: number; actual: number; forecast: number | null; department: string | null }
interface Summary { totalPeriods: number; activePeriod: string | null; budgeted: number; actual: number }

export default function BudgetPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, p] = await Promise.all([
      fetch(`${API}/v1/budget/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/budget/periods`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setPeriods(p.data ?? [])
    setLoading(false)
  }

  const loadLines = async (periodId: string) => {
    setSelectedPeriod(periodId)
    const r = await fetch(`${API}/v1/budget/periods/${periodId}/lines`, { headers: h }).then(x => x.json())
    setLines(r.data ?? [])
  }

  useEffect(() => { load() }, [token])

  const variance = summary ? Number(summary.actual) - Number(summary.budgeted) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-500" /> Budget & Forecasting</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Period</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Budget Periods', value: summary.totalPeriods },
            { label: 'Active Period', value: summary.activePeriod ?? 'None' },
            { label: 'Budgeted', value: `$${Number(summary.budgeted).toLocaleString()}` },
            { label: 'Actual vs Budget', value: `${variance >= 0 ? '+' : ''}$${Math.abs(variance).toLocaleString()}`, color: variance <= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color ?? 'text-foreground'}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-foreground text-sm">Budget Periods</h2></div>
          <div className="divide-y divide-border">
            {periods.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No periods.</p>}
            {periods.map(p => (
              <button key={p.id} onClick={() => loadLines(p.id)} className={`w-full px-5 py-3 text-left hover:bg-muted/30 transition-colors ${selectedPeriod === p.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">FY{p.fiscalYear} · {p._count.lines} lines</p>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-foreground text-sm">Budget Lines</h2></div>
          <div className="divide-y divide-border">
            {!selectedPeriod && <p className="text-center py-12 text-muted-foreground text-sm">Select a period to view lines.</p>}
            {lines.map(l => {
              const pct = l.budgeted > 0 ? (l.actual / l.budgeted) * 100 : 0
              return (
                <div key={l.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div><p className="text-sm font-medium text-foreground">{l.description}</p><p className="text-xs text-muted-foreground">{l.category}{l.department ? ` · ${l.department}` : ''}</p></div>
                    <div className="text-right"><p className="text-xs text-muted-foreground">Budget: ${Number(l.budgeted).toLocaleString()}</p><p className={`text-xs font-medium ${pct > 100 ? 'text-red-400' : 'text-emerald-400'}`}>Actual: ${Number(l.actual).toLocaleString()}</p></div>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden mt-2"><div className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
