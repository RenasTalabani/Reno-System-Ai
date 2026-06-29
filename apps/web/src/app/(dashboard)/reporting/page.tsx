'use client'
import { useState, useEffect } from 'react'
import { BarChart2, Plus, Download, Calendar, Trash2, Play } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Report { id: string; name: string; type: string; dataSource: string; lastRunAt: string | null; isPublic: boolean; isTemplate: boolean; createdAt: string }

const typeIcon: Record<string, string> = { table: '⊞', bar: '▦', line: '〜', pie: '◔', area: '▲' }

export default function ReportingPage() {
  const { token } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => { setLoading(true); const r = await fetch(`${API}/v1/reporting/reports`, { headers: h }).then(x => x.json()); setReports(r.data ?? []); setLoading(false) }
  useEffect(() => { load() }, [token])

  const runExport = async (id: string, format: string) => {
    await fetch(`${API}/v1/reporting/reports/${id}/export`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ format }) })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-500" /> Report Builder</h1>
        <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors"><Plus className="w-4 h-4" /> New Report</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Total Reports', value: reports.length }, { label: 'Public', value: reports.filter(r => r.isPublic).length }, { label: 'Templates', value: reports.filter(r => r.isTemplate).length }].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4"><p className="text-2xl font-bold text-foreground">{c.value}</p><p className="text-xs text-muted-foreground mt-1">{c.label}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading && <p className="text-center py-12 text-muted-foreground text-sm">Loading...</p>}
        {reports.map(rep => (
          <div key={rep.id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-lg">{typeIcon[rep.type] ?? '⊞'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><span className="text-sm font-medium text-foreground">{rep.name}</span>{rep.isTemplate && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">Template</span>}{rep.isPublic && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Public</span>}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{rep.dataSource} · {rep.type} · {rep.lastRunAt ? `Last run ${new Date(rep.lastRunAt).toLocaleDateString()}` : 'Never run'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => runExport(rep.id, 'csv')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-2.5 py-1.5 rounded-lg transition-colors"><Download className="w-3 h-3" /> CSV</button>
              <button onClick={() => runExport(rep.id, 'pdf')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-2.5 py-1.5 rounded-lg transition-colors"><Play className="w-3 h-3" /> PDF</button>
            </div>
          </div>
        ))}
        {!loading && reports.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No reports yet. Create your first report.</p>}
      </div>
    </div>
  )
}
