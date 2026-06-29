'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface PlatformHealthSummary {
  totalSlos: number
  meetingSlos: number
  openIncidents: number
  totalServices: number
  healthyServices: number
}

export default function PlatformHealthPage() {
  const [summary, setSummary] = useState<PlatformHealthSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/platform-health/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const sloPercent = summary && summary.totalSlos > 0
    ? Math.round((summary.meetingSlos / summary.totalSlos) * 100)
    : 100
  const serviceHealthPct = summary && summary.totalServices > 0
    ? Math.round((summary.healthyServices / summary.totalServices) * 100)
    : 100

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Health</h1>
          <p className="text-gray-400 mt-1">SLOs, incident management, and service health monitoring</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${(summary?.openIncidents ?? 0) > 0 ? 'bg-red-900/50 text-red-400 border border-red-700' : 'bg-green-900/50 text-green-400 border border-green-700'}`}>
          {(summary?.openIncidents ?? 0) > 0 ? `${summary?.openIncidents} Active Incident(s)` : 'All Systems Operational'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Services', value: summary?.totalServices ?? 0 },
          { label: 'Healthy', value: `${serviceHealthPct}%` },
          { label: 'SLO Compliance', value: `${sloPercent}%` },
          { label: 'Open Incidents', value: summary?.openIncidents ?? 0, warn: true },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && Number(value) > 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">SLO Dashboard</h2>
          <p className="text-gray-400 text-sm">Track Service Level Objectives — uptime, latency, error rate, and throughput targets.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Configure SLOs
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Incident Management</h2>
          <p className="text-gray-400 text-sm">Create, track, and resolve incidents with automated escalation and postmortems.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
              Report Incident
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
