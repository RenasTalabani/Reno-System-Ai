'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { useT } from '@/lib/i18n/use-translations'

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['/'], description: 'Global search' },
      { keys: ['Alt', '1'], description: 'Go to Dashboard' },
      { keys: ['Alt', '2'], description: 'Go to Inbox' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['N'], description: 'New record' },
      { keys: ['Ctrl', 'S'], description: 'Save' },
      { keys: ['Esc'], description: 'Dismiss / close' },
      { keys: ['Ctrl', 'B'], description: 'Toggle sidebar' },
    ],
  },
  {
    title: 'Appearance',
    shortcuts: [
      { keys: ['Alt', 'D'], description: 'Toggle dark mode' },
      { keys: ['?'], description: 'Show shortcuts' },
    ],
  },
]

interface ShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const { t } = useT()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[151] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={String(t('shortcuts.title'))}
          >
            <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <h2 className="font-semibold text-foreground">{String(t('shortcuts.title'))}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close shortcuts"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </h3>
                    <div className="space-y-2">
                      {group.shortcuts.map((s) => (
                        <div key={s.description} className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{s.description}</span>
                          <div className="flex items-center gap-1">
                            {s.keys.map((key, i) => (
                              <kbd
                                key={i}
                                className="inline-flex h-6 items-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function ShortcutsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Keyboard shortcuts"
      >
        <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">?</kbd>
        <span>Shortcuts</span>
      </button>
      <ShortcutsDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
