'use client'
import { useState, useEffect } from 'react'
import { LayoutDashboard, BarChart2, TrendingUp, Lightbulb, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { totalDashboards: number; totalWidgets: number; totalReports: number; kpiSnapshots: number }
interface Dashboard { id: string; name: string; type: string; isDefault: boolean; _count: { widgets: number } }
interface Insight { id: string; title: string; severity: string; module: string | null; isRead: boolean }

const severityColor = (s: string) => ({ critical: 'text-red-400', warning: 'text-amber-400', info: 'text-blue-400', success: 'text-emerald-400' }[s] ?? 'text-slate-400')

export default function BiDashboardPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, d, i] = await Promise.all([
      fetch(`${API}/v1/bi-dashboard/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/bi-dashboard/dashboards`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/bi-dashboard/insights`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setDashboards(d.data ?? []); setInsights(i.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-indigo-500" /> Business Intelligence</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Dashboard</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Dashboards', value: summary.totalDashboards, icon: LayoutDashboard, color: 'text-blue-400' },
            { label: 'Widgets', value: summary.totalWidgets, icon: BarChart2, color: 'text-indigo-400' },
            { label: 'Reports', value: summary.totalReports, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'KPI Snapshots', value: summary.kpiSnapshots, icon: Lightbulb, color: 'text-amber-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Dashboards</h2>
          <div className="space-y-2">
            {dashboards.map(d => (
              <div key={d.id} className="bg-card border border-border rounded-xl px-4 py-3 hover:border-indigo-500/40 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.name}{d.isDefault && <span className="ml-2 text-xs text-indigo-400">Default</span>}</p>
                    <p className="text-xs text-muted-foreground">{d.type} · {d._count.widgets} widgets</p>
                  </div>
                  <BarChart2 className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
            {!loading && dashboards.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No dashboards yet.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">AI Insights</h2>
          <div className="space-y-2">
            {insights.map(i => (
              <div key={i.id} className="bg-card border border-border rounded-xl px-4 py-3 hover:border-indigo-500/40 transition-colors">
                <div className="flex items-start gap-2">
                  <Lightbulb className={`w-4 h-4 mt-0.5 shrink-0 ${severityColor(i.severity)}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{i.title}</p>
                    {i.module && <p className="text-xs text-muted-foreground">{i.module}</p>}
                  </div>
                </div>
              </div>
            ))}
            {!loading && insights.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No AI insights yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}