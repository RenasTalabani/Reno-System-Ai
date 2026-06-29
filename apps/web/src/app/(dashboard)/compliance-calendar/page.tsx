'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface ComplianceCalendarSummary {
  totalEvents: number
  upcomingIn30Days: number
  overdue: number
  completed: number
}

export default function ComplianceCalendarPage() {
  const [summary, setSummary] = useState<ComplianceCalendarSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/compliance-calendar/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance Calendar</h1>
        <p className="text-gray-400 mt-1">Regulatory deadlines, compliance events, and audit reminders</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: summary?.totalEvents ?? 0 },
          { label: 'Due in 30 Days', value: summary?.upcomingIn30Days ?? 0 },
          { label: 'Overdue', value: summary?.overdue ?? 0, warn: true },
          { label: 'Completed', value: summary?.completed ?? 0, good: true },
        ].map(({ label, value, warn, good }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && value > 0 ? 'text-red-400' : good ? 'text-green-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      {(summary?.overdue ?? 0) > 0 && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
          <p className="text-red-400 font-medium">Action Required: {summary?.overdue} overdue compliance event(s)</p>
          <p className="text-red-300 text-sm mt-1">Review and complete overdue items to avoid regulatory penalties.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming Events</h2>
          <p className="text-gray-400 text-sm">Regulatory filings, audit deadlines, license renewals, and certification expirations.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Event
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Reminders & Alerts</h2>
          <p className="text-gray-400 text-sm">Configure automated reminders and escalation rules for compliance deadlines.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              Configure Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
