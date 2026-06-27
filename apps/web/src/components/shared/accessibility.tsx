'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Skip Navigation ────────────────────────────────────────────────────────

export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:inline-flex focus:items-center focus:gap-2 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none"
    >
      Skip to main content
    </a>
  )
}

// ── Focus Trap ─────────────────────────────────────────────────────────────

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function FocusTrap({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !ref.current) return

    const el = ref.current
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    first?.focus()
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [active])

  return <div ref={ref}>{children}</div>
}

// ── Accessibility Settings Store ───────────────────────────────────────────

interface A11yStore {
  highContrast: boolean
  colorBlindMode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'monochromacy'
  reducedMotion: boolean
  fontSize: 'sm' | 'md' | 'lg' | 'xl'
  setHighContrast: (v: boolean) => void
  setColorBlindMode: (v: A11yStore['colorBlindMode']) => void
  setReducedMotion: (v: boolean) => void
  setFontSize: (v: A11yStore['fontSize']) => void
}

export const useA11yStore = create<A11yStore>()(
  persist(
    (set) => ({
      highContrast: false,
      colorBlindMode: 'none',
      reducedMotion: false,
      fontSize: 'md',
      setHighContrast: (v) => set({ highContrast: v }),
      setColorBlindMode: (v) => set({ colorBlindMode: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      setFontSize: (v) => set({ fontSize: v }),
    }),
    { name: 'reno-a11y' },
  ),
)

// ── Accessibility Provider — applies CSS classes to <html> ─────────────────

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { highContrast, colorBlindMode, reducedMotion, fontSize } = useA11yStore()

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('high-contrast', highContrast)
    html.classList.toggle('reduce-motion', reducedMotion)

    // Font size
    const sizes = { sm: '14px', md: '16px', lg: '18px', xl: '20px' }
    html.style.fontSize = sizes[fontSize]

    // Color blind mode as data attribute for CSS filter
    html.dataset['colorBlind'] = colorBlindMode
  }, [highContrast, colorBlindMode, reducedMotion, fontSize])

  return <>{children}</>
}

// ── Live Region for screen reader announcements ────────────────────────────

let announceQueue: (() => void)[] = []

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const fn = () => {
    const el = document.getElementById(`reno-a11y-${priority}`)
    if (el) {
      el.textContent = ''
      requestAnimationFrame(() => { el.textContent = message })
    }
  }
  announceQueue.push(fn)
  setTimeout(() => {
    const next = announceQueue.shift()
    next?.()
  }, 100)
}

export function A11yLiveRegions() {
  return (
    <>
      <div id="reno-a11y-polite" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="reno-a11y-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
    </>
  )
}
