'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Payslip {
  id: string; month: number; year: number; status: string
  basicSalary: number; grossSalary: number; netSalary: number
  currency: string; paidAt?: string
  employee: { id: string; firstName: string; lastName: string; employeeCode: string }
  grade?: { name: string }
}

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  paid: 'success', processed: 'info' as any, draft: 'default', cancelled: 'danger' as any,
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function PayrollPage() {
  const { token } = useAuthStore()
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [year, setYear] = useState<string>(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (status) params.set('status', status)
      if (month) params.set('month', month)
      if (year) params.set('year', year)
      const [listRes, sumRes] = await Promise.all([
        fetch(`${API}/v1/hr/payroll/payslips?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/v1/hr/payroll/summary?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const listData = await listRes.json()
      const sumData = await sumRes.json()
      if (listData.success) { setPayslips(listData.data); setTotal(listData.meta?.pagination?.total ?? 0) }
      if (sumData.success) setSummary(sumData.data)
    } finally {
      setLoading(false)
    }
  }, [token, page, status, month, year])

  useEffect(() => { if (token) load() }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
        <p className="text-muted-foreground text-sm mt-1">Payslip management — draft, process, and mark paid</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Payslips', value: summary.count, icon: DollarSign, color: 'bg-indigo-500' },
            { label: 'Total Gross', value: `$${Number(summary.totalGross).toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500' },
            { label: 'Total Net', value: `$${Number(summary.totalNet).toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
            { label: 'Total Tax', value: `$${Number(summary.totalTax).toLocaleString()}`, icon: DollarSign, color: 'bg-red-500' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select value={month} onChange={e => { setMonth(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
        </select>
        <select value={year} onChange={e => { setYear(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="processed">Processed</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Basic</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-muted/50 rounded animate-pulse" /></td></tr>)
            ) : payslips.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No payslips found for this period</td></tr>
            ) : (
              payslips.map(p => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-semibold text-indigo-500">{getInitials(p.employee.firstName, p.employee.lastName)}</div>
                      <div>
                        <p className="font-medium text-foreground">{p.employee.firstName} {p.employee.lastName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.employee.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{MONTHS[p.month - 1]} {p.year}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.grade?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">${Number(p.basicSalary).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">${Number(p.grossSalary).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">${Number(p.netSalary).toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={(statusVariant[p.status] ?? 'default') as any} className="capitalize">{p.status}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
