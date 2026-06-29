'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface IotSummary {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  activeAlerts: number
}

export default function IotPage() {
  const [summary, setSummary] = useState<IotSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/iot/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const onlinePct = (summary?.totalDevices ?? 0) > 0
    ? Math.round(((summary?.onlineDevices ?? 0) / (summary?.totalDevices ?? 1)) * 100)
    : 0

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IoT & Digital Twin</h1>
          <p className="text-gray-400 mt-1">Connected devices, sensor telemetry, and real-time monitoring</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${(summary?.activeAlerts ?? 0) > 0 ? 'bg-red-900/50 text-red-400 border border-red-700' : 'bg-green-900/50 text-green-400 border border-green-700'}`}>
          {(summary?.activeAlerts ?? 0) > 0 ? `${summary?.activeAlerts} Active Alert(s)` : 'All Devices Normal'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Devices', value: summary?.totalDevices ?? 0 },
          { label: 'Online', value: `${onlinePct}%` },
          { label: 'Offline', value: summary?.offlineDevices ?? 0, warn: true },
          { label: 'Active Alerts', value: summary?.activeAlerts ?? 0, warn: true },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && Number(value) > 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Device Registry</h2>
          <p className="text-gray-400 text-sm">Register and manage IoT sensors, actuators, gateways, and edge devices.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Device
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View Telemetry
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Alert Management</h2>
          <p className="text-gray-400 text-sm">Configure thresholds, receive real-time notifications, and resolve device alerts.</p>
          {(summary?.activeAlerts ?? 0) > 0 && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{summary?.activeAlerts} unresolved alert(s)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
