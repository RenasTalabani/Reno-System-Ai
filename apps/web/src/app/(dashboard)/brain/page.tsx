'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, MessageSquare, Zap, AlertTriangle, TrendingUp, Users, Package, ShoppingCart, Factory, BarChart3, Crown, Workflow, Activity } from 'lucide-react'

interface DashboardData {
  usage: { tokensThisMonth: number; quota: number | null; quotaUsedPercent: number | null; requestsThisMonth: number; estimatedCostUsd: string }
  byAgent: { agent: string; tokens: number; requests: number }[]
  recentConversations: { id: string; title: string | null; lastMessageAt: string | null; messageCount: number; agent: { name: string; slug: string; iconName: string | null; color: string | null } }[]
  pendingActions: number
  totalConversations: number
  activeAgentCount: number
  provider: { provider: string; model: string; name: string; configured: boolean }
}

interface Agent {
  id: string
  slug: string
  name: string
  title: string
  description: string | null
  iconName: string | null
  color: string | null
  modules: string[] | null
  _count: { conversations: number }
}

const ICON_MAP: Record<string, any> = {
  Crown, Workflow, UsersRound: Users, TrendingUp, BarChart3,
  Package, ShoppingCart, Factory, Activity, Brain, MessageSquare,
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  teal: 'bg-teal-50 text-teal-600 border-teal-200',
}

function AgentIcon({ iconName, color, size = 20 }: { iconName: string | null; color: string | null; size?: number }) {
  const Icon = ICON_MAP[iconName ?? 'Brain'] ?? Brain
  return <Icon size={size} />
}

export default function BrainPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/brain/dashboard').then(r => r.json()),
      fetch('/api/v1/brain/agents').then(r => r.json()),
    ]).then(([d, a]) => {
      setData(d.data)
      setAgents(a.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading Reno Brain...</div>
  if (!data) return <div className="p-6 text-gray-500">No data</div>

  const quotaPct = data.usage.quotaUsedPercent ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reno Brain</h1>
            <p className="text-gray-500 text-sm">Central AI Intelligence Layer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!data.provider.configured && (
            <Link href="/brain/providers"
              className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg hover:bg-yellow-100">
              Configure AI Provider
            </Link>
          )}
          <Link href="/brain/chat"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            <MessageSquare size={14} />
            Start Chat
          </Link>
        </div>
      </div>

      {/* Provider Status */}
      <div className={`rounded-xl p-4 border flex items-center gap-3 ${data.provider.configured ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${data.provider.configured ? 'bg-green-500' : 'bg-yellow-400'}`} />
        <span className="text-sm font-medium">
          {data.provider.configured
            ? `${data.provider.name} — ${data.provider.model} — Connected`
            : 'Demo Mode — No AI provider configured. Responses will be simulated.'}
        </span>
        {!data.provider.configured && (
          <Link href="/brain/providers" className="ml-auto text-xs text-yellow-700 underline">Configure →</Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tokens This Month', value: (data.usage.tokensThisMonth).toLocaleString(), sub: data.usage.quota ? `${data.usage.quotaUsedPercent}% of quota` : 'No quota set' },
          { label: 'AI Requests', value: data.usage.requestsThisMonth.toString(), sub: 'This month' },
          { label: 'Conversations', value: data.totalConversations.toString(), sub: 'All time' },
          { label: 'Pending Actions', value: data.pendingActions.toString(), sub: 'Awaiting approval', urgent: data.pendingActions > 0 },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border p-4 ${s.urgent ? 'border-orange-300' : 'border-gray-200'}`}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.urgent ? 'text-orange-600' : 'text-gray-900'}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Token Quota Bar */}
      {data.usage.quota && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Monthly Token Quota</span>
            <span className="text-gray-500">{data.usage.tokensThisMonth.toLocaleString()} / {data.usage.quota.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${quotaPct >= 90 ? 'bg-red-500' : quotaPct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, quotaPct)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Est. cost: ${data.usage.estimatedCostUsd}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Agents */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Agents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {agents.map(agent => {
              const colorClass = COLOR_MAP[agent.color ?? 'indigo'] ?? COLOR_MAP.indigo
              return (
                <Link key={agent.id} href={`/brain/chat?agent=${agent.slug}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all hover:border-indigo-300 group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colorClass}`}>
                      <AgentIcon iconName={agent.iconName} color={agent.color} size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{agent.name}</p>
                      <p className="text-xs text-gray-400 truncate">{agent.title}</p>
                    </div>
                  </div>
                  {agent.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{agent.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {(agent.modules as string[] ?? []).slice(0, 3).map(m => (
                        <span key={m} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{m}</span>
                      ))}
                      {(agent.modules as string[] ?? []).length > 3 && (
                        <span className="text-xs text-gray-400">+{(agent.modules as string[]).length - 3}</span>
                      )}
                    </div>
                    <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Chat →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Recent Conversations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Conversations</h3>
              <Link href="/brain/chat" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {data.recentConversations.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">No conversations yet</div>
              ) : data.recentConversations.map(conv => (
                <Link key={conv.id} href={`/brain/chat?conversation=${conv.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Brain size={12} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{conv.title ?? 'Conversation'}</p>
                    <p className="text-xs text-gray-400">{conv.agent.name} · {conv.messageCount} msgs</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Brain Tools</h3>
            <div className="space-y-1">
              {[
                { label: 'Actions Queue', sub: `${data.pendingActions} pending`, href: '/brain/actions', icon: Zap, urgent: data.pendingActions > 0 },
                { label: 'Prompt Templates', sub: 'Reusable prompts', href: '/brain/templates', icon: MessageSquare },
                { label: 'AI Memory', sub: 'Stored context', href: '/brain/memory', icon: Brain },
                { label: 'Audit Logs', sub: 'All AI actions', href: '/brain/audit', icon: Activity },
                { label: 'Providers', sub: data.provider.name, href: '/brain/providers', icon: TrendingUp },
              ].map(item => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.urgent ? 'bg-orange-50' : 'bg-gray-50'}`}>
                      <Icon size={12} className={item.urgent ? 'text-orange-500' : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${item.urgent ? 'text-orange-700' : 'text-gray-800'}`}>{item.label}</p>
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
