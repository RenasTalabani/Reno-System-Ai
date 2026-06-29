'use client'
import { useState, useEffect } from 'react'
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { totalShifts: number; activeTimesheets: number; pendingApproval: number }
interface Timesheet { id: string; employeeId: string; periodStart: string; periodEnd: string; totalHours: number; status: string; shift: { name: string } | null; _count: { clockEntries: number } }

const statusColor = (s: string) => ({ draft: 'bg-slate-500/10 text-slate-400', submitted: 'bg-amber-500/10 text-amber-400', approved: 'bg-emerald-500/10 text-emerald-400', rejected: 'bg-red-500/10 text-red-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function TimeAttendancePage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, t] = await Promise.all([
      fetch(`${API}/v1/time-attendance/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/time-attendance/timesheets`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setTimesheets(t.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> Time & Attendance</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Timesheet</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Shifts', value: summary.totalShifts, icon: Clock, color: 'text-blue-400' },
            { label: 'Open Timesheets', value: summary.activeTimesheets, icon: Users, color: 'text-amber-400' },
            { label: 'Pending Approval', value: summary.pendingApproval, icon: AlertCircle, color: 'text-orange-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {timesheets.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t.shift?.name ?? 'No Shift'} — {new Date(t.periodStart).toLocaleDateString()} to {new Date(t.periodEnd).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{Number(t.totalHours).toFixed(1)}h total · {t._count.clockEntries} entries</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
            </div>
          </div>
        ))}
        {!loading && timesheets.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No timesheets yet.</p>}
      </div>
    </div>
  )
}