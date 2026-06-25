'use client'

import { useReportWebVitals } from 'next/web-vitals'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Only send in production or when explicitly enabled
    if (process.env['NODE_ENV'] !== 'production' && !process.env['NEXT_PUBLIC_REPORT_WEB_VITALS']) {
      return
    }

    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    })

    // Use sendBeacon for non-blocking delivery; fall back to fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(`${API_BASE}/v1/monitoring/health/web-vitals`, blob)
    } else {
      fetch(`${API_BASE}/v1/monitoring/health/web-vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  })

  return null
}
