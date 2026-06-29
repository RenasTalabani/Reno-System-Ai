'use client'
import { useEffect, useState } from 'react'

export default function RetailPage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/retail/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Retail Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Stores', value: summary.totalStores ?? 0, color: 'bg-blue-50 border-blue-200' },
          { label: 'Active Stores', value: summary.activeStores ?? 0, color: 'bg-green-50 border-green-200' },
          { label: 'Open Registers', value: summary.openRegisters ?? 0, color: 'bg-purple-50 border-purple-200' },
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
