'use client'
import { useState, useEffect } from 'react'
import { Briefcase, Users, UserCheck, FileText, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { openJobs: number; totalCandidates: number; totalApplications: number; hired: number }
interface Job { id: string; title: string; department: string | null; location: string | null; type: string; status: string; _count: { applications: number } }

const statusColor = (s: string) => ({ draft: 'bg-slate-500/10 text-slate-400', published: 'bg-emerald-500/10 text-emerald-400', closed: 'bg-red-500/10 text-red-400', paused: 'bg-amber-500/10 text-amber-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function RecruitmentPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, j] = await Promise.all([
      fetch(`${API}/v1/ats/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/ats/jobs`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setJobs(j.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-500" /> Recruitment & ATS</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> Post Job</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Open Positions', value: summary.openJobs, icon: Briefcase, color: 'text-blue-400' },
            { label: 'Candidates', value: summary.totalCandidates, icon: Users, color: 'text-indigo-400' },
            { label: 'Applications', value: summary.totalApplications, icon: FileText, color: 'text-amber-400' },
            { label: 'Hired', value: summary.hired, icon: UserCheck, color: 'text-emerald-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {jobs.map(j => (
          <div key={j.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{j.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{j.department ?? 'No dept'} · {j.location ?? 'Remote'} · {j.type} · {j._count.applications} applicants</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(j.status)}`}>{j.status}</span>
            </div>
          </div>
        ))}
        {!loading && jobs.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No job postings yet.</p>}
      </div>
    </div>
  )
}