'use client'
import { useEffect, useState } from 'react'

export default function TransportPage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/transport/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Transportation & Logistics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Routes', value: summary.totalRoutes ?? 0, color: 'bg-blue-50 border-blue-200' },
          { label: 'Drivers on Route', value: summary.activeDrivers ?? 0, color: 'bg-yellow-50 border-yellow-200' },
          { label: 'In Transit', value: summary.inTransit ?? 0, color: 'bg-orange-50 border-orange-200' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-5 ${c.color}`}>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
