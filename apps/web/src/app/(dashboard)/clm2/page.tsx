'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface Clm2Summary {
  totalTemplates: number
  activeContracts: number
  openObligations: number
  overdueObligations: number
}

export default function Clm2Page() {
  const [summary, setSummary] = useState<Clm2Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/clm2/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contract Lifecycle Management 2.0</h1>
        <p className="text-gray-400 mt-1">Templates, contracts, obligations, and clause library</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Templates', value: summary?.totalTemplates ?? 0 },
          { label: 'Active Contracts', value: summary?.activeContracts ?? 0 },
          { label: 'Open Obligations', value: summary?.openObligations ?? 0 },
          { label: 'Overdue', value: summary?.overdueObligations ?? 0, warn: true },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && value > 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Contract Templates</h2>
        <p className="text-gray-400 text-sm">Manage reusable contract templates with clause libraries and automated workflows.</p>
        <div className="mt-4 flex gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            New Template
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
            View Contracts
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Obligations Tracker</h2>
        <p className="text-gray-400 text-sm">Track contractual obligations with due dates, owners, and completion status.</p>
        {(summary?.overdueObligations ?? 0) > 0 && (
          <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm font-medium">
              {summary?.overdueObligations} overdue obligation(s) require attention
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
