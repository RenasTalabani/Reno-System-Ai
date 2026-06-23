'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-500',
  partial: 'bg-amber-500/10 text-amber-500',
  paid: 'bg-green-500/10 text-green-500',
  overdue: 'bg-red-500/10 text-red-500',
  void: 'bg-muted text-muted-foreground',
}

export default function InvoiceDetailPage() {
  const { token } = useAuthStore()
  const { id } = useParams() as { id: string }
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = async () => {
    if (!token) return
    const res = await fetch(`${API}/v1/sales/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) setInvoice(json.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [token, id])

  const action = async (endpoint: string) => {
    if (!token || acting) return
    setActing(true)
    await fetch(`${API}/v1/sales/invoices/${id}/${endpoint}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' })
    await load()
    setActing(false)
  }

  const fmt = (v: number | string) => `$${Number(v).toFixed(2)}`

  if (loading) return <div className="p-8"><div className="h-64 bg-card border border-border rounded-xl animate-pulse" /></div>
  if (!invoice) return <div className="p-8 text-muted-foreground">Invoice not found</div>

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/sales/invoices" className="p-2 hover:bg-muted rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground font-mono">{invoice.number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[invoice.status] ?? 'bg-muted text-muted-foreground'}`}>{invoice.status}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <button onClick={() => action('send')} disabled={acting} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'partial' || invoice.status === 'overdue') && (
            <button onClick={() => action('mark-paid')} disabled={acting} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
            </button>
          )}
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <button onClick={() => action('void')} disabled={acting} className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-muted-foreground border border-border rounded-lg hover:bg-muted/70 disabled:opacity-50">
              <XCircle className="w-3.5 h-3.5" /> Void
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: fmt(invoice.total), color: 'text-foreground' },
          { label: 'Amount Paid', value: fmt(invoice.amountPaid ?? 0), color: 'text-green-500' },
          { label: 'Amount Due', value: fmt(invoice.amountDue ?? 0), color: Number(invoice.amountDue) > 0 ? 'text-amber-500' : 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
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
              <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Tax</th>
              <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(invoice.items ?? []).map((item: any) => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{Number(item.quantity)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmt(item.unitPrice)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{Number(item.taxRate) > 0 ? `${Number(item.taxRate)}%` : '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t border-border bg-muted/10 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{fmt(invoice.subtotal)}</span></div>
          {Number(invoice.discountTotal) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="tabular-nums text-green-500">-{fmt(invoice.discountTotal)}</span></div>}
          {Number(invoice.taxTotal) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{fmt(invoice.taxTotal)}</span></div>}
          <div className="flex justify-between font-semibold text-base border-t border-border pt-2 mt-2"><span>Total</span><span className="tabular-nums">{fmt(invoice.total)}</span></div>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Payment History</h2>
        </div>
        {(invoice.payments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No payments recorded</p>
        ) : (
          <div className="space-y-2">
            {invoice.payments.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{fmt(p.amount)} {p.currency}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.method?.replace('_', ' ')} {p.reference ? `· ${p.reference}` : ''}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(p.paidAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
