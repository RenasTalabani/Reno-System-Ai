'use client'
import { useEffect, useState } from 'react'

export default function NonprofitPage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/nonprofit/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Nonprofit & Fundraising</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Donors', value: summary.totalDonors ?? 0, color: 'bg-blue-50 border-blue-200' },
          { label: 'Total Donations', value: summary.totalDonations ?? 0, color: 'bg-purple-50 border-purple-200' },
          { label: 'Total Raised', value: `$${(summary.totalRaised ?? 0).toLocaleString()}`, color: 'bg-green-50 border-green-200' },
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
