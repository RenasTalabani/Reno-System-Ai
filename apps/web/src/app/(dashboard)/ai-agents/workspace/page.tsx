'use client'

import { useEffect, useState } from 'react'
import { Layers, Bot, ChevronDown, ChevronUp } from 'lucide-react'

interface Workspace {
  id: string; name: string; createdBy: string; updatedBy: string | null
  content: Record<string, unknown>; createdAt: string; updatedAt: string
}

export default function AiWorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/ai-agents/workspace/list').then(r => r.json())
      .then(d => { setWorkspaces(d.workspaces ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Layers size={20} className="text-violet-600" />
        <h1 className="text-xl font-bold text-gray-900">Shared AI Workspace</h1>
      </div>
      <p className="text-sm text-gray-500">All data collected and shared between agents during collaborative tasks.</p>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          : !workspaces.length ? (
            <div className="p-8 text-center text-gray-400"><Layers size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">No workspace data yet. Run a collaborative task to populate.</p></div>
          ) : workspaces.map(ws => {
            const isExpanded = expandedId === ws.id
            const contentKeys = Object.keys(ws.content ?? {})
            return (
              <div key={ws.id}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : ws.id)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 text-left">
                  <Bot size={14} className="text-violet-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{ws.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Created by {ws.createdBy} · {contentKeys.length} agent contributions · {new Date(ws.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-400 shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-gray-400 shrink-0 mt-0.5" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {contentKeys.map(key => {
                      const entry = ws.content[key] as any
                      return (
                        <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-semibold text-violet-700 mb-1">{entry?.title ?? key}</div>
                          <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {typeof entry?.analysis === 'string' ? entry.analysis : JSON.stringify(entry, null, 2).slice(0, 500) as string}
                          </div>
                        </div>
                      )
                    })}
                    {!!ws.content['summary'] && (
                      <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                        <div className="text-xs font-semibold text-violet-800 mb-1">Executive Summary (CEO)</div>
                        <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {String(ws.content['summary']).slice(0, 1500)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
