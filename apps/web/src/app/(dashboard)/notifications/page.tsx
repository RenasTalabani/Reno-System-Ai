'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Bell, CheckCheck, Mail, Smartphone, Monitor } from 'lucide-react'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'

const channelIcon = (channel: string) => {
  if (channel === 'email') return <Mail className="w-4 h-4" />
  if (channel === 'push') return <Smartphone className="w-4 h-4" />
  if (channel === 'in_app') return <Monitor className="w-4 h-4" />
  return <Bell className="w-4 h-4" />
}

const channelLabel = (channel: string) => {
  if (channel === 'in_app') return 'In-App'
  return channel.charAt(0).toUpperCase() + channel.slice(1)
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => api.get(`/notifications?${filter === 'unread' ? 'unread=true' : ''}`).then(r => r.data.data ?? []),
    retry: false,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data ?? []
  const unreadCount = notifications.filter((n: any) => !n.readAt).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition capitalize ${
              filter === f
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={1} /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Bell className="w-10 h-10 opacity-30" />
            <p className="text-sm">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                className={cn(
                  'flex gap-4 px-4 py-4 hover:bg-muted/20 transition-colors',
                  !n.readAt && 'bg-primary/5'
                )}
              >
                <div className={cn('mt-0.5 text-muted-foreground shrink-0', !n.readAt && 'text-primary')}>
                  {channelIcon(n.channel)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm', !n.readAt ? 'font-semibold text-foreground' : 'text-foreground')}>
                      {n.title ?? n.type}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">{formatRelative(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline">{channelLabel(n.channel)}</Badge>
                    {n.readAt ? (
                      <span className="text-xs text-muted-foreground">Read</span>
                    ) : (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
