'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, User, FileText, Ticket, DollarSign, Users, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface ActivityItem {
  id: string
  type: 'user' | 'document' | 'ticket' | 'invoice' | 'employee' | 'automation' | 'system'
  title: string
  description?: string
  actor?: string
  createdAt: Date
  read?: boolean
  href?: string
}

const ICONS = {
  user: User,
  document: FileText,
  ticket: Ticket,
  invoice: DollarSign,
  employee: Users,
  automation: Zap,
  system: Bell,
}

const COLORS = {
  user: 'bg-blue-500/10 text-blue-500',
  document: 'bg-purple-500/10 text-purple-500',
  ticket: 'bg-orange-500/10 text-orange-500',
  invoice: 'bg-green-500/10 text-green-500',
  employee: 'bg-cyan-500/10 text-cyan-500',
  automation: 'bg-yellow-500/10 text-yellow-500',
  system: 'bg-gray-500/10 text-gray-500',
}

interface ActivityFeedProps {
  items?: ActivityItem[]
  onMarkAllRead?: () => void
}

export function ActivityFeed({ items = [], onMarkAllRead }: ActivityFeedProps) {
  const [open, setOpen] = useState(false)
  const unread = items.filter((i) => !i.read).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-background shadow-xl"
              role="dialog"
              aria-label="Activity feed"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Activity</h3>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={onMarkAllRead}
                      className="text-xs text-primary hover:underline"
                      aria-label="Mark all notifications as read"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Close activity feed"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto" role="list" aria-label="Recent activity">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No recent activity
                  </div>
                ) : (
                  items.map((item) => {
                    const Icon = ICONS[item.type]
                    return (
                      <div
                        key={item.id}
                        role="listitem"
                        className={`flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors ${!item.read ? 'bg-primary/5' : ''}`}
                      >
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${COLORS[item.type]}`}>
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                        {!item.read && (
                          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
