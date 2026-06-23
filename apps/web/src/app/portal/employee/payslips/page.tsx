'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Download, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Payslip {
  id: string
  period: string
  status: string
  currency: string
  basicSalary: number
  grossPay: number
  netPay: number
  processedAt?: string
  createdAt: string
}

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [selected, setSelected] = useState<Payslip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    fetch('/api/v1/portal/employee/payslips', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.success) setPayslips(data.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payslips</h1>
        <p className="text-sm text-gray-500 mt-1">View and download your payslips</p>
      </div>

      {!payslips.length ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payslips available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="space-y-2">
            {payslips.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={cn(
                  'w-full text-left border rounded-xl p-4 transition-all',
                  selected?.id === p.id
                    ? 'border-2 bg-white shadow-sm'
                    : 'border-gray-100 bg-white hover:shadow-sm',
                )}
                style={selected?.id === p.id ? { borderColor: 'var(--portal-primary, #6366f1)' } : undefined}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{p.period}</p>
                    <p className="text-sm text-gray-500">{p.currency} {Number(p.netPay).toLocaleString()} net</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', {
                      'bg-green-100 text-green-700': p.status === 'processed',
                      'bg-yellow-100 text-yellow-700': p.status === 'draft',
                    })}>
                      {p.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          {selected ? (
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Payslip — {selected.period}</h2>
                  {selected.processedAt && (
                    <p className="text-sm text-gray-500">Processed {new Date(selected.processedAt).toLocaleDateString()}</p>
                  )}
                </div>
                <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Basic Salary', value: Number(selected.basicSalary).toLocaleString() },
                    { label: 'Gross Pay', value: Number(selected.grossPay).toLocaleString() },
                  ].map(row => (
                    <div key={row.label} className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">{row.label}</p>
                      <p className="text-lg font-bold text-gray-900">{selected.currency} {row.value}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 text-lg">Net Pay</span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: 'var(--portal-primary, #6366f1)' }}
                    >
                      {selected.currency} {Number(selected.netPay).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white border border-dashed border-gray-200 rounded-2xl p-16 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Select a payslip to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
