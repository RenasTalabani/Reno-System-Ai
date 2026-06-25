'use client'

import { useEffect, useState } from 'react'
import { Layers, Plus, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', assumptionInput: '', assumptions: [] as string[] })
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    fetch('/api/v1/ai-exec/scenarios').then(r => r.json()).then(d => { setScenarios(d.data ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const addAssumption = () => {
    if (!form.assumptionInput.trim()) return
    setForm(f => ({ ...f, assumptions: [...f.assumptions, f.assumptionInput.trim()], assumptionInput: '' }))
  }

  const simulate = async () => {
    if (!form.name.trim()) return
    setSimulating(true)
    try {
      const res = await fetch('/api/v1/ai-exec/scenarios/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, assumptions: form.assumptions }),
      }).then(r => r.json())
      if (res.data) {
        setScenarios(prev => [res.data, ...prev])
        setExpanded(res.data.id)
        setForm({ name: '', description: '', assumptionInput: '', assumptions: [] })
        setShowForm(false)
      }
    } finally { setSimulating(false) }
  }

  const del = async (id: string) => {
    await fetch(`/api/v1/ai-exec/scenarios/${id}`, { method: 'DELETE' })
    setScenarios(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scenario Planner</h1>
          <p className="text-sm text-gray-500">What-if simulations for strategic planning</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" />New Scenario
        </button>
      </div>

      {/* New scenario form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Create What-If Scenario</h3>
          <div className="space-y-3">
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Scenario name (e.g. 'What if we expand to 3 new markets?')"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="Optional description..." rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Assumptions</p>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Add an assumption..." value={form.assumptionInput}
                  onChange={e => setForm(f => ({ ...f, assumptionInput: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addAssumption()} />
                <button onClick={addAssumption} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Add</button>
              </div>
              {form.assumptions.map((a, i) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">• {a}</span>
                  <button onClick={() => setForm(f => ({ ...f, assumptions: f.assumptions.filter((_, j) => j !== i) }))} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={simulate} disabled={simulating || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {simulating ? <><Loader2 className="w-4 h-4 animate-spin" />Simulating...</> : 'Run Simulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading scenarios...</div> :
        scenarios.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No scenarios yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a what-if scenario to simulate business outcomes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{s.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.scenarioType?.replace('_', '-')}</span>
                      <span className="text-xs text-gray-500">Confidence: {Math.round((s.confidence ?? 0) * 100)}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); del(s.id) }} className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expanded === s.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {expanded === s.id && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
                    {s.narrative && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Analysis</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{s.narrative}</p>
                      </div>
                    )}
                    {s.projections && Object.keys(s.projections).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Projected Outcomes</p>
                        <div className="grid grid-cols-3 gap-3">
                          {Object.entries(s.projections).map(([k, v]: [string, any]) => (
                            typeof v === 'number' ? (
                              <div key={k} className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                                <p className="text-lg font-bold text-gray-900">{v > 1000 ? `$${v.toLocaleString()}` : v}</p>
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                    {(s.riskFactors as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Risk Factors</p>
                        <ul className="space-y-1">
                          {(s.riskFactors as string[]).map((r: string, i: number) => (
                            <li key={i} className="text-xs text-red-600 flex gap-1"><span>•</span>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(s.assumptions as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Assumptions</p>
                        <ul className="space-y-0.5">
                          {(s.assumptions as string[]).map((a: string, i: number) => (
                            <li key={i} className="text-xs text-gray-500 flex gap-1"><span>•</span>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
