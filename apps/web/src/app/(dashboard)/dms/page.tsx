'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface DmsSummary {
  totalFolders: number
  totalDocs: number
  recentDocs: number
}

export default function DmsPage() {
  const [summary, setSummary] = useState<DmsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/dms/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Document Management 2.0</h1>
        <p className="text-gray-400 mt-1">Folders, documents, versions, and access control</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Folders', value: summary?.totalFolders ?? 0 },
          { label: 'Documents', value: summary?.totalDocs ?? 0 },
          { label: 'Added This Week', value: summary?.recentDocs ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">File Browser</h2>
          <p className="text-gray-400 text-sm">Navigate folders, search documents, and manage file access.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              New Folder
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              Upload File
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Version Control</h2>
          <p className="text-gray-400 text-sm">Track document versions, changes, and restore previous versions.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
              View Recent Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
