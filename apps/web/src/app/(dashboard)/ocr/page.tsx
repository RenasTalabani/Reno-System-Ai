'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface OcrSummary {
  totalJobs: number
  pendingJobs: number
  completedToday: number
  totalFieldsExtracted: number
}

export default function OcrPage() {
  const [summary, setSummary] = useState<OcrSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/ocr/summary')
      .then(r => setSummary(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">OCR & Document Intelligence</h1>
        <p className="text-gray-400 mt-1">AI-powered document scanning, field extraction, and processing</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: summary?.totalJobs ?? 0 },
          { label: 'Pending', value: summary?.pendingJobs ?? 0 },
          { label: 'Completed Today', value: summary?.completedToday ?? 0 },
          { label: 'Fields Extracted', value: summary?.totalFieldsExtracted ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Upload Document</h2>
          <p className="text-gray-400 text-sm mb-4">Upload invoices, receipts, contracts, and other documents for AI-powered data extraction.</p>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">Drop files here or click to upload</p>
            <p className="text-gray-600 text-xs mt-1">Supports PDF, PNG, JPG, TIFF</p>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full">
            Submit for Processing
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Jobs</h2>
          <p className="text-gray-400 text-sm">Monitor the status of your OCR processing queue.</p>
          <div className="mt-4 space-y-2">
            {summary?.pendingJobs ? (
              <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <p className="text-yellow-400 text-sm">{summary.pendingJobs} job(s) in queue</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No pending jobs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
