'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2 } from 'lucide-react'

const PREDICTION_TYPES = [
  { key: 'health', label: 'Company Health', desc: '30-day health score prediction', icon: '🏥', color: 'text-green-600' },
  { key: 'risk', label: 'Business Risk', desc: '30-day risk assessment', icon: '⚠️', color: 'text-red-600' },
  { key: 'cashflow', label: 'Cash Flow', desc: '30-day cash projection', icon: '💰', color: 'text-blue-600' },
  { key: 'revenue', label: 'Revenue', desc: '30-day revenue forecast', icon: '📈', color: 'text-purple-600' },
  { key: 'inventory', label: 'Inventory Risk', desc: '30-day shortage risk', icon: '📦', color: 'text-orange-600' },
  { key: 'turnover', label: 'Staff Turnover', desc: '90-day turnover risk', icon: '👥', color: 'text-pink-600' },
]

function TrendIcon({ trend }: { trend: string }) {
  if (!trend) return <Minus className="w-4 h-4 text-gray-400" />
  const up = ['improving', 'positive', 'growth', 'decreasing']
  const down = ['declining', 'negative', 'decline', 'increasing', 'worsening']
  if (up.some(t => trend?.includes(t))) return <TrendingUp className="w-4 h-4 text-green-500" />
  if (down.some(t => trend?.includes(t))) return <TrendingDown className="w-4 h-4 text-red-500" />
  return <Minus className="w-4 h-4 text-gray-400" />
}

export default function PredictionsPage() {
  const [latest, setLatest] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  const load = () => {
    fetch('/api/v1/ai-exec/predictions/latest').then(r => r.json()).then(d => { setLatest(d.data ?? {}); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const compute = async () => {
    setComputing(true)
    try {
      await fetch('/api/v1/ai-exec/predictions/compute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: PREDICTION_TYPES.map(t => t.key) }),
      })
      load()
    } finally { setComputing(false) }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading predictions...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Predictions</h1>
          <p className="text-sm text-gray-500">AI-powered forecasts across all business dimensions</p>
        </div>
        <button onClick={compute} disabled={computing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {computing ? <><Loader2 className="w-4 h-4 animate-spin" />Computing...</> : <><RefreshCw className="w-4 h-4" />Run All Predictions</>}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {PREDICTION_TYPES.map(pt => {
          const pred = latest[pt.key]
          const p = pred?.prediction ?? {}
          const mainValue = p.score ?? p.riskScore ?? p.projectedCash ?? p.projectedRevenue ?? p.shortageRisk ?? p.turnoverRisk ?? null

          return (
            <div key={pt.key} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{pt.icon}</span>
                {pred && <TrendIcon trend={pred.prediction?.trend ?? ''} />}
              </div>
              <h3 className="font-semibold text-gray-900">{pt.label}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{pt.desc}</p>
              {pred ? (
                <div className="mt-3">
                  <div className="flex items-end gap-2">
                    <span className={`text-2xl font-bold ${pt.color}`}>
                      {mainValue !== null ? (typeof mainValue === 'number' && mainValue > 1000 ? `$${Math.round(mainValue).toLocaleString()}` : `${Math.round(mainValue)}${mainValue <= 100 ? '' : ''}`) : 'N/A'}
                    </span>
                    <span className="text-sm text-gray-400 mb-0.5">{mainValue !== null && mainValue <= 100 ? '/100' : ''}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Confidence: {Math.round((pred.confidence ?? 0) * 100)}%</p>
                  {pred.narrative && <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-3">{pred.narrative}</p>}
                  <p className="text-xs text-gray-400 mt-2">Computed: {new Date(pred.computedAt).toLocaleDateString()}</p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-gray-400">No prediction yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Click Run All Predictions</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Key drivers */}
      {Object.values(latest).some((p: any) => p?.keyDrivers?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Key Drivers Across Predictions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(latest).map(([key, pred]: [string, any]) => {
              if (!pred?.keyDrivers?.length) return null
              const pt = PREDICTION_TYPES.find(t => t.key === key)
              return (
                <div key={key}>
                  <p className="text-xs font-medium text-gray-700 mb-1">{pt?.label}</p>
                  <ul className="space-y-1">
                    {(pred.keyDrivers as string[]).slice(0, 3).map((d: string, i: number) => (
                      <li key={i} className="text-xs text-gray-500 flex gap-1">
                        <span className="text-gray-400 shrink-0">•</span>{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
