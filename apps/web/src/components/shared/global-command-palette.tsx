'use client'

import { useEffect, useState } from 'react'
import { CommandPalette } from './command-palette'

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return <CommandPalette open={open} onOpenChange={setOpen} />
}
