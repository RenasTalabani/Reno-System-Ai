'use client'

import { useEffect, useState } from 'react'
import { Brain, CheckCheck, AlertTriangle, TrendingUp, Zap, Info } from 'lucide-react'

interface Insight {
  id: string
  type: string
  module: string | null
  severity: string
  title: string
  description: string
  metric: string | null
  metricValue: number | null
  confidence: number | null
  actionable: boolean
  action: string | null
  isRead: boolean
  isDismissed: boolean
  createdAt: string
}

const SEVERITY_STYLES: Record<string, { card: string; dot: string; icon: any }> = {
  info: { card: 'border-l-4 border-blue-400 bg-blue-50', dot: 'bg-blue-400', icon: Info },
  warning: { card: 'border-l-4 border-yellow-400 bg-yellow-50', dot: 'bg-yellow-400', icon: AlertTriangle },
  critical: { card: 'border-l-4 border-red-500 bg-red-50', dot: 'bg-red-500', icon: AlertTriangle },
}

const TYPE_ICON: Record<string, any> = {
  anomaly: AlertTriangle,
  trend: TrendingUp,
  forecast: TrendingUp,
  recommendation: Zap,
  alert: AlertTriangle,
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all')

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (filter === 'unread') params.set('unreadOnly', 'true')
    if (filter === 'critical') params.set('severity', 'critical')

    fetch(`/api/v1/analytics/insights?${params}`)
      .then(r => r.json())
      .then(d => { setInsights(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const generate = async () => {
    setGenerating(true)
    await fetch('/api/v1/analytics/insights/generate', { method: 'POST' })
    setGenerating(false)
    load()
  }

  const markAllRead = async () => {
    await fetch('/api/v1/analytics/insights/mark-all-read', { method: 'POST' })
    load()
  }

  const dismiss = async (id: string) => {
    await fetch(`/api/v1/analytics/insights/${id}/dismiss`, { method: 'PATCH' })
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const markRead = async (id: string) => {
    await fetch(`/api/v1/analytics/insights/${id}/read`, { method: 'PATCH' })
    setInsights(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i))
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain size={22} className="text-indigo-600" />
            AI Insights
          </h1>
          <p className="text-gray-500 text-sm mt-1">{total} active insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5">
            <CheckCheck size={14} /> Mark all read
          </button>
          <button onClick={generate} disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <Brain size={14} />
            {generating ? 'Generating...' : 'Generate Insights'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'unread', 'critical'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-lg font-medium capitalize transition-colors ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400">Loading insights...</div>
      ) : insights.length === 0 ? (
        <div className="py-12 text-center">
          <Brain size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">
            {filter === 'all' ? 'No insights yet. Click "Generate Insights" to analyze your data.' : `No ${filter} insights`}
          </p>
          {filter === 'all' && (
            <button onClick={generate} disabled={generating}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate Insights Now'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map(insight => {
            const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info
            const TypeIcon = TYPE_ICON[insight.type] ?? Info
            return (
              <div key={insight.id} className={`rounded-xl p-4 ${style.card} ${!insight.isRead ? 'ring-1 ring-inset ring-current/20' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    insight.severity === 'critical' ? 'bg-red-100' : insight.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <TypeIcon size={14} className={
                      insight.severity === 'critical' ? 'text-red-600' : insight.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{insight.title}</span>
                      {!insight.isRead && (
                        <span className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium">New</span>
                      )}
                      {insight.module && (
                        <span className="text-xs text-gray-400 capitalize">{insight.module}</span>
                      )}
                      {insight.confidence != null && (
                        <span className="text-xs text-gray-400">{(Number(insight.confidence) * 100).toFixed(0)}% confidence</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{insight.description}</p>
                    {insight.actionable && insight.action && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <Zap size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-indigo-700 font-medium">{insight.action}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{new Date(insight.createdAt).toLocaleString()}</span>
                      <span className="capitalize">{insight.type}</span>
                      {insight.metric && insight.metricValue != null && (
                        <span>{insight.metric}: {Number(insight.metricValue).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!insight.isRead && (
                      <button onClick={() => markRead(insight.id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50" title="Mark as read">
                        <CheckCheck size={12} />
                      </button>
                    )}
                    <button onClick={() => dismiss(insight.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Dismiss">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
