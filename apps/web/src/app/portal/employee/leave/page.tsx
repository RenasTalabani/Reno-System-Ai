'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaveRequest {
  id: string
  startDate: string
  endDate: string
  days: number
  status: string
  notes?: string
  leaveType?: { name: string; color?: string }
}

interface LeaveBalance {
  id: string
  balance: number
  used: number
  leaveType?: { name: string }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', {
      'bg-yellow-100 text-yellow-700': status === 'pending',
      'bg-green-100 text-green-700': status === 'approved',
      'bg-red-100 text-red-700': status === 'rejected',
      'bg-gray-100 text-gray-600': status === 'cancelled',
    })}>
      {status}
    </span>
  )
}

export default function EmployeeLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])

  const token = () => localStorage.getItem('accessToken') ?? ''

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` }
    Promise.all([
      fetch('/api/v1/portal/employee/leave', { headers }).then(r => r.json()),
      fetch('/api/v1/hr/leave-types', { headers }).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([leave, types]) => {
      if (leave.success) { setRequests(leave.data.requests); setBalances(leave.data.balances) }
      if (types.success) setLeaveTypes(types.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const submitRequest = async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/portal/employee/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setRequests(prev => [data.data, ...prev])
        setShowForm(false)
        setForm({ leaveTypeId: '', startDate: '', endDate: '', notes: '' })
      }
    } finally { setSubmitting(false) }
  }

  const cancelRequest = async (id: string) => {
    const res = await fetch(`/api/v1/portal/employee/leave/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    if (data.success) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
    }
  }

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter)

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your time-off requests</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: 'var(--portal-primary, #6366f1)' }}
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {/* Leave Balance Cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {balances.map((b) => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{b.leaveType?.name ?? 'Leave'}</p>
              <p className="text-2xl font-bold text-gray-900">{b.balance}</p>
              <p className="text-xs text-gray-400">{b.used} used this year</p>
            </div>
          ))}
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">New Leave Request</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Leave Type *</label>
              <select
                value={form.leaveTypeId}
                onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select type...</option>
                {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional reason or notes..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={submitRequest}
              disabled={submitting || !form.leaveTypeId || !form.startDate || !form.endDate}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--portal-primary, #6366f1)' }}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
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

      {/* Requests List */}
      {!filtered.length ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No leave requests</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{req.leaveType?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(req.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(req.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{req.days}</td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3">
                    {req.status === 'pending' && (
                      <button onClick={() => cancelRequest(req.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
