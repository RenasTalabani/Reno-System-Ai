'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface ChatSummary {
  activeChannels: number
  totalMessages: number
  todayMessages: number
}

export default function ChatPage() {
  const [summary, setSummary] = useState<ChatSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/chat/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Communication Hub 2.0</h1>
        <p className="text-gray-400 mt-1">Channels, threaded messages, reactions, and team collaboration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Active Channels', value: summary?.activeChannels ?? 0 },
          { label: 'Total Messages', value: summary?.totalMessages ?? 0 },
          { label: "Today's Messages", value: summary?.todayMessages ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden" style={{ height: '500px' }}>
        <div className="flex h-full">
          <div className="w-64 border-r border-gray-700 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Channels</h3>
              <button className="text-blue-400 hover:text-blue-300 text-xs">+ New</button>
            </div>
            {['# general', '# engineering', '# sales', '# announcements'].map(ch => (
              <button key={ch} className="text-left px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition-colors">
                {ch}
              </button>
            ))}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium"># general</h3>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center">
              <p className="text-gray-500 text-sm">Select a channel to start messaging</p>
            </div>
            <div className="p-4 border-t border-gray-700">
              <input
                type="text"
                placeholder="Message #general..."
                className="w-full bg-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
