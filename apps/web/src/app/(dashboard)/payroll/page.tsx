'use client'
import { useState, useEffect } from 'react'
import { DollarSign, Users, FileText, Play, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface PayRun { id: string; name: string; period: string; status: string; totalGross: number; totalNet: number; totalTax: number; processedAt: string | null; createdAt: string }
interface Summary { totalRuns: number; processedRuns: number; totalPayslips: number; totalNetPaid: number }

const statusColor = (s: string) => ({ draft: 'text-slate-400', processing: 'text-blue-400', processed: 'text-emerald-400', failed: 'text-red-400' }[s] ?? 'text-slate-400')

export default function PayrollPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [runs, setRuns] = useState<PayRun[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, r] = await Promise.all([
      fetch(`${API}/v1/payroll/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/payroll/pay-runs`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setRuns(r.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  const processRun = async (id: string) => {
    await fetch(`${API}/v1/payroll/pay-runs/${id}/process`, { method: 'PATCH', headers: h })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><DollarSign className="w-5 h-5 text-indigo-500" /> Payroll Engine</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Pay Run</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Pay Runs', value: summary.totalRuns, icon: FileText },
            { label: 'Processed', value: summary.processedRuns, icon: Play },
            { label: 'Payslips', value: summary.totalPayslips, icon: Users },
            { label: 'Total Net Paid', value: `$${Number(summary.totalNetPaid).toLocaleString()}`, icon: DollarSign },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className="w-4 h-4 text-indigo-400" /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-foreground text-sm">Pay Runs</h2></div>
        <div className="divide-y divide-border">
          {runs.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No pay runs yet.</p>}
          {runs.map(r => (
            <div key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Period: {r.period} · Gross: ${Number(r.totalGross).toLocaleString()} · Net: ${Number(r.totalNet).toLocaleString()}</p>
              </div>
              <span className={`text-xs font-medium capitalize ${statusColor(r.status)}`}>{r.status}</span>
              {r.status === 'draft' && (
                <button onClick={() => processRun(r.id)} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500">
                  <Play className="w-3 h-3" /> Process
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
