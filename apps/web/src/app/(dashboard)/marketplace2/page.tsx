'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface Marketplace2Summary {
  availableApps: number
  installedApps: number
  availablePlugins: number
  myReviews: number
}

export default function Marketplace2Page() {
  const [summary, setSummary] = useState<Marketplace2Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/marketplace2/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">App Marketplace 2.0</h1>
        <p className="text-gray-400 mt-1">Discover and install apps, plugins, and integrations for your workspace</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Apps', value: summary?.availableApps ?? 0 },
          { label: 'Installed', value: summary?.installedApps ?? 0 },
          { label: 'Plugins', value: summary?.availablePlugins ?? 0 },
          { label: 'My Reviews', value: summary?.myReviews ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { category: 'Productivity', desc: 'Task management, note-taking, calendar sync', color: 'blue' },
          { category: 'Finance', desc: 'Accounting, invoicing, payment gateways', color: 'green' },
          { category: 'Communication', desc: 'Messaging, video calls, email integration', color: 'purple' },
          { category: 'HR & People', desc: 'Recruitment, payroll, performance', color: 'orange' },
          { category: 'Analytics', desc: 'Business intelligence, data exports', color: 'cyan' },
          { category: 'Security', desc: 'SSO, MFA, compliance tools', color: 'red' },
        ].map(({ category, desc, color }) => (
          <div key={category} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-500 cursor-pointer transition-colors">
            <div className={`w-8 h-8 rounded-lg bg-${color}-600/20 flex items-center justify-center mb-3`}>
              <div className={`w-4 h-4 rounded bg-${color}-500`} />
            </div>
            <h3 className="text-white font-medium">{category}</h3>
            <p className="text-gray-400 text-sm mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Installed Apps</h2>
        <p className="text-gray-400 text-sm">
          {(summary?.installedApps ?? 0) === 0
            ? 'No apps installed yet. Browse the marketplace to discover integrations.'
            : `You have ${summary?.installedApps} app(s) installed and running.`}
        </p>
        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            Browse Marketplace
          </button>
        </div>
      </div>
    </div>
  )
}
