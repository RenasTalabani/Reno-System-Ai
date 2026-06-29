'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface TreasurySummary {
  totalAccounts: number
  totalBalance: number
  pendingTransactions: number
  activeFxRates: number
}

export default function TreasuryPage() {
  const [summary, setSummary] = useState<TreasurySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/treasury/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Treasury Management</h1>
        <p className="text-gray-400 mt-1">Cash accounts, transactions, FX rates, and liquidity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Accounts', value: summary?.totalAccounts ?? 0 },
          { label: 'Total Balance', value: `$${((summary?.totalBalance ?? 0) / 1000).toFixed(1)}k` },
          { label: 'Pending Transactions', value: summary?.pendingTransactions ?? 0 },
          { label: 'FX Rates Active', value: summary?.activeFxRates ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Cash Accounts</h2>
          <p className="text-gray-400 text-sm">Manage bank accounts, digital wallets, and cash positions across currencies.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Add Account
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">FX Rates</h2>
          <p className="text-gray-400 text-sm">Multi-currency exchange rates with real-time updates and historical tracking.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              Update Rates
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
