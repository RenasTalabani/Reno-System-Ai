'use client'

import { useEffect, useState } from 'react'
import { Brain, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react'

function Gauge({ value, max = 100, label, color }: { value: number; max?: number; label: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="text-center">
      <div className="relative w-24 h-12 mx-auto">
        <svg viewBox="0 0 120 60" className="w-full">
          <path d="M10,55 A50,50 0 0,1 110,55" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
          <path d="M10,55 A50,50 0 0,1 110,55" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray="157" strokeDashoffset={157 - (pct / 100) * 157} />
        </svg>
        <div className="absolute bottom-0 w-full text-center">
          <span className="text-xl font-bold text-gray-900">{Math.round(value)}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  )
}

export default function DigitalTwinPage() {
  const [twin, setTwin] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [computing, setComputing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/ai-exec/digital-twin').then(r => r.json()),
      fetch('/api/v1/ai-exec/digital-twin/history?limit=10').then(r => r.json()),
    ]).then(([t, h]) => {
      setTwin(t.data)
      setHistory(h.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleCompute = async () => {
    setComputing(true)
    try {
      const res = await fetch('/api/v1/ai-exec/digital-twin/compute', { method: 'POST' }).then(r => r.json())
      setTwin(res.data)
      setHistory(prev => [{ ...res.data, computedAt: res.data.computedAt }, ...prev.slice(0, 9)])
    } finally {
      setComputing(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Digital Twin...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Digital Twin</h1>
          <p className="text-sm text-gray-500">Real-time snapshot of your company's health</p>
        </div>
        <button onClick={handleCompute} disabled={computing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${computing ? 'animate-spin' : ''}`} />
          {computing ? 'Computing...' : 'Recompute Twin'}
        </button>
      </div>

      {twin ? (
        <>
          {/* Score gauges */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Overall Score: {Math.round(twin.overallScore)}/100</h2>
                <p className="text-indigo-200 text-sm">Computed: {new Date(twin.computedAt).toLocaleString()}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${twin.overallScore >= 70 ? 'bg-green-500' : twin.overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                {twin.overallScore >= 70 ? 'Healthy' : twin.overallScore >= 50 ? 'Moderate' : 'Needs Attention'}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <Gauge value={twin.healthScore} label="Health" color="#34d399" />
              <Gauge value={twin.growthScore} label="Growth" color="#60a5fa" />
              <Gauge value={twin.efficiencyScore} label="Efficiency" color="#f59e0b" />
              <Gauge value={Math.max(0, 100 - twin.riskScore)} label="Safety" color="#a78bfa" />
              <Gauge value={twin.overallScore} label="Overall" color="#fb7185" />
            </div>
          </div>

          {/* AI Insights */}
          {twin.aiInsightsSummary && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">AI Executive Summary</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{twin.aiInsightsSummary}</p>
            </div>
          )}

          {/* Risks & Opportunities */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Top Risks</h3>
              </div>
              {(twin.topRisks ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No risks computed yet. Recompute to generate.</p>
              ) : (
                <div className="space-y-3">
                  {(twin.topRisks as any[]).map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${r.severity === 'high' ? 'bg-red-100 text-red-700' : r.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{r.severity}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.title}</p>
                        <p className="text-xs text-gray-500">{r.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-green-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Top Opportunities</h3>
              </div>
              {(twin.topOpportunities ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No opportunities computed yet. Recompute to generate.</p>
              ) : (
                <div className="space-y-3">
                  {(twin.topOpportunities as any[]).map((o: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${o.impact === 'high' ? 'bg-green-100 text-green-700' : o.impact === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{o.impact}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{o.title}</p>
                        <p className="text-xs text-gray-500">{o.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* History */}
          {history.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="p-4 border-b border-gray-50">
                <h3 className="font-semibold text-gray-900 text-sm">Score History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-50 text-xs text-gray-500">
                    <th className="text-left p-3">Date</th>
                    <th className="text-center p-3">Overall</th>
                    <th className="text-center p-3">Health</th>
                    <th className="text-center p-3">Growth</th>
                    <th className="text-center p-3">Risk</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map((h: any) => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-600">{new Date(h.computedAt).toLocaleString()}</td>
                        <td className="p-3 text-center font-semibold text-gray-900">{Math.round(h.overallScore)}</td>
                        <td className="p-3 text-center text-green-600">{Math.round(h.healthScore)}</td>
                        <td className="p-3 text-center text-blue-600">{Math.round(h.growthScore)}</td>
                        <td className="p-3 text-center text-red-600">{Math.round(h.riskScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No digital twin yet</h3>
          <p className="text-sm text-gray-500 mb-4">Click Recompute Twin to generate your company's first digital twin</p>
          <button onClick={handleCompute} disabled={computing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {computing ? 'Computing...' : 'Compute Now'}
          </button>
        </div>
      )}
    </div>
  )
}
