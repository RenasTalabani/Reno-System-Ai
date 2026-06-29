'use client'
import { useState, useEffect } from 'react'
import { CreditCard, FileText, TrendingUp, AlertCircle, CheckCircle, Clock, RefreshCw, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { activeSubs: number; pendingInvoices: number; totalRevenue: number }
interface Invoice { id: string; number: string; status: string; total: number; currency: string; dueDate: string; createdAt: string }

const statusColor = (s: string) => ({ paid: 'text-emerald-400 bg-emerald-500/10', open: 'text-amber-400 bg-amber-500/10', draft: 'text-slate-400 bg-slate-500/10', void: 'text-red-400 bg-red-500/10' }[s] ?? 'text-slate-400 bg-slate-500/10')

export default function BillingPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, i] = await Promise.all([
      fetch(`${API}/v1/billing/summary`, { headers: h }).then(r => r.json()),
      fetch(`${API}/v1/billing/invoices`, { headers: h }).then(r => r.json()),
    ])
    setSummary(s.data)
    setInvoices(i.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500" /> Billing & Subscriptions</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 border border-border text-foreground text-sm px-4 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors"><Plus className="w-4 h-4" /> New Invoice</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Subscriptions', value: summary.activeSubs, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Pending Invoices', value: summary.pendingInvoices, icon: AlertCircle, color: 'text-amber-400' },
            { label: 'Total Revenue', value: `$${Number(summary.totalRevenue).toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-sm">Recent Invoices</h2>
        </div>
        <div className="divide-y divide-border">
          {invoices.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No invoices yet</p>}
          {invoices.map(inv => (
            <div key={inv.id} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{inv.number}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>{inv.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : 'No due date'}</p>
              </div>
              <span className="text-sm font-bold text-foreground">{inv.currency} {Number(inv.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
