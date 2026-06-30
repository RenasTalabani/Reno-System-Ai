'use client'
import { useEffect, useState } from 'react'

export default function MarinePage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/marine/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Marine Fleet Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Vessels', value: summary.totalVessels ?? 0, color: 'bg-blue-50 border-blue-200' },
          { label: 'Active Voyages', value: summary.activeVoyages ?? 0, color: 'bg-cyan-50 border-cyan-200' },
          { label: 'Total Voyages', value: summary.totalVoyages ?? 0, color: 'bg-indigo-50 border-indigo-200' },
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
