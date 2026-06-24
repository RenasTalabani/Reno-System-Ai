'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp,
  Users, BarChart3, ArrowRight, Zap, Star,
} from 'lucide-react'

interface DashboardData {
  summary: {
    totalOpen: number
    totalInProgress: number
    totalWaiting: number
    totalResolved: number
    totalClosed: number
    totalActive: number
    totalSlaBreached: number
    createdToday: number
    resolvedToday: number
  }
  byPriority: Record<string, number>
  bySource: Record<string, number>
  csat: { average: number | null; responses: number }
  recentTickets: any[]
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default function HelpdeskPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const token = () => localStorage.getItem('accessToken') ?? ''

  useEffect(() => {
    fetch('/api/v1/helpdesk/dashboard', {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => r.json()).then(res => {
      if (res.success) setData(res.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const s = data?.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Desk</h1>
          <p className="text-sm text-gray-500 mt-1">Support center overview and ticket management</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/helpdesk/tickets?status=open" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Ticket className="w-4 h-4" /> All Tickets
          </Link>
          <Link href="/helpdesk/tickets/new" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            + New Ticket
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: s?.totalOpen ?? 0, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50', link: '/helpdesk/tickets?status=open' },
          { label: 'In Progress', value: s?.totalInProgress ?? 0, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/helpdesk/tickets?status=in_progress' },
          { label: 'SLA Breached', value: s?.totalSlaBreached ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', link: '/helpdesk/tickets?slaBreached=true' },
          { label: 'Resolved Today', value: s?.resolvedToday ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', link: '/helpdesk/tickets?status=resolved' },
        ].map(card => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.link} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Created Today</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{s?.createdToday ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500" />
            <p className="text-sm font-medium text-gray-600">Avg CSAT</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data?.csat.average != null ? `${data.csat.average}/5` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{data?.csat.responses ?? 0} responses</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-medium text-gray-600">Active Queue</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{s?.totalActive ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* By Priority */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Open Tickets by Priority</p>
          <div className="space-y-2">
            {['critical', 'high', 'medium', 'low'].map(p => (
              <div key={p} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[p]}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
                <span className="text-sm font-semibold text-gray-800">{data?.byPriority[p] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Source */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Tickets by Source</p>
          <div className="space-y-2">
            {Object.entries(data?.bySource ?? {}).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-xs text-gray-600 capitalize">{source.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-gray-800">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Quick Links</p>
          <div className="space-y-2">
            {[
              { label: 'SLA Dashboard', href: '/helpdesk/tickets?slaBreached=true', icon: AlertTriangle },
              { label: 'Agent Workload', href: '/helpdesk/agents', icon: Users },
              { label: 'SLA Policies', href: '/helpdesk/sla', icon: BarChart3 },
              { label: 'Categories', href: '/helpdesk/categories', icon: Ticket },
            ].map(link => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1">
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Recent Tickets</p>
          <Link href="/helpdesk/tickets" className="text-xs text-indigo-600 hover:text-indigo-700">View all</Link>
        </div>
        {!data?.recentTickets.length ? (
          <div className="p-12 text-center text-gray-400 text-sm">No tickets yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.recentTickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/helpdesk/tickets/${t.id}`} className="font-mono text-xs text-indigo-600 hover:text-indigo-700">{t.number}</Link>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/helpdesk/tickets/${t.id}`} className="text-gray-800 hover:text-indigo-600 line-clamp-1">{t.subject}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? ''}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
