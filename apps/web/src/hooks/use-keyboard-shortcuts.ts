'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description?: string
  handler: () => void
  enabled?: boolean
}

export function useKeyboardShortcut(shortcuts: ShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue

      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey || shortcut.meta !== undefined)
      const metaMatch = shortcut.meta ? e.metaKey : true
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey || shortcut.shift === undefined
      const altMatch = shortcut.alt ? e.altKey : !e.altKey || shortcut.alt === undefined
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

      const matched =
        keyMatch &&
        (shortcut.ctrl ? (e.ctrlKey || e.metaKey) : (!shortcut.ctrl)) &&
        (shortcut.shift ? e.shiftKey : !shortcut.shift) &&
        (shortcut.alt ? e.altKey : !shortcut.alt)

      void (ctrlMatch && metaMatch && shiftMatch && altMatch) // suppress unused

      if (matched) {
        // Skip if focus is in a text input (unless explicitly flagged)
        const target = e.target as HTMLElement
        const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'
        if (inInput && shortcut.key !== 'Escape') continue

        e.preventDefault()
        shortcut.handler()
        break
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const RENO_SHORTCUTS = {
  COMMAND_PALETTE: { key: 'k', ctrl: true, description: 'Open command palette' },
  SEARCH: { key: '/', ctrl: false, description: 'Global search' },
  NEW_RECORD: { key: 'n', ctrl: false, description: 'New record' },
  ESCAPE: { key: 'Escape', description: 'Dismiss / close' },
  SAVE: { key: 's', ctrl: true, description: 'Save' },
  TOGGLE_SIDEBAR: { key: 'b', ctrl: true, description: 'Toggle sidebar' },
  TOGGLE_THEME: { key: 'd', ctrl: false, shift: false, alt: true, description: 'Toggle dark mode' },
  GO_DASHBOARD: { key: '1', alt: true, description: 'Go to Dashboard' },
  GO_INBOX: { key: '2', alt: true, description: 'Go to Inbox' },
  HELP: { key: '?', shift: true, description: 'Show shortcuts' },
} as const
