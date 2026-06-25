'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus, Loader2, Trash2 } from 'lucide-react'

const REPORT_TYPES = [
  { value: 'board_meeting', label: 'Board Meeting Report', desc: 'Comprehensive board-level summary' },
  { value: 'ceo_weekly', label: 'CEO Weekly Report', desc: 'Weekly CEO performance review' },
  { value: 'daily_ops', label: 'Daily Operations', desc: 'Daily operations briefing' },
  { value: 'scorecard', label: 'Executive Scorecard', desc: 'RAG status for all departments' },
  { value: 'strategic_plan', label: 'Strategic Plan', desc: '90-day strategic planning report' },
]

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedType, setSelectedType] = useState('daily_ops')
  const [selected, setSelected] = useState<any>(null)

  const load = () => {
    fetch('/api/v1/ai-exec/reports').then(r => r.json()).then(d => { setReports(d.data ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/v1/ai-exec/reports/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: selectedType }),
      }).then(r => r.json())
      if (res.data) { setReports(prev => [res.data, ...prev]); setSelected(res.data) }
    } finally { setGenerating(false) }
  }

  const del = async (id: string) => {
    await fetch(`/api/v1/ai-exec/reports/${id}`, { method: 'DELETE' })
    setReports(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Executive Reports</h1>
          <p className="text-sm text-gray-500">AI-generated business intelligence reports</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — list + generate */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {/* Generate */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Generate Report</h3>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-xs text-gray-500 mb-3">{REPORT_TYPES.find(t => t.value === selectedType)?.desc}</p>
            <button onClick={generate} disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Plus className="w-4 h-4" />Generate</>}
            </button>
          </div>

          {/* Report list */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-y-auto">
            {loading ? <div className="p-4 text-center text-gray-400 text-sm">Loading...</div> :
              reports.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">No reports yet</div> :
              <div className="divide-y divide-gray-50">
                {reports.map(r => (
                  <button key={r.id} onClick={() => setSelected(r)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === r.id ? 'bg-indigo-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.reportType?.replace(/_/g, ' ')} · {new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); del(r.id) }} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            }
          </div>
        </div>

        {/* Right panel — report content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-y-auto">
          {selected ? (
            <div className="p-6">
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{selected.reportType?.replace(/_/g, ' ')} · Generated {new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{selected.aiSummary}</pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <FileText className="w-12 h-12 mb-3" />
              <p className="text-sm">Select a report or generate a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
