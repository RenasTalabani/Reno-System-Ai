'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface PropertySummary {
  totalProperties: number
  vacantUnits: number
  occupiedUnits: number
  activeLeases: number
}

export default function PropertyPage() {
  const [summary, setSummary] = useState<PropertySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/property/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const occupancyRate = (summary?.vacantUnits ?? 0) + (summary?.occupiedUnits ?? 0) > 0
    ? Math.round(((summary?.occupiedUnits ?? 0) / ((summary?.vacantUnits ?? 0) + (summary?.occupiedUnits ?? 0))) * 100)
    : 0

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Property Management</h1>
        <p className="text-gray-400 mt-1">Properties, units, leases, and tenant management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Properties', value: summary?.totalProperties ?? 0 },
          { label: 'Occupancy Rate', value: occupancyRate + '%' },
          { label: 'Vacant Units', value: summary?.vacantUnits ?? 0 },
          { label: 'Active Leases', value: summary?.activeLeases ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Property Portfolio</h2>
          <p className="text-gray-400 text-sm">Manage commercial, residential, and industrial properties with unit-level tracking.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Property
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View All Units
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Lease Management</h2>
          <p className="text-gray-400 text-sm">Create, renew, and terminate leases with automated rent tracking.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              New Lease
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
