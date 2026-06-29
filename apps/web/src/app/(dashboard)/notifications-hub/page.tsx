'use client'
import { useState, useEffect } from 'react'
import { Bell, Send, AlertCircle, Activity, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { activeTemplates: number; sentToday: number; failedCount: number; deliveryRate: number }
interface LogEntry { id: string; channel: string; recipient: string; status: string; createdAt: string; template: { name: string } | null }

const statusColor = (s: string) => ({ sent: 'bg-emerald-500/10 text-emerald-400', failed: 'bg-red-500/10 text-red-400', pending: 'bg-amber-500/10 text-amber-400' }[s] ?? 'bg-slate-500/10 text-slate-400')
const channelIcon = (c: string) => c === 'email' ? '📧' : c === 'sms' ? '📱' : c === 'push' ? '🔔' : '💬'

export default function NotificationsHubPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, l] = await Promise.all([
      fetch(`${API}/v1/notifications-hub/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/notifications-hub/logs`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setLogs(l.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Bell className="w-5 h-5 text-indigo-500" /> Notifications Hub</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Template</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Active Templates', value: summary.activeTemplates, icon: Bell, color: 'text-blue-400' },
            { label: 'Sent Today', value: summary.sentToday, icon: Send, color: 'text-emerald-400' },
            { label: 'Failed', value: summary.failedCount, icon: AlertCircle, color: 'text-red-400' },
            { label: 'Delivery Rate', value: summary.deliveryRate + '%', icon: Activity, color: 'text-indigo-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {logs.map(l => (
          <div key={l.id} className="bg-card border border-border rounded-xl px-5 py-4 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{channelIcon(l.channel)}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{l.recipient}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.template?.name ?? 'Direct'} · {new Date(l.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(l.status)}`}>{l.status}</span>
            </div>
          </div>
        ))}
        {!loading && logs.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No notification logs yet.</p>}
      </div>
    </div>
  )
}