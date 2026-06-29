'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface TravelSummary {
  totalTrips: number
  pendingApproval: number
  approvedTrips: number
  totalCost: number
}

export default function TravelPage() {
  const [summary, setSummary] = useState<TravelSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/travel/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Corporate Travel</h1>
        <p className="text-gray-400 mt-1">Trip requests, bookings, approvals, and expense integration</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trips', value: summary?.totalTrips ?? 0 },
          { label: 'Pending Approval', value: summary?.pendingApproval ?? 0, warn: true },
          { label: 'Approved', value: summary?.approvedTrips ?? 0 },
          { label: 'Total Spend', value: '$' + ((summary?.totalCost ?? 0) / 1000).toFixed(1) + 'k' },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && Number(value) > 0 ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Book a Trip</h2>
          <p className="text-gray-400 text-sm">Request travel approval, book flights, hotels, and ground transport within policy.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              New Trip Request
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Travel Policy</h2>
          <p className="text-gray-400 text-sm">Configure per-diem rates, booking guidelines, preferred vendors, and approval chains.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              Manage Policies
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
