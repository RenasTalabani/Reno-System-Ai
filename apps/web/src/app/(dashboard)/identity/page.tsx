'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface IdentitySummary {
  enabledProviders: number
  activeSessions: number
  scimTokens: number
  directoryGroups: number
}

export default function IdentityPage() {
  const [summary, setSummary] = useState<IdentitySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/identity/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Identity & SSO</h1>
        <p className="text-gray-400 mt-1">Single sign-on providers, SCIM provisioning, and directory groups</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'SSO Providers', value: summary?.enabledProviders ?? 0 },
          { label: 'Active Sessions', value: summary?.activeSessions ?? 0 },
          { label: 'SCIM Tokens', value: summary?.scimTokens ?? 0 },
          { label: 'Directory Groups', value: summary?.directoryGroups ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">SSO Configuration</h2>
          <p className="text-gray-400 text-sm">Connect SAML 2.0, OIDC/OAuth providers including Okta, Azure AD, Google Workspace, and more.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Provider
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View Sessions
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">SCIM Provisioning</h2>
          <p className="text-gray-400 text-sm">Automate user provisioning and deprovisioning via SCIM 2.0 with directory sync.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              Generate Token
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View Groups
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
