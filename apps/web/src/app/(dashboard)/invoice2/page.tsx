'use client'
import { useState, useEffect } from 'react'
import { FileText, DollarSign, CheckCircle, Link, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { totalQuotes: number; pendingValue: number; acceptedValue: number; activePaymentLinks: number }
interface Quote { id: string; number: string; clientName: string; total: number; currency: string; status: string; type: string }

const statusColor = (s: string) => ({ draft: 'bg-slate-500/10 text-slate-400', sent: 'bg-amber-500/10 text-amber-400', accepted: 'bg-emerald-500/10 text-emerald-400', rejected: 'bg-red-500/10 text-red-400', expired: 'bg-slate-500/10 text-slate-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function Invoice2Page() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, q] = await Promise.all([
      fetch(`${API}/v1/invoice2/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/invoice2/quotes`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setQuotes(q.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> Quotes & Payments</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Quote</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Quotes', value: summary.totalQuotes, icon: FileText, color: 'text-blue-400' },
            { label: 'Pending Value', value: '$' + Number(summary.pendingValue).toFixed(0), icon: DollarSign, color: 'text-amber-400' },
            { label: 'Accepted Value', value: '$' + Number(summary.acceptedValue).toFixed(0), icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Payment Links', value: summary.activePaymentLinks, icon: Link, color: 'text-indigo-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {quotes.map(q => (
          <div key={q.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{q.number} — {q.clientName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{q.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{q.currency} {Number(q.total).toFixed(2)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(q.status)}`}>{q.status}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && quotes.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No quotes yet.</p>}
      </div>
    </div>
  )
}