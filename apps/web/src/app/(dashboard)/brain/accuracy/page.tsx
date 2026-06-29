'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown, Target, CheckCircle2, XCircle, Clock, Zap, ThumbsUp, ThumbsDown } from 'lucide-react'

interface AccuracyPeriod {
  id: string
  period: string
  periodDate: string
  totalRecs: number
  acceptedRecs: number
  rejectedRecs: number
  ignoredRecs: number
  implementedRecs: number
  avgConfidence: number
  accuracyRate: number
}

interface AccuracySummary {
  daily: AccuracyPeriod | null
  weekly: AccuracyPeriod | null
  monthly: AccuracyPeriod | null
  totalFeedback: number
}

interface TrendPoint {
  periodDate: string
  accuracyRate: number
  totalRecs: number
  acceptedRecs: number
}

const pct = (n: number) => `${Math.round(n * 100)}%`

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: typeof Target; color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  )
}

export default function AccuracyPage() {
  const [summary, setSummary] = useState<AccuracySummary | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [summaryRes, trendRes] = await Promise.all([
        fetch('/api/v1/brain/accuracy'),
        fetch(`/api/v1/brain/accuracy/trend?period=${period}&limit=30`),
      ])
      if (summaryRes.ok) setSummary(await summaryRes.json() as AccuracySummary)
      if (trendRes.ok) {
        const data = await trendRes.json() as { trend: TrendPoint[] }
        setTrend(data.trend)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchData() }, [period])

  const current = summary?.[period] ?? null

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Accuracy & Learning</h1>
          <p className="text-sm text-muted-foreground">Track how AI recommendations improve over time</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Feedback"
              value={String(summary?.totalFeedback ?? 0)}
              sub="All time"
              icon={BarChart3}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              title="Accuracy Rate"
              value={current ? pct(current.accuracyRate) : '—'}
              sub={`${period} period`}
              icon={Target}
              color="bg-green-500/10 text-green-500"
            />
            <StatCard
              title="Accepted"
              value={String(current?.acceptedRecs ?? '—')}
              sub="Recommendations"
              icon={ThumbsUp}
              color="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard
              title="Rejected"
              value={String(current?.rejectedRecs ?? '—')}
              sub="Recommendations"
              icon={ThumbsDown}
              color="bg-red-500/10 text-red-500"
            />
          </div>

          {/* Period breakdown */}
          {current && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-foreground">Recommendation Outcomes</h2>
                <div className="flex rounded-lg border border-border p-0.5">
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors capitalize ${period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Accepted', count: current.acceptedRecs, total: current.totalRecs, icon: CheckCircle2, color: 'bg-green-500' },
                  { label: 'Implemented', count: current.implementedRecs, total: current.totalRecs, icon: Zap, color: 'bg-blue-500' },
                  { label: 'Ignored', count: current.ignoredRecs, total: current.totalRecs, icon: Clock, color: 'bg-amber-500' },
                  { label: 'Rejected', count: current.rejectedRecs, total: current.totalRecs, icon: XCircle, color: 'bg-red-500' },
                ].map((item) => {
                  const Icon = item.icon
                  const ratio = item.total > 0 ? item.count / item.total : 0
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="w-24 text-sm text-foreground">{item.label}</span>
                      <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${ratio * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-sm font-medium text-foreground">{item.count}</span>
                      <span className="w-12 text-right text-xs text-muted-foreground">{pct(ratio)}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total recommendations this period: <strong className="text-foreground">{current.totalRecs}</strong></span>
                <span className="text-muted-foreground">Avg confidence: <strong className="text-foreground">{pct(current.avgConfidence)}</strong></span>
              </div>
            </div>
          )}

          {/* Accuracy trend */}
          {trend.length > 1 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground">Accuracy Trend</h2>
              </div>
              <div className="flex items-end gap-1 h-24">
                {trend.slice().reverse().map((point, i) => {
                  const height = Math.max(4, point.accuracyRate * 100)
                  const isUp = i > 0 && point.accuracyRate >= trend.slice().reverse()[i - 1].accuracyRate
                  return (
                    <div
                      key={point.periodDate}
                      className="flex-1 flex flex-col items-center gap-1 group"
                      title={`${new Date(point.periodDate).toLocaleDateString()}: ${pct(point.accuracyRate)}`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all ${isUp ? 'bg-green-500' : 'bg-red-400'}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">{new Date(trend[trend.length - 1]?.periodDate ?? '').toLocaleDateString()}</span>
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
            </div>
          )}

          {/* Learning insight */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">How AI learns</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Every accepted, rejected, or implemented recommendation is recorded. AI analyzes patterns in rejections to improve future recommendations.
                  Confidence scores evolve based on historical accuracy per category. Lessons are automatically extracted when recommendations are implemented or fail.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
