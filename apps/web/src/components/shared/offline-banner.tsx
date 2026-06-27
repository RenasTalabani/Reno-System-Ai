'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { useT } from '@/lib/i18n/use-translations'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showRestored, setShowRestored] = useState(false)
  const { t } = useT()

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

  return (
    <AnimatePresence>
      {(!isOnline || showRestored) && (
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2.5 text-sm font-medium"
          style={{ background: isOnline ? '#16a34a' : '#dc2626' }}
          role="status"
          aria-live="polite"
        >
          {isOnline
            ? <><Wifi className="h-4 w-4 text-white" aria-hidden="true" /><span className="text-white">{String(t('common.onlineRestored'))}</span></>
            : <><WifiOff className="h-4 w-4 text-white" aria-hidden="true" /><span className="text-white">{String(t('common.offline'))}</span></>
          }
        </motion.div>
      )}
    </AnimatePresence>
  )
}
