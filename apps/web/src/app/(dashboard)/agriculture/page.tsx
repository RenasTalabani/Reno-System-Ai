'use client'
import { useEffect, useState } from 'react'

export default function AgriculturePage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/agriculture/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Agriculture Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Farms', value: summary.totalFarms ?? 0, color: 'bg-green-50 border-green-200' },
          { label: 'Growing Crops', value: summary.activeCrops ?? 0, color: 'bg-lime-50 border-lime-200' },
          { label: 'Total Harvests', value: summary.totalHarvests ?? 0, color: 'bg-yellow-50 border-yellow-200' },
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
