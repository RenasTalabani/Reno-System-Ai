'use client'
import { useState, useEffect } from 'react'
import { Truck, Package, ReceiptText, Users, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface PO { id: string; poNumber: string; status: string; total: number; currency: string; supplier: { name: string }; orderDate: string; expectedDate: string | null }
interface Summary { suppliers: number; openPOs: number; pendingReceipts: number }

const statusColor = (s: string) => ({ draft: 'text-slate-400', pending: 'text-amber-400', approved: 'text-blue-400', received: 'text-emerald-400', cancelled: 'text-red-400' }[s] ?? 'text-slate-400')

export default function SupplyChainPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [orders, setOrders] = useState<PO[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, o] = await Promise.all([
      fetch(`${API}/v1/scm/summary`, { headers: h }).then(r => r.json()),
      fetch(`${API}/v1/scm/purchase-orders`, { headers: h }).then(r => r.json()),
    ])
    setSummary(s.data); setOrders(o.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-500" /> Supply Chain Management</h1>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 border border-border text-foreground text-sm px-4 py-2 rounded-lg hover:bg-muted transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Active Suppliers', value: summary.suppliers, icon: Users }, { label: 'Open POs', value: summary.openPOs, icon: Package }, { label: 'Pending Receipts', value: summary.pendingReceipts, icon: ReceiptText }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <c.icon className="w-8 h-8 text-indigo-400" />
              <div><p className="text-2xl font-bold text-foreground">{c.value}</p><p className="text-xs text-muted-foreground">{c.label}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" /> Purchase Orders</h2>
          <button className="flex items-center gap-1 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors"><Plus className="w-3 h-3" /> New PO</button>
        </div>
        <div className="divide-y divide-border">
          {orders.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No purchase orders yet</p>}
          {orders.map(po => (
            <div key={po.id} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{po.poNumber}</span>
                  <span className={`text-xs font-medium ${statusColor(po.status)}`}>{po.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{po.supplier.name} · {new Date(po.orderDate).toLocaleDateString()}</p>
              </div>
              <span className="text-sm font-bold text-foreground">{po.currency} {Number(po.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
