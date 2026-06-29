'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface Loyalty2Summary {
  programs: number
  members: number
  activeRewards: number
  totalRedemptions: number
}

export default function Loyalty2Page() {
  const [summary, setSummary] = useState<Loyalty2Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/loyalty2/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Loyalty Programs 2.0</h1>
        <p className="text-gray-400 mt-1">Tiered rewards, member management, and redemption analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Programs', value: summary?.programs ?? 0 },
          { label: 'Members', value: summary?.members ?? 0 },
          { label: 'Active Rewards', value: summary?.activeRewards ?? 0 },
          { label: 'Total Redemptions', value: summary?.totalRedemptions ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Tier Management</h2>
          <p className="text-gray-400 text-sm">Configure bronze, silver, gold, and platinum membership tiers with dynamic benefits and upgrade criteria.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Create Program
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Reward Catalog</h2>
          <p className="text-gray-400 text-sm">Manage reward catalog with points, discounts, free products, and exclusive perks.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Reward
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
