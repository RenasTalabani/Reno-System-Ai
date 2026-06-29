'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface GrantsSummary {
  totalGrants: number
  awardedGrants: number
  totalAwardedValue: number
}

export default function GrantsPage() {
  const [summary, setSummary] = useState<GrantsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/grants/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Grant & Funding Management</h1>
        <p className="text-gray-400 mt-1">Track grants, applications, milestones, and reporting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Grants', value: summary?.totalGrants ?? 0 },
          { label: 'Awarded', value: summary?.awardedGrants ?? 0 },
          { label: 'Total Value', value: '$' + ((summary?.totalAwardedValue ?? 0) / 1000).toFixed(1) + 'k' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Grant Pipeline</h2>
          <p className="text-gray-400 text-sm">Track grants from prospect through application, award, and closeout.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Grant
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Milestone Tracker</h2>
          <p className="text-gray-400 text-sm">Monitor deliverables, reporting deadlines, and fund draw-downs.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View Milestones
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
