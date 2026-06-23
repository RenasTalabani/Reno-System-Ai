'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Invoice {
  id: string
  number: string
  status: string
  totalAmount: number
  currency: string
  dueDate?: string
  issuedDate?: string
  paidAt?: string
  createdAt: string
}

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const url = statusFilter === 'all' ? '/api/v1/portal/customer/invoices' : `/api/v1/portal/customer/invoices?status=${statusFilter}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setInvoices(d.data) })
      .finally(() => setLoading(false))
  }, [statusFilter])

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">View and download your invoices</p>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors', {
              'text-white': statusFilter === s,
              'bg-gray-100 text-gray-600 hover:bg-gray-200': statusFilter !== s,
            })}
            style={statusFilter === s ? { backgroundColor: 'var(--portal-primary, #6366f1)' } : undefined}
          >
            {s}
          </button>
        ))}
      </div>

      {!invoices.length ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No invoices found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Issued</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{inv.number}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{inv.currency} {Number(inv.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', {
                      'bg-green-100 text-green-700': inv.status === 'paid',
                      'bg-red-100 text-red-700': inv.status === 'overdue',
                      'bg-blue-100 text-blue-700': inv.status === 'sent',
                      'bg-gray-100 text-gray-600': inv.status === 'draft',
                    })}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1 hover:bg-gray-100 rounded"><Download className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
