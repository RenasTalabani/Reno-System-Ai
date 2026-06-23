'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-500',
  confirmed: 'bg-green-500/10 text-green-500',
  cancelled: 'bg-muted text-muted-foreground',
}
const TYPE_LABELS: Record<string, string> = {
  correction: 'Correction', cycle_count: 'Cycle Count',
  damage: 'Damage', expiry: 'Expiry', opening_balance: 'Opening Balance',
}

export default function AdjustmentsPage() {
  const { token } = useAuthStore()
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '50', page: '1' })
    if (status) params.set('status', status)
    const res = await fetch(`${API}/v1/inventory/adjustments?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) { setAdjustments(json.data); setTotal(json.meta?.pagination?.total ?? 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [token, status])

  const confirm = async (id: string) => {
    if (!confirm(`Confirm this adjustment? Stock balances will be updated.`)) return
    await fetch(`${API}/v1/inventory/adjustments/${id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Adjustments</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} adjustments total</p>
        </div>
        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Adjustment
        </button>
      </div>

      <div className="flex gap-3">
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status"
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Number</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Warehouse</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">Lines</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : adjustments.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No adjustments yet
              </td></tr>
            ) : adjustments.map(a => (
              <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-indigo-500">{a.number}</td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {new Date(a.adjustmentDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground capitalize">{TYPE_LABELS[a.type] ?? a.type}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{a.warehouse?.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right text-muted-foreground">{a._count?.lines ?? 0}</td>
                <td className="px-5 py-3.5 text-right">
                  {a.status === 'draft' && (
                    <button type="button" onClick={() => confirm(a.id)}
                      className="text-xs px-3 py-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition-colors">
                      Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
