'use client'

import { useState, useEffect } from 'react'
import { Activity, Search, RefreshCw, Clock, User, Layers } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Event { id: string; type: string; aggregateType: string; aggregateId: string; version: number; actorType: string; actorId: string | null; occurredAt: string; payload: unknown }
interface TypeCount { type: string; _count: { type: number } }
interface Timeline { events: Event[]; byType: TypeCount[]; totalEvents: number }

export default function EventSourcingPage() {
  const { token } = useAuthStore()
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Event | null>(null)

  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (typeFilter) q.set('type', typeFilter)
    const res = await fetch(`${API}/v1/evs/timeline?${q}`, { headers: h }).then(r => r.json())
    setTimeline(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [typeFilter, token])

  const timeAgo = (dt: string) => {
    const s = Math.round((Date.now() - new Date(dt).getTime()) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.round(s / 60)}m ago`
    return `${Math.round(s / 3600)}h ago`
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Event Sourcing & Audit Trail
          </h1>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 border border-border text-foreground text-sm px-4 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {timeline && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold text-foreground">{timeline.totalEvents}</p>
              <p className="text-xs text-muted-foreground">Events (24h)</p>
            </div>
            {timeline.byType.slice(0, 3).map(t => (
              <div key={t.type} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => setTypeFilter(typeFilter === t.type ? '' : t.type)}>
                <p className="text-2xl font-bold text-foreground">{t._count.type}</p>
                <p className="text-xs text-muted-foreground truncate">{t.type.split('.').pop()}</p>
              </div>
            ))}
          </div>
        )}

        {timeline?.byType && timeline.byType.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setTypeFilter('')} className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${!typeFilter ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted-foreground'}`}>All</button>
            {timeline.byType.map(t => (
              <button key={t.type} onClick={() => setTypeFilter(typeFilter === t.type ? '' : t.type)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${typeFilter === t.type ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted-foreground'}`}>
                {t.type}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          {timeline?.events.map(e => (
            <div key={e.id} onClick={() => setSelected(selected?.id === e.id ? null : e)}
              className={`bg-card border rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-500/50 transition-colors flex items-center gap-3 ${selected?.id === e.id ? 'border-indigo-500' : 'border-border'}`}>
              <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-indigo-400">{e.type}</span>
                  <span className="text-[10px] text-muted-foreground">{e.aggregateType}:{e.aggregateId.slice(0, 8)}</span>
                  <span className="text-[10px] bg-muted text-muted-foreground px-1 rounded">v{e.version}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
                <User className="w-3 h-3" />{e.actorType}
                <Clock className="w-3 h-3 ml-1" />{timeAgo(e.occurredAt)}
              </div>
            </div>
          ))}
          {timeline?.events.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No events in the last 24 hours</p>}
        </div>
      </div>

      {selected && (
        <div className="w-96 shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-foreground text-sm">{selected.type}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{selected.aggregateType} · {selected.aggregateId}</p>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Version', value: `v${selected.version}` },
              { label: 'Actor', value: `${selected.actorType}${selected.actorId ? ` (${selected.actorId.slice(0, 8)})` : ''}` },
              { label: 'Occurred', value: new Date(selected.occurredAt).toLocaleString() },
            ].map(row => (
              <div key={row.label} className="flex justify-between">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium text-right">{row.value}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Layers className="w-3 h-3" /> Payload</p>
            <pre className="bg-background border border-border rounded-lg p-3 text-[11px] text-foreground overflow-auto max-h-48">{JSON.stringify(selected.payload, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
