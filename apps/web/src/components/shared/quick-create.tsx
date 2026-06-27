'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, User, Ticket, FileText, DollarSign, FolderKanban, Handshake, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const QUICK_CREATE_ITEMS = [
  { label: 'Employee', href: '/hr/employees/new', icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Ticket', href: '/helpdesk/tickets/new', icon: Ticket, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { label: 'Invoice', href: '/sales/invoices/new', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  { label: 'Task', href: '/projects/tasks/new', icon: FolderKanban, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Contact', href: '/crm/contacts/new', icon: Handshake, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { label: 'Document', href: '/documents/new', icon: FileText, color: 'text-pink-500', bg: 'bg-pink-500/10' },
]

export function QuickCreatePanel() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
        aria-label="Quick create"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.15 }}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-border bg-background shadow-xl p-2"
              role="menu"
              aria-label="Quick create menu"
            >
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Create New</span>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
              {QUICK_CREATE_ITEMS.map((item) => (
                <button
                  key={item.href}
                  role="menuitem"
                  onClick={() => { setOpen(false); router.push(item.href) }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} aria-hidden="true" />
                  </div>
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
