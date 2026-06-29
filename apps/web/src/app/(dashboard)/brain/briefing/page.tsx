'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Newspaper, TrendingUp, AlertTriangle, Lightbulb, Target,
  RefreshCw, Eye, Calendar, ChevronRight, Clock,
} from 'lucide-react'

interface Insight {
  type: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  module: string
}

interface UrgentItem {
  title: string
  description: string
  action: string
  module: string
}

interface Priority {
  title: string
  description: string
  confidence: number
  impact: string
}

interface Briefing {
  id: string
  briefingDate: string
  headline: string
  summary: string
  keyMetrics: Record<string, number>
  topInsights: Insight[]
  urgentItems: UrgentItem[]
  todayPriorities: Priority[]
  businessMood: string
  generatedAt: string
}

const MOOD_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  excellent: { color: 'text-emerald-500', label: 'Excellent', emoji: '🚀' },
  good: { color: 'text-green-500', label: 'Good', emoji: '📈' },
  stable: { color: 'text-blue-500', label: 'Stable', emoji: '✅' },
  cautious: { color: 'text-amber-500', label: 'Cautious', emoji: '⚠️' },
  critical: { color: 'text-red-500', label: 'Critical', emoji: '🔴' },
}

const PRIORITY_COLORS = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const fetchBriefing = async () => {
    try {
      const res = await fetch('/api/v1/brain/briefing/today')
      if (res.ok) setBriefing(await res.json() as Briefing)
    } finally {
      setLoading(false)
    }
  }

  const regenerate = async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/v1/brain/briefing/generate', { method: 'POST' })
      if (res.ok) setBriefing(await res.json() as Briefing)
    } finally {
      setRegenerating(false)
    }
  }

  useEffect(() => { void fetchBriefing() }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!briefing) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <Newspaper className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No briefing yet for today</p>
        <button
          type="button"
          onClick={() => void regenerate()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Generate Today&apos;s Briefing
        </button>
      </div>
    )
  }

  const mood = MOOD_CONFIG[briefing.businessMood] ?? MOOD_CONFIG.stable

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(briefing.briefingDate).toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>Generated {new Date(briefing.generatedAt).toLocaleTimeString()}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI Daily Briefing</h1>
        </div>
        <button
          type="button"
          onClick={() => void regenerate()}
          disabled={regenerating}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {/* Headline card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{mood.emoji}</span>
          <div>
            <span className={`text-sm font-semibold ${mood.color}`}>Business Mood: {mood.label}</span>
            <p className="text-lg font-semibold text-foreground mt-0.5">{briefing.headline}</p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{briefing.summary}</p>
      </motion.div>

      {/* Key Metrics */}
      {Object.keys(briefing.keyMetrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(briefing.keyMetrics).map(([key, value]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border bg-card p-3 text-center"
            >
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Items */}
        {briefing.urgentItems.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-foreground">Urgent Items</h2>
            </div>
            <div className="space-y-3">
              {briefing.urgentItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-amber-600 mt-1">→ {item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Insights */}
        {briefing.topInsights.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">AI Insights</h2>
            </div>
            <div className="space-y-3">
              {briefing.topInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_COLORS[insight.priority]}`}>
                    {insight.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's AI Priorities */}
      {briefing.todayPriorities.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Today&apos;s AI Priorities</h2>
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Ranked by AI confidence
            </span>
          </div>
          <div className="space-y-2">
            {briefing.todayPriorities.map((priority, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{priority.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{priority.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{Math.round(priority.confidence * 100)}%</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">{priority.impact}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="h-3 w-3" />
        <span>This briefing was generated from real business data. All insights are evidence-based.</span>
      </div>
    </div>
  )
}
