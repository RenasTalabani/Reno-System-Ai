'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-500',
  posted: 'bg-green-500/10 text-green-500',
  void: 'bg-muted text-muted-foreground',
}

const TYPE_LABELS: Record<string, string> = {
  general: 'General', sales: 'Sales', purchase: 'Purchase', payment: 'Payment',
  bank: 'Bank', adjustment: 'Adjustment', opening: 'Opening', closing: 'Closing',
}

export default function JournalsPage() {
  const { token } = useAuthStore()
  const [entries, setEntries] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '50', page: '1' })
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    if (search) params.set('search', search)
    const res = await fetch(`${API}/v1/finance/journal-entries?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) { setEntries(json.data); setTotal(json.meta?.pagination?.total ?? 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [token, status, type])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal Entries</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} entries total</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by number or reference..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status"
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="void">Void</option>
        </select>
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type"
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none">
          <option value="">All Types</option>
          <option value="general">General</option>
          <option value="sales">Sales</option>
          <option value="purchase">Purchase</option>
          <option value="payment">Payment</option>
          <option value="bank">Bank</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Number</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Description</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">Lines</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No journal entries yet
              </td></tr>
            ) : entries.map(e => (
              <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5 font-mono font-medium text-indigo-500">{e.number}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{new Date(e.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className="px-5 py-3.5 text-muted-foreground capitalize">{TYPE_LABELS[e.type] ?? e.type}</td>
                <td className="px-5 py-3.5 text-foreground max-w-xs truncate">{e.description ?? e.reference ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[e.status] ?? 'bg-muted text-muted-foreground'}`}>{e.status}</span>
                </td>
                <td className="px-5 py-3.5 text-right text-muted-foreground">{e._count?.lines ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
