'use client'
import { useState, useEffect } from 'react'
import { Gift, Star, Users, TrendingUp, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Member { id: string; tier: string; points: number; lifetime: number; program: { name: string }; _count: { transactions: number } }
interface Summary { programs: number; members: number; totalActivePoints: number }

const tierColor = (t: string) => ({ gold: 'text-yellow-400', silver: 'text-slate-300', platinum: 'text-indigo-400', diamond: 'text-cyan-400' }[t] ?? 'text-amber-600')

export default function LoyaltyPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, m] = await Promise.all([
      fetch(`${API}/v1/loyalty/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/loyalty/members`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setMembers(m.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Gift className="w-5 h-5 text-indigo-500" /> Customer Loyalty & Rewards</h1>
        <button onClick={load} disabled={loading} className="border border-border text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Programs', value: summary.programs, icon: Gift }, { label: 'Members', value: summary.members, icon: Users }, { label: 'Active Points', value: summary.totalActivePoints.toLocaleString(), icon: Star }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className="w-5 h-5 text-indigo-400" /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-foreground text-sm">Top Members</h2></div>
        <div className="divide-y divide-border">
          {members.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No members yet.</p>}
          {members.map((m, i) => (
            <div key={m.id} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{m.program.name}</p>
                <p className="text-xs text-muted-foreground">{m._count.transactions} transactions · Lifetime: {m.lifetime.toLocaleString()} pts</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{m.points.toLocaleString()} pts</p>
                <p className={`text-xs font-medium capitalize ${tierColor(m.tier)}`}>{m.tier}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
