'use client'

import { useEffect, useState } from 'react'
import { Brain, Plus, CheckCircle, Circle } from 'lucide-react'
import Link from 'next/link'

interface Agent {
  id: string
  slug: string
  name: string
  title: string
  description: string | null
  iconName: string | null
  color: string | null
  modules: string[] | null
  isSystem: boolean
  isActive: boolean
  _count: { conversations: number }
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

const MODULE_COLORS: Record<string, string> = {
  finance: 'bg-green-100 text-green-700',
  sales: 'bg-blue-100 text-blue-700',
  crm: 'bg-cyan-100 text-cyan-700',
  hr: 'bg-purple-100 text-purple-700',
  inventory: 'bg-yellow-100 text-yellow-700',
  procurement: 'bg-orange-100 text-orange-700',
  manufacturing: 'bg-red-100 text-red-700',
  projects: 'bg-indigo-100 text-indigo-700',
  analytics: 'bg-teal-100 text-teal-700',
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/brain/agents')
      .then(r => r.json())
      .then(d => setAgents(d.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const systemAgents = agents.filter(a => a.isSystem)
  const customAgents = agents.filter(a => !a.isSystem)

  if (loading) return <div className="p-6 text-gray-500">Loading agents...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-500 text-sm">Brain agents with cross-module context access</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={14} />
          Custom Agent
        </button>
      </div>

      {/* System Agents */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">System Agents</h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{systemAgents.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {systemAgents.map(agent => {
            const colorClass = COLOR_MAP[agent.color ?? 'indigo'] ?? COLOR_MAP.indigo
            return (
              <div key={agent.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Brain size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{agent.name}</p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">System</span>
                    </div>
                    <p className="text-xs text-gray-400">{agent.title}</p>
                  </div>
                </div>
                {agent.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{agent.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(agent.modules as string[] ?? []).map(m => (
                    <span key={m} className={`text-xs px-2 py-0.5 rounded-full ${MODULE_COLORS[m] ?? 'bg-gray-100 text-gray-600'}`}>{m}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{agent._count.conversations} conversations</span>
                  <Link href={`/brain/chat?agent=${agent.slug}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Chat →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Custom Agents */}
      {customAgents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Custom Agents</h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{customAgents.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customAgents.map(agent => {
              const colorClass = COLOR_MAP[agent.color ?? 'indigo'] ?? COLOR_MAP.indigo
              return (
                <div key={agent.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Brain size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{agent.name}</p>
                        {agent.isActive
                          ? <CheckCircle size={12} className="text-green-500" />
                          : <Circle size={12} className="text-gray-300" />}
                      </div>
                      <p className="text-xs text-gray-400">{agent.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(agent.modules as string[] ?? []).map(m => (
                      <span key={m} className={`text-xs px-2 py-0.5 rounded-full ${MODULE_COLORS[m] ?? 'bg-gray-100 text-gray-600'}`}>{m}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{agent._count.conversations} conversations</span>
                    <Link href={`/brain/chat?agent=${agent.slug}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Chat →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {agents.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Brain size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No agents found. Run seed to load system agents.</p>
        </div>
      )}
    </div>
  )
}
