'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortalNotification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

export default function PortalNotificationsPage() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([])
  const [loading, setLoading] = useState(true)

  const token = () => localStorage.getItem('accessToken') ?? ''

  useEffect(() => {
    fetch('/api/v1/portal/notifications', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setNotifications(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const markAllRead = async () => {
    await fetch('/api/v1/portal/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
    })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const markRead = async (id: string) => {
    await fetch(`/api/v1/portal/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}` },
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-500 mt-1">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {!notifications.length ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.isRead && markRead(notif.id)}
              className={cn(
                'bg-white border rounded-xl p-4 cursor-pointer transition-all',
                notif.isRead ? 'border-gray-100 opacity-70' : 'border-indigo-100 shadow-sm',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', {
                  'bg-blue-400': notif.type === 'info',
                  'bg-green-400': notif.type === 'success',
                  'bg-amber-400': notif.type === 'warning',
                  'bg-red-400': notif.type === 'error',
                  'bg-gray-300': notif.isRead,
                })} />
                <div className="flex-1">
                  <p className={cn('text-sm font-medium', notif.isRead ? 'text-gray-600' : 'text-gray-900')}>{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{new Date(notif.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
