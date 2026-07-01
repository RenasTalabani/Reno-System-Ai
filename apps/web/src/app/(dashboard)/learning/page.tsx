'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Proxy helpers ─────────────────────────────────────────────────────────────

async function apiGet(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`)
  return r.json()
}
async function apiPost(path: string, body?: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return r.json()
}
async function apiPatch(path: string, body: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  summary: string
  learningScore: { score: number; grade: string }
  stats: {
    totalEvents: number; successEvents: number; failureEvents: number
    positiveFeedback: number; negativeFeedback: number
    openInsights: number; appliedInsights: number
    pendingKgFeedback: number; approvedKgFeedback: number
    latestEvolutionScore: number | null; latestEvolutionTrend: string | null
  }
  topSuggestions: { category: string; priority: string; action: string; impact: string }[]
  recentEvents: LearningEvent[]
}
interface LearningEvent { id: string; eventType: string; sourceModule: string; outcome: string; feedback?: string; createdAt: string }
interface ToolInsight { id: string; title: string; description: string; insightType: string; severity: string; status: string; suggestions: string[]; metrics: Record<string, unknown>; createdAt: string }
interface AgentInsight { id: string; agentId: string; title: string; description: string; insightType: string; severity: string; status: string; suggestions: string[]; createdAt: string }
interface PolicyInsight { id: string; title: string; description: string; insightType: string; severity: string; status: string; affectedPolicies: string[]; suggestion: string }
interface KgFeedback { id: string; feedbackType: string; sourceModule: string; proposedData: Record<string, unknown>; confidence: number; status: string; createdAt: string }
interface EvolutionSnapshot { id: string; snapshotDate: string; period: string; overallScore: number; trend: string; toolMetrics: Record<string, unknown>; agentMetrics: Record<string, unknown>; notes?: string }
interface OptimizationResult { success: boolean; results: Record<string, number>; totalInsightsCreated: number }

const TABS = ['Dashboard', 'Learning Events', 'Tool Insights', 'Agent Insights', 'Policy Insights', 'KG Feedback', 'Evolution'] as const
type Tab = typeof TABS[number]

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700', warning: 'bg-yellow-100 text-yellow-700', critical: 'bg-red-100 text-red-700',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700', acknowledged: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700', dismissed: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
}
const OUTCOME_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-700', failure: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-700',
}
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-blue-100 text-blue-700',
}
const TREND_ICONS: Record<string, string> = { improving: '📈', stable: '➡️', declining: '📉' }
const GRADE_COLORS: Record<string, string> = { A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-orange-600', F: 'text-red-600' }

export default function LearningPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [events, setEvents] = useState<LearningEvent[]>([])
  const [toolInsights, setToolInsights] = useState<ToolInsight[]>([])
  const [agentInsights, setAgentInsights] = useState<AgentInsight[]>([])
  const [policyInsights, setPolicyInsights] = useState<PolicyInsight[]>([])
  const [kgFeedback, setKgFeedback] = useState<KgFeedback[]>([])
  const [snapshots, setSnapshots] = useState<EvolutionSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState({ eventType: 'tool_execution', sourceModule: 'action-layer', outcome: 'success', sourceId: '', feedback: '' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/learning/dashboard'); setDashboard(d) }, [])
  const loadEvents = useCallback(async () => { const d = await apiGet('/v1/learning/events'); setEvents(d.events ?? []) }, [])
  const loadToolInsights = useCallback(async () => { const d = await apiGet('/v1/learning/insights/tools'); setToolInsights(d.insights ?? []) }, [])
  const loadAgentInsights = useCallback(async () => { const d = await apiGet('/v1/learning/insights/agents'); setAgentInsights(d.insights ?? []) }, [])
  const loadPolicyInsights = useCallback(async () => { const d = await apiGet('/v1/learning/insights/policies'); setPolicyInsights(d.insights ?? []) }, [])
  const loadKgFeedback = useCallback(async () => { const d = await apiGet('/v1/learning/kg-feedback'); setKgFeedback(d.feedback ?? []) }, [])
  const loadSnapshots = useCallback(async () => { const d = await apiGet('/v1/learning/evolution'); setSnapshots(d.snapshots ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard,
      'Learning Events': loadEvents,
      'Tool Insights': loadToolInsights,
      'Agent Insights': loadAgentInsights,
      'Policy Insights': loadPolicyInsights,
      'KG Feedback': loadKgFeedback,
      Evolution: loadSnapshots,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadEvents, loadToolInsights, loadAgentInsights, loadPolicyInsights, loadKgFeedback, loadSnapshots])

  const runOptimization = async () => {
    setOptimizing(true); setOptResult(null)
    const r = await apiPost('/v1/learning/run-optimization')
    setOptResult(r)
    setOptimizing(false)
    flash(`Optimization complete — ${r.totalInsightsCreated ?? 0} new insights generated`)
    if (tab === 'Dashboard') await loadDashboard()
  }

  const createSnapshot = async () => {
    const r = await apiPost('/v1/learning/evolution/snapshot', { period: 'daily' })
    flash(`Snapshot created — Score: ${r.score}/100 (${r.trend})`)
    await loadSnapshots()
    if (tab === 'Dashboard') await loadDashboard()
  }

  const analyzeTools = async () => {
    const r = await apiPost('/v1/learning/insights/tools/analyze')
    flash(`Tool analysis: ${r.insightsCreated} new insights`); await loadToolInsights()
  }

  const analyzeAgents = async () => {
    const r = await apiPost('/v1/learning/insights/agents/analyze')
    flash(`Agent analysis: ${r.insightsCreated} new insights`); await loadAgentInsights()
  }

  const analyzePolicies = async () => {
    const r = await apiPost('/v1/learning/insights/policies/analyze')
    flash(`Policy analysis: ${r.insightsCreated} new insights`); await loadPolicyInsights()
  }

  const updateInsightStatus = async (endpoint: string, id: string, status: string, reload: () => Promise<void>) => {
    await apiPatch(`/v1/learning/${endpoint}/${id}`, { status })
    flash(`Insight marked as ${status}`); await reload()
  }

  const reviewKgFeedback = async (id: string, status: 'approved' | 'rejected') => {
    await apiPatch(`/v1/learning/kg-feedback/${id}/review`, { status })
    flash(`Feedback ${status}`); await loadKgFeedback()
    if (tab === 'Dashboard') await loadDashboard()
  }

  const submitFeedback = async (eventId: string, feedback: 'thumbs_up' | 'thumbs_down') => {
    await apiPatch(`/v1/learning/events/${eventId}/feedback`, { feedback })
    flash(`Feedback recorded`); await loadEvents()
  }

  const createEvent = async () => {
    const r = await apiPost('/v1/learning/events', { ...eventForm, sourceId: eventForm.sourceId || undefined, feedback: eventForm.feedback || undefined })
    if (r.error) flash(r.error)
    else { flash('Event recorded'); setShowEventForm(false); setEventForm({ eventType: 'tool_execution', sourceModule: 'action-layer', outcome: 'success', sourceId: '', feedback: '' }); await loadEvents() }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Continuous Learning & Optimization</h1>
          <p className="text-gray-500 text-sm mt-1">Learning Loop · Tool & Agent Insights · Policy Optimizer · KG Feedback · Evolution Dashboard</p>
        </div>
        <button onClick={runOptimization} disabled={optimizing} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
          {optimizing ? 'Analyzing...' : '⚡ Run Full Optimization'}
        </button>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      {optResult && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm">
          <span className="font-medium text-purple-800">Optimization complete:</span>
          <span className="ml-2 text-purple-700">{optResult.results.toolInsights} tool · {optResult.results.agentInsights} agent · {optResult.results.policyInsights} policy insights generated</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* ── Dashboard ─────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-5 text-white">
            <p className="text-lg font-medium">{dashboard.summary}</p>
          </div>

          {/* Score */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-5 text-center">
              <div className={`text-5xl font-bold ${GRADE_COLORS[dashboard.learningScore.grade] ?? 'text-gray-600'}`}>{dashboard.learningScore.grade}</div>
              <div className="text-xs text-gray-400 mt-1">Learning Grade</div>
              <div className="text-lg font-semibold text-gray-700 mt-1">{dashboard.learningScore.score}/100</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-bold text-blue-600">{dashboard.stats.totalEvents}</div>
              <div className="text-xs text-gray-500">Total Events</div>
              <div className="mt-2 text-xs text-gray-400">{dashboard.stats.successEvents} success · {dashboard.stats.failureEvents} failure</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-bold text-yellow-600">{dashboard.stats.openInsights}</div>
              <div className="text-xs text-gray-500">Open Insights</div>
              <div className="mt-2 text-xs text-gray-400">{dashboard.stats.appliedInsights} applied</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-700">{dashboard.stats.latestEvolutionScore ?? '—'}</span>
                {dashboard.stats.latestEvolutionTrend && <span>{TREND_ICONS[dashboard.stats.latestEvolutionTrend]}</span>}
              </div>
              <div className="text-xs text-gray-500">Evolution Score</div>
              <div className="mt-2 text-xs text-gray-400">{dashboard.stats.pendingKgFeedback} KG feedback pending</div>
            </div>
          </div>

          {/* Top Suggestions */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Top Optimization Suggestions</h3>
              <button onClick={createSnapshot} className="text-sm text-indigo-600 hover:underline">Take Evolution Snapshot</button>
            </div>
            {dashboard.topSuggestions.length === 0 ? (
              <p className="text-gray-400 text-sm">No suggestions — system is well-optimized!</p>
            ) : (
              <div className="space-y-3">
                {dashboard.topSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[s.priority] ?? 'bg-gray-100 text-gray-600'}`}>{s.priority}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.impact}</p>
                    </div>
                    <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{s.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Recent Learning Events</h3>
            {dashboard.recentEvents.length === 0 ? (
              <p className="text-gray-400 text-sm">No events yet. Record events via the Learning Events tab or use agents and tools.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentEvents.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${OUTCOME_COLORS[e.outcome] ?? 'bg-gray-100 text-gray-600'}`}>{e.outcome}</span>
                      <span className="text-gray-700">{e.eventType}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{e.sourceModule}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {e.feedback && <span>{e.feedback === 'thumbs_up' ? '👍' : '👎'}</span>}
                      <span>{new Date(e.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Learning Events ───────────────────────────────────────────────────── */}
      {!loading && tab === 'Learning Events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{events.length} events recorded</p>
            <button onClick={() => setShowEventForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">+ Record Event</button>
          </div>

          {showEventForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Record Learning Event</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <select className="border rounded-lg px-3 py-2 text-sm" value={eventForm.eventType} onChange={e => setEventForm(f => ({ ...f, eventType: e.target.value }))}>
                  {['tool_execution','suggestion_accepted','suggestion_rejected','agent_task_result','policy_trigger','kg_query','user_feedback'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={eventForm.sourceModule} onChange={e => setEventForm(f => ({ ...f, sourceModule: e.target.value }))}>
                  {['action-layer','agents-platform','knowledge-graph','brain','automation','custom'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm" value={eventForm.outcome} onChange={e => setEventForm(f => ({ ...f, outcome: e.target.value }))}>
                  {['success','failure','partial','blocked'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Source ID (optional)" value={eventForm.sourceId} onChange={e => setEventForm(f => ({ ...f, sourceId: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createEvent} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Record</button>
                <button onClick={() => setShowEventForm(false)} className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Event Type', 'Module', 'Outcome', 'Feedback', 'Time', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.eventType}</td>
                    <td className="px-4 py-3 text-gray-500">{e.sourceModule}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${OUTCOME_COLORS[e.outcome] ?? 'bg-gray-100 text-gray-600'}`}>{e.outcome}</span></td>
                    <td className="px-4 py-3">{e.feedback === 'thumbs_up' ? '👍' : e.feedback === 'thumbs_down' ? '👎' : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {!e.feedback && (
                        <div className="flex gap-1">
                          <button onClick={() => submitFeedback(e.id, 'thumbs_up')} className="text-green-600 hover:text-green-800">👍</button>
                          <button onClick={() => submitFeedback(e.id, 'thumbs_down')} className="text-red-600 hover:text-red-800">👎</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No events yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tool Insights ─────────────────────────────────────────────────────── */}
      {!loading && tab === 'Tool Insights' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{toolInsights.length} insights</p>
            <button onClick={analyzeTools} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Analyze Tools</button>
          </div>
          {toolInsights.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-2xl mb-2">🔧</p>
              <p>No tool insights yet. Click "Analyze Tools" to scan your active tools.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {toolInsights.map(i => (
                <div key={i.id} className="bg-white rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[i.severity] ?? 'bg-gray-100 text-gray-600'}`}>{i.severity}</span>
                      <h4 className="font-semibold text-gray-800">{i.title}</h4>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{i.description}</p>
                  <div className="space-y-1">
                    {(i.suggestions as string[]).map((s, si) => (
                      <div key={si} className="text-xs text-gray-500 flex items-start gap-2"><span className="text-blue-400 mt-0.5">→</span><span>{s}</span></div>
                    ))}
                  </div>
                  {i.status === 'open' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateInsightStatus('insights/tools', i.id, 'applied', loadToolInsights)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Apply</button>
                      <button onClick={() => updateInsightStatus('insights/tools', i.id, 'acknowledged', loadToolInsights)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200">Acknowledge</button>
                      <button onClick={() => updateInsightStatus('insights/tools', i.id, 'dismissed', loadToolInsights)} className="bg-gray-100 text-gray-500 px-3 py-1 rounded text-xs hover:bg-gray-200">Dismiss</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Agent Insights ────────────────────────────────────────────────────── */}
      {!loading && tab === 'Agent Insights' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{agentInsights.length} insights</p>
            <button onClick={analyzeAgents} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Analyze Agents</button>
          </div>
          {agentInsights.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-2xl mb-2">🤖</p>
              <p>No agent insights yet. Click "Analyze Agents" to scan your active agents.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agentInsights.map(i => (
                <div key={i.id} className="bg-white rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[i.severity] ?? 'bg-gray-100 text-gray-600'}`}>{i.severity}</span>
                      <h4 className="font-semibold text-gray-800">{i.title}</h4>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{i.description}</p>
                  <div className="space-y-1">
                    {(i.suggestions as string[]).map((s, si) => (
                      <div key={si} className="text-xs text-gray-500 flex items-start gap-2"><span className="text-indigo-400 mt-0.5">→</span><span>{s}</span></div>
                    ))}
                  </div>
                  {i.status === 'open' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateInsightStatus('insights/agents', i.id, 'applied', loadAgentInsights)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Apply</button>
                      <button onClick={() => updateInsightStatus('insights/agents', i.id, 'acknowledged', loadAgentInsights)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200">Acknowledge</button>
                      <button onClick={() => updateInsightStatus('insights/agents', i.id, 'dismissed', loadAgentInsights)} className="bg-gray-100 text-gray-500 px-3 py-1 rounded text-xs hover:bg-gray-200">Dismiss</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Policy Insights ───────────────────────────────────────────────────── */}
      {!loading && tab === 'Policy Insights' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{policyInsights.length} insights</p>
            <button onClick={analyzePolicies} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">Analyze Policies</button>
          </div>
          {policyInsights.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-2xl mb-2">📋</p>
              <p>No policy insights. Click "Analyze Policies" to check for conflicts and gaps.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {policyInsights.map(i => (
                <div key={i.id} className="bg-white rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[i.severity] ?? 'bg-gray-100 text-gray-600'}`}>{i.severity}</span>
                      <h4 className="font-semibold text-gray-800">{i.title}</h4>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{i.description}</p>
                  {(i.affectedPolicies as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(i.affectedPolicies as string[]).map((p, pi) => <span key={pi} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{p}</span>)}
                    </div>
                  )}
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700"><span className="font-medium">Suggestion: </span>{i.suggestion}</div>
                  {i.status === 'open' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateInsightStatus('insights/policies', i.id, 'applied', loadPolicyInsights)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Resolved</button>
                      <button onClick={() => updateInsightStatus('insights/policies', i.id, 'dismissed', loadPolicyInsights)} className="bg-gray-100 text-gray-500 px-3 py-1 rounded text-xs hover:bg-gray-200">Dismiss</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KG Feedback ───────────────────────────────────────────────────────── */}
      {!loading && tab === 'KG Feedback' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Automatically discovered relationships and entities proposed for the Knowledge Graph. Requires human review.</p>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Type', 'Source', 'Confidence', 'Status', 'Proposed Data', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kgFeedback.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">{f.feedbackType}</span></td>
                    <td className="px-4 py-3 text-gray-500">{f.sourceModule}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${f.confidence}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{f.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[f.status] ?? 'bg-gray-100 text-gray-600'}`}>{f.status}</span></td>
                    <td className="px-4 py-3 max-w-xs">
                      <pre className="text-xs text-gray-600 truncate">{JSON.stringify(f.proposedData)}</pre>
                    </td>
                    <td className="px-4 py-3">
                      {f.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => reviewKgFeedback(f.id, 'approved')} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs hover:bg-green-200">Approve</button>
                          <button onClick={() => reviewKgFeedback(f.id, 'rejected')} className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs hover:bg-red-200">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {kgFeedback.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No KG feedback proposals yet. Tool executions with structured output will generate proposals automatically.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Evolution ─────────────────────────────────────────────────────────── */}
      {!loading && tab === 'Evolution' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{snapshots.length} snapshots</p>
            <button onClick={createSnapshot} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Take Snapshot</button>
          </div>
          {snapshots.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-2xl mb-2">📈</p>
              <p>No evolution snapshots yet. Take a snapshot to record current system performance.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snapshots.map(s => (
                <div key={s.id} className="bg-white rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{new Date(s.snapshotDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{s.period}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-indigo-600">{s.overallScore ?? '—'}</span>
                      {s.trend && <span>{TREND_ICONS[s.trend] ?? '➡️'}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>Tools: {(s.toolMetrics as Record<string, unknown>).activeTools ?? '—'}/{(s.toolMetrics as Record<string, unknown>).totalTools ?? '—'}</div>
                    <div>Agents: {(s.agentMetrics as Record<string, unknown>).activeAgents ?? '—'}/{(s.agentMetrics as Record<string, unknown>).totalAgents ?? '—'}</div>
                    <div>Executions: {(s.toolMetrics as Record<string, unknown>).totalExecutions ?? 0}</div>
                    <div>Tasks: {(s.agentMetrics as Record<string, unknown>).totalTasks ?? 0}</div>
                  </div>
                  {s.notes && <p className="text-xs text-gray-500 italic">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
