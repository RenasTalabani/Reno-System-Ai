'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Ticket, Search, Filter, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
}

const STATUSES = ['', 'open', 'in_progress', 'waiting', 'resolved', 'closed']
const PRIORITIES = ['', 'critical', 'high', 'medium', 'low']

export default function TicketsPage() {
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [priority, setPriority] = useState(searchParams.get('priority') ?? '')
  const [slaBreached, setSlaBreached] = useState(searchParams.get('slaBreached') === 'true')
  const limit = 25

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search && { search }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(slaBreached && { slaBreached: 'true' }),
    })

    fetch(`/api/v1/helpdesk/tickets?${params}`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => r.json()).then(res => {
      if (res.success) {
        setTickets(res.data)
        setTotal(res.meta?.pagination?.total ?? 0)
      }
    }).finally(() => setLoading(false))
  }, [page, search, status, priority, slaBreached])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total tickets</p>
        </div>
        <Link href="/helpdesk/tickets/new" className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          + New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              placeholder="Search tickets..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="flex-1 text-sm focus:outline-none"
            />
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Statuses'}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{p ? p : 'All Priorities'}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={slaBreached}
              onChange={e => { setSlaBreached(e.target.checked); setPage(1) }}
              className="w-4 h-4 text-red-500 rounded"
            />
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> SLA Breached
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : !tickets.length ? (
          <div className="p-12 text-center">
            <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No tickets found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ticket</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SLA</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/helpdesk/tickets/${t.id}`} className="font-mono text-xs text-indigo-600 hover:text-indigo-700">
                        {t.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <Link href={`/helpdesk/tickets/${t.id}`} className="text-gray-800 hover:text-indigo-600 line-clamp-1 text-sm">
                        {t.subject}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{t.source?.replace('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? ''}`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.agent?.displayName ?? 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      {t.slaBreached ? (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertTriangle className="w-3 h-3" /> Breached
                        </span>
                      ) : t.resolutionDue ? (
                        <span className="text-xs text-gray-400">
                          Due {new Date(t.resolutionDue).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} tickets)</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
