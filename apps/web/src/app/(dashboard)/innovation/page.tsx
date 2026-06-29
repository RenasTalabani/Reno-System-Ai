'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface InnovationSummary {
  totalIdeas: number
  submitted: number
  approved: number
  inPilot: number
}

export default function InnovationPage() {
  const [summary, setSummary] = useState<InnovationSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/innovation/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Innovation Lab</h1>
        <p className="text-gray-400 mt-1">Idea management, evaluation, pilots, and ROI tracking</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Ideas', value: summary?.totalIdeas ?? 0 },
          { label: 'Awaiting Review', value: summary?.submitted ?? 0 },
          { label: 'Approved', value: summary?.approved ?? 0 },
          { label: 'In Pilot', value: summary?.inPilot ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Submit an Idea</h2>
          <p className="text-gray-400 text-sm">Anyone in your organization can submit ideas for products, processes, or initiatives.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
              Submit Idea
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Evaluation Board</h2>
          <p className="text-gray-400 text-sm">Score ideas on feasibility, impact, and effort. Promote top ideas to pilot stage.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Review Ideas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
