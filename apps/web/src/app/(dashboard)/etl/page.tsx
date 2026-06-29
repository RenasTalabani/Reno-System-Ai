'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface EtlSummary {
  activeConnectors: number
  activeJobs: number
  failedJobs: number
}

export default function EtlPage() {
  const [summary, setSummary] = useState<EtlSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/etl/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Data Pipeline & ETL</h1>
        <p className="text-gray-400 mt-1">Connectors, transformation jobs, and data orchestration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Active Connectors', value: summary?.activeConnectors ?? 0 },
          { label: 'Running Jobs', value: summary?.activeJobs ?? 0 },
          { label: 'Failed Jobs', value: summary?.failedJobs ?? 0, warn: true },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && value > 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {['PostgreSQL', 'MySQL', 'Salesforce', 'HubSpot', 'Stripe', 'Snowflake', 'BigQuery', 'REST API'].map(conn => (
          <div key={conn} className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center hover:border-blue-500 cursor-pointer transition-colors">
            <p className="text-white text-sm font-medium">{conn}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Connectors</h2>
          <p className="text-gray-400 text-sm">Connect to databases, SaaS apps, APIs, and data warehouses.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Connector
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Pipeline Jobs</h2>
          <p className="text-gray-400 text-sm">Schedule, monitor, and debug ETL pipeline executions.</p>
          {(summary?.failedJobs ?? 0) > 0 && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{summary?.failedJobs} job(s) need attention</p>
            </div>
          )}
          <div className="mt-4">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View All Jobs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
