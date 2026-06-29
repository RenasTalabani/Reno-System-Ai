'use client'
import { useState, useEffect } from 'react'
import { CalendarDays, Ticket, Users, CheckSquare, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { totalEvents: number; upcomingEvents: number; totalRegistrations: number; checkedIn: number }
interface Event { id: string; title: string; startsAt: string; endsAt: string; location: string | null; isVirtual: boolean; status: string; _count: { registrations: number; ticketTypes: number } }

const statusColor = (s: string) => ({ draft: 'bg-slate-500/10 text-slate-400', published: 'bg-emerald-500/10 text-emerald-400', cancelled: 'bg-red-500/10 text-red-400', completed: 'bg-blue-500/10 text-blue-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function EventManagementPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, e] = await Promise.all([
      fetch(`${API}/v1/events-mgmt/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/events-mgmt/`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setEvents(e.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><CalendarDays className="w-5 h-5 text-indigo-500" /> Event Management</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> Create Event</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: summary.totalEvents, icon: CalendarDays, color: 'text-blue-400' },
            { label: 'Upcoming', value: summary.upcomingEvents, icon: Ticket, color: 'text-indigo-400' },
            { label: 'Registrations', value: summary.totalRegistrations, icon: Users, color: 'text-amber-400' },
            { label: 'Checked In', value: summary.checkedIn, icon: CheckSquare, color: 'text-emerald-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {events.map(e => (
          <div key={e.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.startsAt).toLocaleDateString()} · {e.isVirtual ? 'Virtual' : (e.location ?? 'TBD')} · {e._count.registrations} registered
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span>
            </div>
          </div>
        ))}
        {!loading && events.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No events yet.</p>}
      </div>
    </div>
  )
}