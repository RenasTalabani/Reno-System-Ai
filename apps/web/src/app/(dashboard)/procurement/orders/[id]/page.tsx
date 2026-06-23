'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Send, Package } from 'lucide-react'

interface OrderLine {
  id: string
  productCode: string | null
  description: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  discountPercent: number
  taxPercent: number
}

interface Order {
  id: string
  number: string
  status: string
  currency: string
  supplier: { name: string; code: string; email: string | null; phone: string | null }
  requisition: { number: string; title: string } | null
  rfq: { number: string } | null
  lines: OrderLine[]
  approvals: { id: string; approverId: string; level: number; action: string; notes: string | null; createdAt: string }[]
  invReceipt: { id: string; number: string; status: string } | null
  subtotal: number
  taxAmount: number
  shippingCost: number
  discountAmount: number
  totalAmount: number
  paymentTerms: string | null
  deliveryTerms: string | null
  expectedDate: string | null
  sentAt: string | null
  receivedAt: string | null
  approvedAt: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  sent: 'bg-purple-100 text-purple-700',
  partially_received: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = () => {
    fetch(`/api/v1/procurement/orders/${params.id}`)
      .then(r => r.json())
      .then(d => setOrder(d.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [params.id])

  const act = async (action: string, body: object = {}) => {
    setActing(true)
    await fetch(`/api/v1/procurement/orders/${params.id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    load()
    setActing(false)
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>
  if (!order) return <div className="p-6 text-gray-500">Order not found</div>

  const fmt = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 text-gray-400 hover:text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{order.number}</h1>
            <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {order.supplier.name}
            {order.requisition && ` · REQ: ${order.requisition.number}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {order.status === 'draft' && (
            <button onClick={() => act('submit')} disabled={acting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Submit for Approval
            </button>
          )}
          {order.status === 'pending_approval' && (
            <>
              <button onClick={() => act('approve', { level: 1 })} disabled={acting}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={() => act('reject', { reason: 'Rejected by approver' })} disabled={acting}
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          {order.status === 'approved' && (
            <button onClick={() => act('send')} disabled={acting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50">
              <Send size={14} /> Send to Supplier
            </button>
          )}
          {['approved', 'sent', 'partially_received'].includes(order.status) && (
            <button onClick={() => act('receive')} disabled={acting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Package size={14} /> Receive Goods
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Lines */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Order Lines</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-2 font-medium text-gray-500">Item</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Unit Price</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.lines.map(l => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{l.description ?? l.productCode ?? '—'}</p>
                      {l.productCode && l.description && <p className="text-xs text-gray-400">{l.productCode}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{Number(l.quantity)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{order.currency} {fmt(Number(l.unitPrice))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{order.currency} {fmt(Number(l.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals */}
            <div className="border-t border-gray-100 px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{order.currency} {fmt(Number(order.subtotal))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span><span>-{order.currency} {fmt(Number(order.discountAmount))}</span>
                </div>
              )}
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span><span>{order.currency} {fmt(Number(order.taxAmount))}</span>
                </div>
              )}
              {Number(order.shippingCost) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span><span>{order.currency} {fmt(Number(order.shippingCost))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                <span>Total</span><span>{order.currency} {fmt(Number(order.totalAmount))}</span>
              </div>
            </div>
          </div>

          {/* Approvals */}
          {order.approvals.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Approval History</h2>
              <div className="space-y-2">
                {order.approvals.map(a => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.action === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {a.action}
                    </span>
                    <span className="text-gray-500">Level {a.level}</span>
                    {a.notes && <span className="text-gray-400">· {a.notes}</span>}
                    <span className="ml-auto text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receipt link */}
          {order.invReceipt && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <Package size={16} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Goods Receipt Created</p>
                <p className="text-xs text-green-600">Receipt: {order.invReceipt.number} · Status: {order.invReceipt.status}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-gray-900">Order Details</h3>
            <div><p className="text-gray-400">Supplier</p><p className="font-medium">{order.supplier.name}</p></div>
            {order.supplier.email && <div><p className="text-gray-400">Email</p><p>{order.supplier.email}</p></div>}
            {order.paymentTerms && <div><p className="text-gray-400">Payment Terms</p><p>{order.paymentTerms}</p></div>}
            {order.deliveryTerms && <div><p className="text-gray-400">Delivery Terms</p><p>{order.deliveryTerms}</p></div>}
            {order.expectedDate && <div><p className="text-gray-400">Expected Date</p><p>{new Date(order.expectedDate).toLocaleDateString()}</p></div>}
            {order.approvedAt && <div><p className="text-gray-400">Approved</p><p>{new Date(order.approvedAt).toLocaleDateString()}</p></div>}
            {order.receivedAt && <div><p className="text-gray-400">Received</p><p>{new Date(order.receivedAt).toLocaleDateString()}</p></div>}
            <div><p className="text-gray-400">Created</p><p>{new Date(order.createdAt).toLocaleDateString()}</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
