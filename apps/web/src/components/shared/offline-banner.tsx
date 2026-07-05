'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useT } from '@/lib/i18n/use-translations'

// Plain CSS transition instead of framer-motion: this component mounts on
// every page via the root layout, so it must not depend on a library whose
// keyframe-resolution code can throw during SSR/client-boundary edge cases.
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showRestored, setShowRestored] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { t } = useT()

  const visible = !isOnline || showRestored

  useEffect(() => {
    const handleOffline = () => { setIsOnline(false); setShowRestored(false) }
    const handleOnline = () => {
      setIsOnline(true)
      setShowRestored(true)
      setTimeout(() => setShowRestored(false), 3000)
    }

    setIsOnline(navigator.onLine)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Keep the banner mounted briefly during the exit transition instead of
  // unmounting instantly, so the slide-up animation can play.
  useEffect(() => {
    if (visible) { setMounted(true); return }
    const timeout = setTimeout(() => setMounted(false), 300)
    return () => clearTimeout(timeout)
  }, [visible])

  if (!mounted) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-transform duration-300 ease-out"
      style={{ background: isOnline ? '#16a34a' : '#dc2626', transform: visible ? 'translateY(0)' : 'translateY(-60px)' }}
      role="status"
      aria-live="polite"
    >
      {isOnline
        ? <><Wifi className="h-4 w-4 text-white" aria-hidden="true" /><span className="text-white">{String(t('common.onlineRestored'))}</span></>
        : <><WifiOff className="h-4 w-4 text-white" aria-hidden="true" /><span className="text-white">{String(t('common.offline'))}</span></>
      }
    </div>
  )
}
