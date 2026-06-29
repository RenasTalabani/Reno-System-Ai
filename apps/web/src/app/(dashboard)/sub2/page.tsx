'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface Sub2Summary {
  activePlans: number
  activeSubscriptions: number
  totalMrr: number
}

export default function Sub2Page() {
  const [summary, setSummary] = useState<Sub2Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/sub2/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription Billing 2.0</h1>
        <p className="text-gray-400 mt-1">Plans, subscriptions, trials, and recurring revenue management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Active Plans', value: summary?.activePlans ?? 0 },
          { label: 'Active Subscriptions', value: summary?.activeSubscriptions ?? 0 },
          { label: 'Monthly Recurring Revenue', value: '$' + ((summary?.totalMrr ?? 0) / 1000).toFixed(1) + 'k' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Plan Builder</h2>
          <p className="text-gray-400 text-sm">Create monthly, annual, and usage-based plans with free trials and feature gating.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Create Plan
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Subscriber Management</h2>
          <p className="text-gray-400 text-sm">View, upgrade, downgrade, pause, and cancel customer subscriptions.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View Subscribers
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
