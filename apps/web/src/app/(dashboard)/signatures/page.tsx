'use client'
import { useState, useEffect } from 'react'
import { PenLine, CheckCircle, Clock, FileSignature, Plus, RefreshCw, Users } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Signer { id: string; name: string; email: string; status: string; signedAt: string | null }
interface Request { id: string; title: string; status: string; createdAt: string; expiresAt: string | null; signers: Signer[] }
interface Summary { totalRequests: number; pendingRequests: number; completedRequests: number }

const statusColor = (s: string) => ({ pending: 'bg-amber-500/10 text-amber-400', completed: 'bg-emerald-500/10 text-emerald-400', expired: 'bg-red-500/10 text-red-400', cancelled: 'bg-slate-500/10 text-slate-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function SignaturesPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, r] = await Promise.all([
      fetch(`${API}/v1/signatures/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/signatures/requests`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setRequests(r.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><PenLine className="w-5 h-5 text-indigo-500" /> Digital Signatures</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Request</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Total Requests', value: summary.totalRequests, icon: FileSignature, color: 'text-blue-400' }, { label: 'Pending Signature', value: summary.pendingRequests, icon: Clock, color: 'text-amber-400' }, { label: 'Completed', value: summary.completedRequests, icon: CheckCircle, color: 'text-emerald-400' }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {requests.map(r => {
          const signed = r.signers.filter(s => s.status === 'signed').length
          return (
            <div key={r.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Created {new Date(r.createdAt).toLocaleDateString()}{r.expiresAt ? ` · Expires ${new Date(r.expiresAt).toLocaleDateString()}` : ''}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Users className="w-3 h-3 text-muted-foreground" />
                <div className="flex gap-1">
                  {r.signers.map(s => (
                    <div key={s.id} title={`${s.name} (${s.status})`} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${s.status === 'signed' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}>{s.name[0]}</div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{signed}/{r.signers.length} signed</span>
              </div>
            </div>
          )
        })}
        {!loading && requests.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No signature requests yet.</p>}
      </div>
    </div>
  )
}
