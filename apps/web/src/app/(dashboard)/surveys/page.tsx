'use client'
import { useState, useEffect } from 'react'
import { ClipboardList, Activity, MessageSquare, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { totalSurveys: number; activeSurveys: number; totalResponses: number }
interface Survey { id: string; title: string; status: string; _count: { questions: number; responses: number } }

const statusColor = (s: string) => ({ draft: 'bg-slate-500/10 text-slate-400', active: 'bg-emerald-500/10 text-emerald-400', closed: 'bg-red-500/10 text-red-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function SurveysPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, sv] = await Promise.all([
      fetch(`${API}/v1/surveys/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/surveys/`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setSurveys(sv.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-500" /> Surveys & Feedback</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Survey</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Surveys', value: summary.totalSurveys, icon: ClipboardList, color: 'text-blue-400' },
            { label: 'Active', value: summary.activeSurveys, icon: Activity, color: 'text-emerald-400' },
            { label: 'Total Responses', value: summary.totalResponses, icon: MessageSquare, color: 'text-indigo-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {surveys.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s._count.questions} questions · {s._count.responses} responses</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
            </div>
          </div>
        ))}
        {!loading && surveys.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No surveys yet.</p>}
      </div>
    </div>
  )
}