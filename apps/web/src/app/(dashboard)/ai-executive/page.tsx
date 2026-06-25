'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Users, BarChart3, MessageSquare, FileText, Lightbulb, Target, Layers, Bot } from 'lucide-react'

const EXEC_COLORS: Record<string, string> = {
  ceo: 'from-purple-600 to-indigo-600',
  coo: 'from-blue-600 to-cyan-600',
  cfo: 'from-green-600 to-emerald-600',
  chro: 'from-rose-600 to-pink-600',
  sales_director: 'from-orange-500 to-amber-500',
  procurement_director: 'from-teal-600 to-green-600',
  production_director: 'from-yellow-600 to-orange-600',
  support_director: 'from-sky-600 to-blue-600',
  project_director: 'from-violet-600 to-purple-600',
  analyst: 'from-slate-600 to-gray-600',
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">{score}</span>
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

export default function AiExecutivePage() {
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/ai-exec/dashboard').then(r => r.json()).then(d => { setDashboard(d.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading AI Executive Layer...</div>

  const twin = dashboard?.digitalTwin
  const kpis = dashboard?.kpis ?? {}
  const financials = dashboard?.financials ?? {}
  const pendingApprovals = dashboard?.pendingApprovals ?? {}

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Executive Layer</h1>
            <p className="text-sm text-gray-500">Your AI Board of Directors — {dashboard?.company?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/ai-executive/digital-twin" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
            Digital Twin
          </Link>
          <Link href="/ai-executive/predictions" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            Run Predictions
          </Link>
        </div>
      </div>

      {/* Digital Twin Scores */}
      {twin && (
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Company Digital Twin</h2>
              <p className="text-indigo-200 text-sm">Last computed: {twin.computedAt ? new Date(twin.computedAt).toLocaleString() : 'Never'}</p>
            </div>
            <Link href="/ai-executive/digital-twin" className="text-indigo-200 hover:text-white text-sm underline">View Full Twin →</Link>
          </div>
          <div className="flex gap-6 justify-around">
            <ScoreRing score={Math.round(twin.overallScore)} label="Overall" color="#a78bfa" />
            <ScoreRing score={Math.round(twin.healthScore)} label="Health" color="#34d399" />
            <ScoreRing score={Math.round(twin.growthScore)} label="Growth" color="#60a5fa" />
            <ScoreRing score={Math.round(twin.efficiencyScore)} label="Efficiency" color="#f59e0b" />
            <ScoreRing score={Math.round(100 - twin.riskScore)} label="Risk Safety" color="#f87171" />
          </div>
          {twin.aiInsightsSummary && (
            <p className="mt-4 text-indigo-100 text-sm border-t border-indigo-700 pt-4">{twin.aiInsightsSummary}</p>
          )}
        </div>
      )}

      {/* Pending Approvals Alert */}
      {pendingApprovals.total > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">{pendingApprovals.total} item{pendingApprovals.total !== 1 ? 's' : ''} awaiting your approval</p>
            <p className="text-sm text-amber-700">{pendingApprovals.proposals} proposals · {pendingApprovals.recommendations} recommendations</p>
          </div>
          <div className="flex gap-2">
            <Link href="/ai-executive/proposals?status=pending_approval" className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
              Review Proposals
            </Link>
            <Link href="/ai-executive/recommendations?status=pending" className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50">
              Review Recs
            </Link>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (Month)', value: `$${(financials.revenueThisMonth ?? 0).toLocaleString()}`, trend: financials.revenueGrowthPct, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Cash Balance', value: `$${(financials.cashBalance ?? 0).toLocaleString()}`, trend: null, icon: BarChart3, color: 'text-blue-600' },
          { label: 'Open Tickets (SLA)', value: `${dashboard?.helpdesk?.openTickets ?? 0} / ${dashboard?.helpdesk?.slaBreaches ?? 0} breached`, trend: null, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Headcount', value: `${dashboard?.hr?.headcount ?? 0} active`, trend: null, icon: Users, color: 'text-purple-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            {kpi.trend !== null && kpi.trend !== undefined && (
              <p className={`text-xs mt-1 ${kpi.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trend >= 0 ? '↑' : '↓'} {Math.abs(kpi.trend)}% MoM
              </p>
            )}
          </div>
        ))}
      </div>

      {/* AI Executives Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Your AI Board of Directors</h2>
          <Link href="/ai-executive/reports" className="text-sm text-indigo-600 hover:underline">Generate Reports →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(dashboard?.executives ?? []).map((exec: any) => (
            <Link key={exec.role} href={`/ai-executive/chat/${exec.role}`}
              className={`bg-gradient-to-br ${EXEC_COLORS[exec.role] ?? 'from-gray-600 to-gray-700'} rounded-xl p-4 text-white hover:opacity-90 transition-opacity`}>
              <Bot className="w-6 h-6 mb-2 opacity-80" />
              <p className="font-semibold text-sm leading-tight">{exec.name}</p>
              <p className="text-xs opacity-70 mt-1">{exec.title}</p>
              <div className="mt-3 flex items-center gap-1 text-xs opacity-80">
                <MessageSquare className="w-3 h-3" />
                <span>Chat</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/ai-executive/reports', icon: FileText, label: 'Reports', sub: 'Board, CEO, Daily Ops' },
          { href: '/ai-executive/predictions', icon: TrendingUp, label: 'Predictions', sub: 'Health, Risk, Revenue' },
          { href: '/ai-executive/scenarios', icon: Layers, label: 'Scenarios', sub: 'What-if Analysis' },
          { href: '/ai-executive/decisions', icon: Target, label: 'Decisions', sub: 'History & Lessons' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <item.icon className="w-5 h-5 text-indigo-600 mb-2" />
            <p className="font-medium text-gray-900 text-sm">{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent Reports */}
      {dashboard?.recentReports?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Reports</h3>
            <Link href="/ai-executive/reports" className="text-xs text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {dashboard.recentReports.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500">{r.reportType?.replace(/_/g, ' ')} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <Link href={`/ai-executive/reports`} className="text-xs text-indigo-600 hover:underline shrink-0">View</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
