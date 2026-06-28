'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from './auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type EventHandler = (event: unknown) => void

export function useRealtimeEvents(
  eventTypes: string | string[],
  handler: EventHandler,
  enabled = true,
) {
  const { token } = useAuthStore()
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const esRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!token || !enabled) return
    if (esRef.current) esRef.current.close()

    const es = new EventSource(`${API}/v1/events/stream?token=${token}`)
    esRef.current = es

    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes]

    const handle = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data)
        handlerRef.current(data)
      } catch { /* ignore */ }
    }

    types.forEach(type => es.addEventListener(type, handle))
    if (types.includes('*')) es.onmessage = handle

    es.onerror = () => {
      es.close()
      // reconnect after 3s
      setTimeout(connect, 3000)
    }
  }, [token, enabled, eventTypes])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [connect])
}

// Convenience: subscribe to all tenant events
export function useAllRealtimeEvents(handler: EventHandler, enabled = true) {
  return useRealtimeEvents('*', handler, enabled)
}
