'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Activity, Tag, TrendingUp, Search, ChevronRight, Zap } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STAGES = ['lead', 'prospect', 'customer', 'champion', 'churned']
const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-slate-500/20 text-slate-400',
  prospect: 'bg-blue-500/20 text-blue-400',
  customer: 'bg-green-500/20 text-green-400',
  champion: 'bg-indigo-500/20 text-indigo-400',
  churned: 'bg-red-500/20 text-red-400',
}

interface Customer {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  company: string | null
  lifecycleStage: string
  healthScore: number
  ltv: number
  lastSeenAt: string
  _count?: { events: number; segmentMembers: number }
}

interface Segment { id: string; name: string; memberCount: number; isDynamic: boolean }
interface Dashboard { totalCustomers: number; byLifecycleStage: Record<string, number>; avgHealthScore: number; eventsLast7Days: number }

export default function CDPPage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<'customers' | 'segments'>('customers')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [computing, setComputing] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  const load = useCallback(() => {
    const q = new URLSearchParams({ limit: '50' })
    if (search) q.set('search', search)
    if (stage) q.set('stage', stage)
    Promise.all([
      fetch(`${API}/v1/cdp/customers?${q}`, { headers }).then(r => r.json()),
      fetch(`${API}/v1/cdp/segments`, { headers }).then(r => r.json()),
      fetch(`${API}/v1/cdp/dashboard`, { headers }).then(r => r.json()),
    ]).then(([c, s, d]) => {
      setCustomers(c.data ?? [])
      setSegments(s.data ?? [])
      setDashboard(d.data)
    })
  }, [search, stage, token])

  useEffect(() => { load() }, [load])

  const computeSegment = async (id: string) => {
    setComputing(id)
    await fetch(`${API}/v1/cdp/segments/${id}/compute`, { method: 'POST', headers })
    setComputing(null)
    load()
  }

  const healthColor = (score: number) =>
    score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Customer Data Platform
          </h1>
        </div>

        {dashboard && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: dashboard.totalCustomers, icon: Users, color: 'text-indigo-400' },
              { label: 'Avg Health Score', value: `${dashboard.avgHealthScore}%`, icon: TrendingUp, color: healthColor(dashboard.avgHealthScore) },
              { label: 'Events (7d)', value: dashboard.eventsLast7Days, icon: Activity, color: 'text-blue-400' },
              { label: 'Segments', value: segments.length, icon: Tag, color: 'text-purple-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <div className={`${stat.color} mb-1`}><stat.icon className="w-4 h-4" /></div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
          {(['customers', 'segments'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-lg capitalize transition-colors ${tab === t ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'customers' && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
                  className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground" />
              </div>
              <select value={stage} onChange={e => setStage(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground">
                <option value="">All stages</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {customers.map(c => (
                <div key={c.id} onClick={() => setSelected(c)}
                  className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-4 ${selected?.id === c.id ? 'border-indigo-500' : 'border-border'}`}>
                  <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <span className="text-indigo-400 text-sm font-semibold">{(c.firstName?.[0] ?? c.email?.[0] ?? '?').toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : c.email ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{c.company ?? c.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STAGE_COLORS[c.lifecycleStage] ?? 'bg-muted text-muted-foreground'}`}>{c.lifecycleStage}</span>
                  <span className={`text-sm font-medium ${healthColor(c.healthScore)}`}>{c.healthScore}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'segments' && (
          <div className="space-y-3">
            {segments.map(seg => (
              <div key={seg.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{seg.name}</p>
                  <p className="text-xs text-muted-foreground">{seg.memberCount} members · {seg.isDynamic ? 'dynamic' : 'static'}</p>
                </div>
                <button onClick={() => computeSegment(seg.id)} disabled={computing === seg.id}
                  className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 border border-indigo-500/30 rounded-lg transition-colors disabled:opacity-50">
                  <Zap className="w-3 h-3 inline mr-1" />{computing === seg.id ? 'Computing...' : 'Compute'}
                </button>
              </div>
            ))}
            {segments.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No segments yet</p>}
          </div>
        )}
      </div>

      {selected && (
        <div className="w-80 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
              <span className="text-indigo-400 font-semibold">{(selected.firstName?.[0] ?? selected.email?.[0] ?? '?').toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{selected.firstName || selected.lastName ? `${selected.firstName ?? ''} ${selected.lastName ?? ''}`.trim() : 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{selected.email}</p>
            </div>
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'Company', value: selected.company },
              { label: 'Stage', value: <span className={`text-[10px] px-2 py-0.5 rounded-full ${STAGE_COLORS[selected.lifecycleStage]}`}>{selected.lifecycleStage}</span> },
              { label: 'Health Score', value: <span className={healthColor(selected.healthScore)}>{selected.healthScore}/100</span> },
              { label: 'Lifetime Value', value: `$${Number(selected.ltv).toFixed(2)}` },
              { label: 'Events', value: selected._count?.events ?? 0 },
              { label: 'Segments', value: selected._count?.segmentMembers ?? 0 },
              { label: 'Last Seen', value: new Date(selected.lastSeenAt).toLocaleDateString() },
            ].filter(r => r.value !== null && r.value !== undefined).map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
