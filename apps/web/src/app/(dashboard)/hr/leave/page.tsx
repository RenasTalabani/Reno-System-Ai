'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface LeaveRequest {
  id: string; status: string; startDate: string; endDate: string; totalDays: number
  reason?: string; isHalfDay: boolean; createdAt: string
  employee: { id: string; firstName: string; lastName: string; employeeCode: string }
  leaveType: { id: string; name: string; color: string }
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success', pending: 'warning', rejected: 'danger', cancelled: 'default',
}

export default function LeavePage() {
  const { token } = useAuthStore()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (status) params.set('status', status)
      const res = await fetch(`${API}/v1/hr/leave/requests?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) { setRequests(data.data); setTotal(data.meta?.pagination?.total ?? 0) }
    } finally {
      setLoading(false)
    }
  }, [token, page, status])

  useEffect(() => { if (token) load() }, [load])

  const handleApprove = async (id: string) => {
    setActionId(id)
    try {
      await fetch(`${API}/v1/hr/leave/requests/${id}/approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
      load()
    } finally { setActionId(null) }
  }

  const handleReject = async (id: string) => {
    setActionId(id)
    try {
      await fetch(`${API}/v1/hr/leave/requests/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: 'Rejected by manager' }),
      })
      load()
    } finally { setActionId(null) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and manage employee leave requests</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${status === s ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Leave Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              {status === 'pending' && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-muted/50 rounded animate-pulse" /></td></tr>)
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No leave requests found</td></tr>
            ) : (
              requests.map(req => (
                <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-semibold text-indigo-500 shrink-0">
                        {getInitials(req.employee.firstName, req.employee.lastName)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{req.employee.firstName} {req.employee.lastName}</p>
                        <p className="text-xs text-muted-foreground">{req.employee.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: req.leaveType.color }} />
                      {req.leaveType.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">
                    {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                    {req.isHalfDay && <span className="ml-1 text-xs text-muted-foreground">(half day)</span>}
                  </td>
                  <td className="px-4 py-3 font-medium">{Number(req.totalDays)}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[req.status] ?? 'default'} className="capitalize">{req.status}</Badge></td>
                  {status === 'pending' && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionId === req.id}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionId === req.id}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
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
