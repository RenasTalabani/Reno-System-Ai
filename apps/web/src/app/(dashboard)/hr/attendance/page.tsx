'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface AttendanceRecord {
  id: string
  date: string
  status: string
  checkIn?: string
  checkOut?: string
  workingHours?: number
  source: string
  employee: { id: string; firstName: string; lastName: string; employeeCode: string }
}

const statusVariant: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  present: 'success', absent: 'danger', late: 'warning', half_day: 'warning',
  remote: 'info' as any, on_leave: 'default',
}

export default function AttendancePage() {
  const { token } = useAuthStore()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Record<string, number>>({})
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), from, to })
      if (status) params.set('status', status)
      const [recRes, sumRes] = await Promise.all([
        fetch(`${API}/v1/hr/attendance?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/v1/hr/attendance/summary?year=${new Date(from).getFullYear()}&month=${new Date(from).getMonth() + 1}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const recData = await recRes.json()
      const sumData = await sumRes.json()
      if (recData.success) { setRecords(recData.data); setTotal(recData.meta?.pagination?.total ?? 0) }
      if (sumData.success) {
        const allStatus: Record<string, number> = {}
        Object.values(sumData.data.summary).forEach((emp: any) => {
          Object.entries(emp).forEach(([s, c]) => { allStatus[s] = (allStatus[s] ?? 0) + Number(c) })
        })
        setSummary(allStatus)
      }
    } finally {
      setLoading(false)
    }
  }, [token, page, status, from, to])

  useEffect(() => { if (token) load() }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily attendance tracking and approval</p>
      </div>

      {/* Summary badges */}
      {Object.keys(summary).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(summary).map(([s, c]) => (
            <div key={s} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <Badge variant={statusVariant[s] ?? 'default'} className="capitalize">{s.replace('_', ' ')}</Badge>
              <span className="text-sm font-semibold text-foreground">{c}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          <option value="">All statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="half_day">Half Day</option>
          <option value="remote">Remote</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check In</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check Out</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hours</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-muted/50 rounded animate-pulse" /></td></tr>
              ))
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No attendance records found</td></tr>
            ) : (
              records.map(r => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-semibold text-indigo-500 shrink-0">
                        {getInitials(r.employee.firstName, r.employee.lastName)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{r.employee.firstName} {r.employee.lastName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.employee.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-foreground/80">{r.workingHours ? `${r.workingHours}h` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{r.source}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[r.status] ?? 'default'} className="capitalize">{r.status.replace('_', ' ')}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} records</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
