'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface SupplierSummary {
  totalSuppliers: number
  activeSuppliers: number
  highRisk: number
  pendingOnboarding: number
}

export default function SupplierPortalPage() {
  const [summary, setSummary] = useState<SupplierSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/suppliers/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Supplier Portal</h1>
        <p className="text-gray-400 mt-1">Supplier profiles, scorecards, risk, and document management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: summary?.totalSuppliers ?? 0 },
          { label: 'Active', value: summary?.activeSuppliers ?? 0 },
          { label: 'High Risk', value: summary?.highRisk ?? 0, warn: true },
          { label: 'Pending Onboarding', value: summary?.pendingOnboarding ?? 0 },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && value > 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Supplier Directory</h2>
          <p className="text-gray-400 text-sm">Manage supplier profiles, certifications, and contacts.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Supplier
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              Import CSV
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Risk Assessment</h2>
          <p className="text-gray-400 text-sm">AI-powered supplier risk scoring and compliance tracking.</p>
          {(summary?.highRisk ?? 0) > 0 && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{summary?.highRisk} supplier(s) flagged as high risk</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
