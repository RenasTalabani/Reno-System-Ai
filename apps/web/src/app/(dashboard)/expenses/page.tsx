'use client'
import { useState, useEffect } from 'react'
import { Receipt, DollarSign, CheckCircle, Clock, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { totalReports: number; pendingReports: number; approvedReports: number; totalPending: number }
interface Report { id: string; title: string; period: string; currency: string; totalAmount: number; status: string; _count: { items: number } }

const statusColor = (s: string) => ({ draft: 'bg-slate-500/10 text-slate-400', submitted: 'bg-amber-500/10 text-amber-400', approved: 'bg-emerald-500/10 text-emerald-400', rejected: 'bg-red-500/10 text-red-400', paid: 'bg-blue-500/10 text-blue-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function ExpensesPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, r] = await Promise.all([
      fetch(`${API}/v1/expenses/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/expenses/`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setReports(r.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Receipt className="w-5 h-5 text-indigo-500" /> Expense Management</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Report</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: summary.totalReports, icon: Receipt, color: 'text-blue-400' },
            { label: 'Pending Approval', value: summary.pendingReports, icon: Clock, color: 'text-amber-400' },
            { label: 'Approved', value: summary.approvedReports, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Pending Amount', value: `$${Number(summary.totalPending).toFixed(0)}`, icon: DollarSign, color: 'text-orange-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Period: {r.period} · {r._count.items} items</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{r.currency} {Number(r.totalAmount).toFixed(2)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && reports.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No expense reports yet.</p>}
      </div>
    </div>
  )
}