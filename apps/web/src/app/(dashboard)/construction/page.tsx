'use client'
import { useEffect, useState } from 'react'

export default function ConstructionPage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/construction/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Construction Management</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: summary.totalProjects ?? 0, color: 'bg-blue-50 border-blue-200' },
          { label: 'Active Projects', value: summary.activeProjects ?? 0, color: 'bg-green-50 border-green-200' },
          { label: 'Open RFIs', value: summary.openRfis ?? 0, color: 'bg-yellow-50 border-yellow-200' },
          { label: 'Punch Items', value: summary.openPunchItems ?? 0, color: 'bg-red-50 border-red-200' },
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
