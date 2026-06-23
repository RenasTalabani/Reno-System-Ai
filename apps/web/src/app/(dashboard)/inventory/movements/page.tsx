'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const TYPE_LABELS: Record<string, string> = {
  receipt: 'Receipt', issue: 'Issue',
  transfer_in: 'Transfer In', transfer_out: 'Transfer Out',
  adjustment_in: 'Adj +', adjustment_out: 'Adj −',
  opening: 'Opening', return_in: 'Return In', return_out: 'Return Out',
}
const TYPE_COLORS: Record<string, string> = {
  receipt: 'bg-green-500/10 text-green-500',
  issue: 'bg-red-500/10 text-red-500',
  transfer_in: 'bg-blue-500/10 text-blue-500',
  transfer_out: 'bg-orange-500/10 text-orange-500',
  adjustment_in: 'bg-green-500/10 text-green-600',
  adjustment_out: 'bg-red-500/10 text-red-600',
  opening: 'bg-purple-500/10 text-purple-500',
  return_in: 'bg-cyan-500/10 text-cyan-500',
  return_out: 'bg-pink-500/10 text-pink-500',
}
const IN_TYPES = new Set(['receipt', 'transfer_in', 'adjustment_in', 'opening', 'return_in'])

export default function MovementsPage() {
  const { token } = useAuthStore()
  const [movements, setMovements] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '100', page: '1' })
    if (type) params.set('type', type)
    const res = await fetch(`${API}/v1/inventory/movements?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) { setMovements(json.data); setTotal(json.meta?.pagination?.total ?? 0) }
    setLoading(false)
  }

  useEffect(() => { load() }, [token, type])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Movements</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total movements — immutable ledger</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Filter by movement type"
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none">
          <option value="">All Types</option>
          <option value="receipt">Receipt</option>
          <option value="issue">Issue</option>
          <option value="transfer_in">Transfer In</option>
          <option value="transfer_out">Transfer Out</option>
          <option value="adjustment_in">Adjustment +</option>
          <option value="adjustment_out">Adjustment −</option>
          <option value="opening">Opening Balance</option>
          <option value="return_in">Return In</option>
          <option value="return_out">Return Out</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Number</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Product</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">From</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">To</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : movements.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No movements recorded yet
              </td></tr>
            ) : movements.map(m => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-indigo-500">{m.number}</td>
                <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                  {new Date(m.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${TYPE_COLORS[m.type] ?? 'bg-muted text-muted-foreground'}`}>
                    {TYPE_LABELS[m.type] ?? m.type}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-foreground">{m.product?.name}</p>
                  <p className="text-xs text-muted-foreground">{m.product?.code}</p>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs">{m.fromWarehouse?.name ?? '—'}</td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs">{m.toWarehouse?.name ?? '—'}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`font-bold tabular-nums ${IN_TYPES.has(m.type) ? 'text-green-500' : 'text-red-500'}`}>
                    {IN_TYPES.has(m.type) ? '+' : '−'}{Number(m.quantity).toLocaleString()}
                  </span>
                  {m.product?.unit?.symbol && <span className="text-xs text-muted-foreground ml-1">{m.product.unit.symbol}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
