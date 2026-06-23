'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle, XCircle, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-500',
  viewed: 'bg-purple-500/10 text-purple-500',
  accepted: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
  expired: 'bg-amber-500/10 text-amber-500',
}

export default function QuotationDetailPage() {
  const { token } = useAuthStore()
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [quotation, setQuotation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = async () => {
    if (!token) return
    const res = await fetch(`${API}/v1/sales/quotations/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) setQuotation(json.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [token, id])

  const action = async (endpoint: string, method = 'PATCH') => {
    if (!token || acting) return
    setActing(true)
    await fetch(`${API}/v1/sales/quotations/${id}/${endpoint}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' })
    await load()
    setActing(false)
  }

  const convert = async () => {
    if (!token || acting) return
    setActing(true)
    const res = await fetch(`${API}/v1/sales/quotations/${id}/convert`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' })
    const json = await res.json()
    setActing(false)
    if (json.success) router.push(`/sales/orders`)
  }

  const fmt = (v: number | string) => `$${Number(v).toFixed(2)}`

  if (loading) return <div className="p-8"><div className="h-64 bg-card border border-border rounded-xl animate-pulse" /></div>
  if (!quotation) return <div className="p-8 text-muted-foreground">Quotation not found</div>

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/sales/quotations" className="p-2 hover:bg-muted rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground font-mono">{quotation.number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[quotation.status] ?? 'bg-muted text-muted-foreground'}`}>{quotation.status}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Created {new Date(quotation.createdAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          {quotation.status === 'draft' && (
            <button onClick={() => action('send')} disabled={acting} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          )}
          {(quotation.status === 'sent' || quotation.status === 'viewed') && (
            <>
              <button onClick={() => action('accept')} disabled={acting} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> Accept
              </button>
              <button onClick={() => action('reject')} disabled={acting} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}
          {quotation.status === 'accepted' && !quotation.convertedToOrderId && (
            <button onClick={convert} disabled={acting} className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50">
              <ShoppingCart className="w-3.5 h-3.5" /> Convert to Order
            </button>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-foreground">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left px-5 py-2.5 text-muted-foreground font-medium">Product</th>
              <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Qty</th>
              <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Unit Price</th>
              <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Discount</th>
              <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Tax</th>
              <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(quotation.items ?? []).map((item: any) => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{Number(item.quantity)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmt(item.unitPrice)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{Number(item.discount) > 0 ? `${Number(item.discount)}%` : '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{Number(item.taxRate) > 0 ? `${Number(item.taxRate)}%` : '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t border-border bg-muted/10 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{fmt(quotation.subtotal)}</span></div>
          {Number(quotation.discountTotal) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="tabular-nums text-green-500">-{fmt(quotation.discountTotal)}</span></div>}
          {Number(quotation.taxTotal) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{fmt(quotation.taxTotal)}</span></div>}
          <div className="flex justify-between font-semibold text-base border-t border-border pt-2 mt-2"><span>Total</span><span className="tabular-nums">{fmt(quotation.total)}</span></div>
        </div>
      </div>

      {/* Orders */}
      {(quotation.orders ?? []).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-3">Converted Orders</h2>
          <div className="space-y-2">
            {quotation.orders.map((o: any) => (
              <Link key={o.id} href="/sales/orders" className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <ShoppingCart className="w-4 h-4 text-indigo-500" />
                <span className="font-mono font-medium text-indigo-500">{o.number}</span>
                <span className="text-sm text-muted-foreground capitalize">{o.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
