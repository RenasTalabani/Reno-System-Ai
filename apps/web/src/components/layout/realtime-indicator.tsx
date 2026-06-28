'use client'

import { useState, useCallback } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useAllRealtimeEvents } from '@/lib/use-realtime'

export function RealtimeIndicator() {
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  const handleEvent = useCallback((event: any) => {
    setConnected(true)
    setLastEvent(event?.type ?? 'event')
    // flash the indicator
    setTimeout(() => setLastEvent(null), 2000)
  }, [])

  useAllRealtimeEvents((event: any) => {
    if (event?.tenantId) {
      setConnected(true)
      handleEvent(event)
    }
  })

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {connected ? (
        <Wifi className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 text-muted-foreground/50" />
      )}
      {lastEvent && (
        <span className="text-[10px] text-green-500 animate-pulse">{lastEvent}</span>
      )}
    </div>
  )
}
