'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface CsrSummary {
  totalPrograms: number
  activePrograms: number
  totalBudget: number
}

export default function CsrPage() {
  const [summary, setSummary] = useState<CsrSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/csr/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">CSR & Sustainability</h1>
        <p className="text-gray-400 mt-1">Corporate social responsibility programs, metrics, and impact reporting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Programs', value: summary?.totalPrograms ?? 0 },
          { label: 'Active Programs', value: summary?.activePrograms ?? 0 },
          { label: 'Total Budget', value: '$' + ((summary?.totalBudget ?? 0) / 1000).toFixed(1) + 'k' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { category: 'Environment', desc: 'Carbon footprint, renewable energy, waste reduction', icon: '🌱' },
          { category: 'Social', desc: 'Community programs, volunteer hours, donations', icon: '🤝' },
          { category: 'Governance', desc: 'Ethics, transparency, board diversity', icon: '⚖️' },
        ].map(({ category, desc, icon }) => (
          <div key={category} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="text-3xl mb-2">{icon}</div>
            <h3 className="text-white font-medium">{category}</h3>
            <p className="text-gray-400 text-sm mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Impact Dashboard</h2>
        <p className="text-gray-400 text-sm">Track KPIs against ESG targets and generate stakeholder reports.</p>
        <div className="mt-4 flex gap-3">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
            New Program
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
            Generate ESG Report
          </button>
        </div>
      </div>
    </div>
  )
}
