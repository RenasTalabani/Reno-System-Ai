'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HealthData {
  latest: {
    overallScore: number
    financialScore: number | null
    salesScore: number | null
    operationsScore: number | null
    hrScore: number | null
    inventoryScore: number | null
    revenue: number | null
    expenses: number | null
    grossMargin: number | null
    headcount: number | null
    openOrders: number | null
    inventoryValue: number | null
    aiTrend: string | null
    aiRiskLevel: string | null
    aiInsights: string | null
    aiRecommendations: any[] | null
    snapshotDate: string
  } | null
  history: { snapshotDate: string; overallScore: number; financialScore: number | null; salesScore: number | null; operationsScore: number | null; hrScore: number | null }[]
}

interface Scorecard {
  module: string
  score: number
  color: string
}

const RISK_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const SCORE_COLOR = (s: number) => s >= 75 ? 'text-green-600' : s >= 55 ? 'text-yellow-600' : s >= 35 ? 'text-orange-600' : 'text-red-600'
const SCORE_BAR = (s: number) => s >= 75 ? 'bg-green-500' : s >= 55 ? 'bg-yellow-400' : s >= 35 ? 'bg-orange-500' : 'bg-red-500'

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const s = score ?? 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-sm font-bold ${SCORE_COLOR(s)}`}>{s.toFixed(0)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${SCORE_BAR(s)}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  )
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [scorecards, setScorecards] = useState<Scorecard[]>([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/analytics/health').then(r => r.json()),
      fetch('/api/v1/analytics/health/scorecards').then(r => r.json()),
    ]).then(([h, s]) => {
      setData(h.data)
      setScorecards(s.data ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const compute = async () => {
    setComputing(true)
    await fetch('/api/v1/analytics/health/compute', { method: 'POST' })
    setComputing(false)
    load()
  }

  if (loading) return <div className="p-6 text-gray-500">Loading health scores...</div>

  const latest = data?.latest

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Health Score</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered multi-dimensional health assessment</p>
        </div>
        <button onClick={compute} disabled={computing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <RefreshCw size={14} className={computing ? 'animate-spin' : ''} />
          {computing ? 'Computing...' : 'Recompute'}
        </button>
      </div>

      {!latest ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">No health score computed yet</p>
          <button onClick={compute} disabled={computing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {computing ? 'Computing...' : 'Compute Now'}
          </button>
        </div>
      ) : (
        <>
          {/* Overall Score */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200">Overall Health Score</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`text-7xl font-black ${SCORE_COLOR(Number(latest.overallScore))}`} style={{ WebkitTextStroke: '2px white' }}>
                    <span className="text-white">{Number(latest.overallScore).toFixed(0)}</span>
                  </span>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${RISK_BADGE[latest.aiRiskLevel ?? 'medium']}`}>
                      {latest.aiRiskLevel ?? 'medium'} risk
                    </span>
                    <div className="flex items-center gap-2 mt-2 text-indigo-200">
                      {latest.aiTrend === 'improving' && <><TrendingUp size={16} className="text-green-300" /> Improving</>}
                      {latest.aiTrend === 'declining' && <><TrendingDown size={16} className="text-red-300" /> Declining</>}
                      {latest.aiTrend === 'stable' && <><Minus size={16} /> Stable</>}
                    </div>
                  </div>
                </div>
                <p className="text-indigo-300 text-sm mt-2">
                  Snapshot: {new Date(latest.snapshotDate).toLocaleDateString()}
                </p>
              </div>
              {latest.aiInsights && (
                <div className="bg-white/10 rounded-xl p-4 max-w-xs text-sm text-indigo-100">
                  {latest.aiInsights}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dimension Scores */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Dimension Breakdown</h2>
              <ScoreBar label="Financial Health" score={Number(latest.financialScore ?? 0)} />
              <ScoreBar label="Sales Performance" score={Number(latest.salesScore ?? 0)} />
              <ScoreBar label="Operations & Manufacturing" score={Number(latest.operationsScore ?? 0)} />
              <ScoreBar label="Human Resources" score={Number(latest.hrScore ?? 0)} />
              <ScoreBar label="Inventory & Supply Chain" score={Number(latest.inventoryScore ?? 0)} />
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              {/* Key Metrics */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-sm">
                <h3 className="font-semibold text-gray-900">Key Metrics</h3>
                {latest.revenue != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Revenue MTD</span><span className="font-medium">${Number(latest.revenue).toLocaleString()}</span></div>
                )}
                {latest.grossMargin != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Gross Margin</span><span className="font-medium">{(Number(latest.grossMargin) * 100).toFixed(1)}%</span></div>
                )}
                {latest.headcount != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Headcount</span><span className="font-medium">{latest.headcount}</span></div>
                )}
                {latest.openOrders != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Open Orders</span><span className="font-medium">{latest.openOrders}</span></div>
                )}
                {latest.inventoryValue != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Inventory Value</span><span className="font-medium">${Number(latest.inventoryValue).toLocaleString()}</span></div>
                )}
              </div>

              {/* AI Recommendations */}
              {latest.aiRecommendations && Array.isArray(latest.aiRecommendations) && latest.aiRecommendations.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <h3 className="font-semibold text-indigo-900 mb-3">AI Recommendations</h3>
                  <div className="space-y-2">
                    {(latest.aiRecommendations as any[]).map((rec, i) => (
                      <div key={i} className="text-sm">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium mr-2 ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{rec.priority}</span>
                        <span className="font-medium text-indigo-800">{rec.area}:</span>{' '}
                        <span className="text-indigo-600">{rec.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Historical Trend */}
          {data!.history.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Score History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 font-medium text-gray-500">Date</th>
                      <th className="pb-2 font-medium text-gray-500">Overall</th>
                      <th className="pb-2 font-medium text-gray-500">Finance</th>
                      <th className="pb-2 font-medium text-gray-500">Sales</th>
                      <th className="pb-2 font-medium text-gray-500">Operations</th>
                      <th className="pb-2 font-medium text-gray-500">HR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data!.history.map(h => (
                      <tr key={h.snapshotDate as unknown as string}>
                        <td className="py-2 text-gray-500">{new Date(h.snapshotDate).toLocaleDateString()}</td>
                        <td className={`py-2 font-bold ${SCORE_COLOR(Number(h.overallScore))}`}>{Number(h.overallScore).toFixed(0)}</td>
                        <td className="py-2 text-gray-600">{h.financialScore != null ? Number(h.financialScore).toFixed(0) : '—'}</td>
                        <td className="py-2 text-gray-600">{h.salesScore != null ? Number(h.salesScore).toFixed(0) : '—'}</td>
                        <td className="py-2 text-gray-600">{h.operationsScore != null ? Number(h.operationsScore).toFixed(0) : '—'}</td>
                        <td className="py-2 text-gray-600">{h.hrScore != null ? Number(h.hrScore).toFixed(0) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
