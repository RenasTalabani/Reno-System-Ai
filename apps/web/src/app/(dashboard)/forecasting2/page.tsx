'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface Forecasting2Summary {
  models: number
  predictions: number
  openAnomalies: number
}

export default function Forecasting2Page() {
  const [summary, setSummary] = useState<Forecasting2Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/forecasting2/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Forecasting 2.0</h1>
        <p className="text-gray-400 mt-1">ML-powered demand forecasting, predictions, and anomaly detection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Forecast Models', value: summary?.models ?? 0 },
          { label: 'Predictions Generated', value: summary?.predictions ?? 0 },
          { label: 'Open Anomalies', value: summary?.openAnomalies ?? 0, warn: true },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn && value > 0 ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Forecast Models</h2>
          <p className="text-gray-400 text-sm">Configure and train ML models for demand, revenue, and inventory forecasting.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              New Model
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View Predictions
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Anomaly Detection</h2>
          <p className="text-gray-400 text-sm">Real-time detection of unusual patterns with automated alerting.</p>
          {(summary?.openAnomalies ?? 0) > 0 ? (
            <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <p className="text-yellow-400 text-sm">{summary?.openAnomalies} unresolved anomalie(s) detected</p>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm">All clear — no anomalies detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
