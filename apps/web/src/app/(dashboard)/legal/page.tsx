'use client'
import { useEffect, useState } from 'react'

export default function LegalPage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/legal/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Legal Case Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Cases', value: summary.totalCases ?? 0, color: 'bg-blue-50 border-blue-200' },
          { label: 'Open Cases', value: summary.openCases ?? 0, color: 'bg-yellow-50 border-yellow-200' },
          { label: 'Closed Cases', value: summary.closedCases ?? 0, color: 'bg-green-50 border-green-200' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-5 ${c.color}`}>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-lg font-semibold mb-2">Billable Hours</h2>
        <p className="text-4xl font-bold text-purple-600">{summary.billableHours ?? 0}h</p>
      </div>
    </div>
  )
}
