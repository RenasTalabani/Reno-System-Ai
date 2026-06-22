'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, ChevronDown, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const actionColor = (action: string) => {
  if (action.startsWith('CREATE')) return 'success'
  if (action.startsWith('UPDATE')) return 'info'
  if (action.startsWith('DELETE')) return 'danger'
  if (action.startsWith('LOGIN')) return 'default'
  if (action.startsWith('LOGOUT')) return 'outline'
  return 'outline'
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filters, setFilters] = useState({ entityType: '', userId: '', from: '', to: '' })

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '20',
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => api.get(`/audit-logs?${queryParams}`).then(r => r.data),
  })

  const logs = data?.data ?? []
  const pagination = data?.meta?.pagination

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">Immutable record of all system events</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          placeholder="Filter by entity type"
          value={filters.entityType}
          onChange={(e) => { setFilters(f => ({ ...f, entityType: e.target.value })); setPage(1) }}
        />
        <Input
          placeholder="Filter by user ID"
          value={filters.userId}
          onChange={(e) => { setFilters(f => ({ ...f, userId: e.target.value })); setPage(1) }}
        />
        <Input
          type="datetime-local"
          value={filters.from}
          onChange={(e) => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1) }}
          label=""
        />
        <Input
          type="datetime-local"
          value={filters.to}
          onChange={(e) => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <TableSkeleton rows={8} cols={6} />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', expandedId === log.id && 'rotate-180')} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={actionColor(log.action) as any}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{log.entityType}</p>
                      <p className="text-xs text-muted-foreground font-mono">{log.entityId?.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">
                      {log.actorId ? `${log.actorId.slice(0, 8)}…` : <span className="text-muted-foreground">system</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(log.occurredAt)}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-muted/10">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.oldValues && (
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">Before</p>
                              <pre className="bg-muted rounded-lg p-3 overflow-auto text-foreground max-h-40">
                                {JSON.stringify(log.oldValues, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValues && (
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">After</p>
                              <pre className="bg-muted rounded-lg p-3 overflow-auto text-foreground max-h-40">
                                {JSON.stringify(log.newValues, null, 2)}
                              </pre>
                            </div>
                          )}
                          {!log.oldValues && !log.newValues && (
                            <p className="text-muted-foreground col-span-2">No value diff recorded</p>
                          )}
                        </div>
                        {log.userAgent && (
                          <p className="text-xs text-muted-foreground mt-2">UA: {log.userAgent}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {pagination.total} events · page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
