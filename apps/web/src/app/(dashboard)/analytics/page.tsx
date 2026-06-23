'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Brain, BarChart3, Activity, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface OverviewData {
  health: { overallScore: number | null; trend: string; riskLevel: string; lastUpdated: string | null }
  alerts: { unreadInsights: number; criticalInsights: number }
  finance: { revenueThisMonth: number; expensesThisMonth: number; netMargin: number; openInvoicesCount: number }
  sales: { openOrders: number; closedOrdersThisMonth: number }
  hr: { totalEmployees: number; onLeaveNow: number }
  inventory: { totalStockValue: number; outOfStockProducts: number }
  procurement: { pendingApprovalPOs: number }
  manufacturing: { activeOrders: number; pendingQualityChecks: number }
  projects: { activeProjects: number }
  bi: { totalDashboards: number; totalReports: number }
}

interface Insight {
  id: string
  type: string
  module: string | null
  severity: string
  title: string
  description: string
  actionable: boolean
  action: string | null
  isRead: boolean
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
}

const SEVERITY_DOT: Record<string, string> = {
  info: 'bg-blue-400',
  warning: 'bg-yellow-400',
  critical: 'bg-red-500',
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp size={14} className="text-green-500" />
  if (trend === 'declining') return <TrendingDown size={14} className="text-red-500" />
  return <Minus size={14} className="text-gray-400" />
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [generating, setGenerating] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/analytics/overview').then(r => r.json()),
      fetch('/api/v1/analytics/insights?limit=5').then(r => r.json()),
    ]).then(([ov, ins]) => {
      setOverview(ov.data)
      setInsights(ins.data ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const computeHealth = async () => {
    setComputing(true)
    await fetch('/api/v1/analytics/health/compute', { method: 'POST' })
    setComputing(false)
    load()
  }

  const generateInsights = async () => {
    setGenerating(true)
    await fetch('/api/v1/analytics/insights/generate', { method: 'POST' })
    setGenerating(false)
    load()
  }

  const dismissInsight = async (id: string) => {
    await fetch(`/api/v1/analytics/insights/${id}/dismiss`, { method: 'PATCH' })
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div className="p-6 text-gray-500">Loading analytics...</div>
  if (!overview) return <div className="p-6 text-gray-500">No data available</div>

  const scoreColor = (overview.health.overallScore ?? 0) >= 75 ? 'text-green-600' :
    (overview.health.overallScore ?? 0) >= 55 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">Executive overview across all modules</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateInsights} disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <Brain size={14} />
            {generating ? 'Generating...' : 'Generate Insights'}
          </button>
          <button onClick={computeHealth} disabled={computing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <RefreshCw size={14} className={computing ? 'animate-spin' : ''} />
            {computing ? 'Computing...' : 'Compute Health'}
          </button>
        </div>
      </div>

      {/* Company Health Score */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Company Health Score</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-5xl font-bold">
                {overview.health.overallScore != null ? overview.health.overallScore : '—'}
              </span>
              <div className="text-indigo-200 text-sm">
                <div className="flex items-center gap-1"><TrendIcon trend={overview.health.trend} /><span className="capitalize">{overview.health.trend}</span></div>
                <span className="capitalize">{overview.health.riskLevel} risk</span>
              </div>
            </div>
            {overview.health.lastUpdated && (
              <p className="text-indigo-300 text-xs mt-1">Last computed {new Date(overview.health.lastUpdated).toLocaleDateString()}</p>
            )}
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-indigo-200 text-xs">Alerts</p>
                <p className="text-xl font-bold">{overview.alerts.criticalInsights}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-indigo-200 text-xs">Unread</p>
                <p className="text-xl font-bold">{overview.alerts.unreadInsights}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue MTD', value: fmt(overview.finance.revenueThisMonth), sub: `Net margin: ${overview.finance.netMargin.toFixed(1)}%`, color: 'blue', href: '/finance' },
          { label: 'Open Sales Orders', value: overview.sales.openOrders.toString(), sub: `${overview.sales.closedOrdersThisMonth} closed this month`, color: 'green', href: '/sales' },
          { label: 'Total Employees', value: overview.hr.totalEmployees.toString(), sub: `${overview.hr.onLeaveNow} on leave`, color: 'purple', href: '/hr' },
          { label: 'Stock Value', value: fmt(overview.inventory.totalStockValue), sub: `${overview.inventory.outOfStockProducts} out of stock`, color: 'yellow', href: '/inventory' },
          { label: 'Pending POs', value: overview.procurement.pendingApprovalPOs.toString(), sub: 'Awaiting approval', color: 'orange', href: '/procurement' },
          { label: 'Active MFG Orders', value: overview.manufacturing.activeOrders.toString(), sub: `${overview.manufacturing.pendingQualityChecks} QC pending`, color: 'red', href: '/manufacturing' },
          { label: 'Active Projects', value: overview.projects.activeProjects.toString(), sub: 'In progress', color: 'indigo', href: '/projects' },
          { label: 'Open Invoices', value: overview.finance.openInvoicesCount.toString(), sub: 'Awaiting payment', color: 'pink', href: '/finance' },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Brain size={16} className="text-indigo-500" />
              AI Insights
            </h2>
            <Link href="/analytics/insights" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {insights.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No insights yet. Click "Generate Insights" to analyze your data.
              </div>
            ) : insights.map(insight => (
              <div key={insight.id} className={`px-5 py-4 border-l-4 ${SEVERITY_COLORS[insight.severity] ?? 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[insight.severity] ?? 'bg-gray-400'}`} />
                      <span className="text-sm font-semibold">{insight.title}</span>
                      {insight.module && <span className="text-xs text-gray-400 capitalize">{insight.module}</span>}
                    </div>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                    {insight.actionable && insight.action && (
                      <p className="text-xs mt-1.5 text-gray-500 italic">→ {insight.action}</p>
                    )}
                  </div>
                  <button onClick={() => dismissInsight(insight.id)}
                    className="text-gray-300 hover:text-gray-500 text-xs shrink-0">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Analytics Tools</h3>
            <div className="space-y-2">
              {[
                { label: 'Dashboards', sub: `${overview.bi.totalDashboards} configured`, href: '/analytics/dashboards', icon: BarChart3 },
                { label: 'Reports', sub: `${overview.bi.totalReports} saved`, href: '/analytics/reports', icon: Activity },
                { label: 'KPI Explorer', sub: 'Cross-module metrics', href: '/analytics/kpis', icon: TrendingUp },
                { label: 'Health Scores', sub: 'Department scorecards', href: '/analytics/health', icon: Brain },
                { label: 'Insights Feed', sub: `${overview.alerts.unreadInsights} unread`, href: '/analytics/insights', icon: AlertTriangle },
              ].map(item => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
