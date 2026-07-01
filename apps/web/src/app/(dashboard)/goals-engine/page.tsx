'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Goal {
  id: string
  title: string
  type: string
  category: string
  status: string
  progress: number
  priority: string
  targetDate: string | null
  successProb: number
  riskCount: number
  analysis?: { verdict: string; message: string }
  kpis: Kpi[]
  milestones: Milestone[]
  children?: Goal[]
}

interface Kpi {
  id: string
  name: string
  unit: string
  baseline: number
  target: number
  current: number
  trend: string
}

interface Milestone {
  id: string
  title: string
  dueDate: string | null
  status: string
  completedAt: string | null
}

interface DashboardStats {
  goals: { total: number; active: number; completed: number; atRisk: number }
  kpis: number
  pendingMilestones: number
  avgProgress: number
}

interface MentorData {
  insights: { goalId: string; goalTitle: string; insight: string; successProb: number }[]
  strategicAdvice: string[]
  totalActiveGoals: number
}

type Tab = 'dashboard' | 'goals' | 'tree' | 'mentor' | 'roadmap' | 'decision'

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  at_risk: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const VERDICT_COLOR: Record<string, string> = {
  ahead: 'text-emerald-600',
  on_track: 'text-blue-600',
  slightly_behind: 'text-yellow-600',
  at_risk: 'text-red-600',
  no_target: 'text-gray-500',
}

const TREND_ICON: Record<string, string> = { up: '↑', down: '↓', stable: '→' }
const TREND_COLOR: Record<string, string> = { up: 'text-green-600', down: 'text-red-500', stable: 'text-gray-500' }

function probColor(prob: number) {
  if (prob >= 75) return 'text-emerald-600'
  if (prob >= 50) return 'text-blue-600'
  if (prob >= 30) return 'text-yellow-600'
  return 'text-red-600'
}

// ── API ───────────────────────────────────────────────────────────────────────

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const r = await fetch(`/api/proxy?path=/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
  })
  return r.json()
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1 shadow-sm">
      <div className="text-sm text-gray-500 font-medium">{label}</div>
      <div className={`text-3xl font-bold ${color ?? 'text-gray-800'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.min(100, Math.round(value * 100))
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color ?? 'bg-blue-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function GoalCard({ goal, onSelect }: { goal: Goal; onSelect: (g: Goal) => void }) {
  const pct = Math.round((goal.progress ?? 0) * 100)
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
      onClick={() => onSelect(goal)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-semibold text-gray-800 leading-tight">{goal.title}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${PRIORITY_COLOR[goal.priority] ?? PRIORITY_COLOR.medium}`}>
          {goal.priority}
        </span>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[goal.status] ?? STATUS_COLOR.active}`}>
          {goal.status.replace('_', ' ')}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{goal.type}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{goal.category}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <ProgressBar value={goal.progress ?? 0} color={pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'} />
        <span className="text-sm font-semibold text-gray-600 w-10 text-right">{pct}%</span>
      </div>
      <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
        <span className={probColor(goal.successProb ?? 0)}>
          {goal.successProb ?? 0}% success probability
        </span>
        {goal.riskCount > 0 && (
          <span className="text-red-500">{goal.riskCount} risk{goal.riskCount > 1 ? 's' : ''}</span>
        )}
      </div>
      {goal.analysis && (
        <div className={`mt-2 text-xs font-medium ${VERDICT_COLOR[goal.analysis.verdict] ?? 'text-gray-500'}`}>
          {goal.analysis.message}
        </div>
      )}
    </div>
  )
}

function GoalTreeNode({ goal, depth = 0, onSelect }: { goal: Goal; depth?: number; onSelect: (g: Goal) => void }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (goal.children ?? []).length > 0
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
        onClick={() => onSelect(goal)}
      >
        {hasChildren && (
          <button
            className="text-gray-400 w-4 shrink-0"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        )}
        {!hasChildren && <span className="w-4 shrink-0 text-gray-200">◦</span>}
        <span className={`w-2 h-2 rounded-full shrink-0 ${goal.status === 'active' ? 'bg-green-400' : goal.status === 'at_risk' ? 'bg-red-400' : 'bg-gray-300'}`} />
        <span className="text-sm font-medium text-gray-800">{goal.title}</span>
        <span className="text-xs text-gray-400 ml-auto">{Math.round((goal.progress ?? 0) * 100)}%</span>
      </div>
      {hasChildren && expanded && (goal.children ?? []).map(child => (
        <GoalTreeNode key={child.id} goal={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GoalsEnginePage() {
  const { data: session } = useSession()
  const token = (session as { accessToken?: string })?.accessToken ?? ''

  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [tree, setTree] = useState<Goal[]>([])
  const [mentor, setMentor] = useState<MentorData | null>(null)
  const [roadmaps, setRoadmaps] = useState<{ id: string; title: string; horizon: string; generatedAt: string }[]>([])
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(false)

  // Create goal form
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'business', category: 'sales', priority: 'medium', targetDate: '' })

  // Roadmap form
  const [horizon, setHorizon] = useState<'30d' | '90d' | '1y' | '5y'>('90d')
  const [roadmapResult, setRoadmapResult] = useState<{ title: string; phases: { title: string; actions: string[] }[]; executiveSummary: string } | null>(null)

  // Decision impact
  const [decision, setDecision] = useState('')
  const [impactResult, setImpactResult] = useState<{ decision: string; affectedGoals: { title: string; impact: string }[]; overallRisk: string; recommendation: string; proceed: boolean } | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [s, g, t, m, r] = await Promise.all([
        apiFetch('/goals-engine/dashboard', token),
        apiFetch('/goals-engine/goals', token),
        apiFetch('/goals-engine/goals/tree', token),
        apiFetch('/goals-engine/mentor', token),
        apiFetch('/goals-engine/roadmaps', token),
      ])
      if (s.success) setStats(s.data)
      if (g.success) setGoals(g.data)
      if (t.success) setTree(t.data)
      if (m.success) setMentor(m.data)
      if (r.success) setRoadmaps(r.data)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function createGoal() {
    if (!form.title.trim()) return
    const r = await apiFetch('/goals-engine/goals', token, {
      method: 'POST',
      body: JSON.stringify(form),
    })
    if (r.success) { setShowCreate(false); setForm({ title: '', type: 'business', category: 'sales', priority: 'medium', targetDate: '' }); load() }
  }

  async function generateRoadmap() {
    setRoadmapResult(null)
    const r = await apiFetch('/goals-engine/roadmap', token, { method: 'POST', body: JSON.stringify({ horizon }) })
    if (r.success) { setRoadmapResult(r.data.roadmap); load() }
  }

  async function assessDecision() {
    if (!decision.trim()) return
    const r = await apiFetch('/goals-engine/decision-impact', token, { method: 'POST', body: JSON.stringify({ decision }) })
    if (r.success) setImpactResult(r.data)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'goals', label: 'Goals' },
    { id: 'tree', label: 'Goal Tree' },
    { id: 'mentor', label: 'AI Mentor' },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'decision', label: 'Decision Impact' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Goals Engine</h1>
          <p className="text-sm text-gray-500 mt-0.5">Goal Tree · KPI Engine · AI Progress · Strategic Roadmap</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Goal
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-400 mb-4">Loading...</div>}

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Goals" value={stats.goals.total} />
            <StatCard label="Active" value={stats.goals.active} color="text-blue-600" />
            <StatCard label="At Risk" value={stats.goals.atRisk} color="text-red-600" />
            <StatCard label="Completed" value={stats.goals.completed} color="text-emerald-600" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Avg Progress" value={`${stats.avgProgress}%`} sub="across active goals" />
            <StatCard label="KPIs Tracked" value={stats.kpis} />
            <StatCard label="Pending Milestones" value={stats.pendingMilestones} />
          </div>
          {/* Quick mentor preview */}
          {mentor && mentor.strategicAdvice.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
              <div className="text-sm font-semibold text-blue-800 mb-2">AI Strategic Advice</div>
              <ul className="space-y-1">
                {mentor.strategicAdvice.map((a, i) => (
                  <li key={i} className="text-sm text-blue-700 flex gap-2">
                    <span className="text-blue-400 shrink-0">→</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Goals List ── */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {goals.length === 0 && <div className="text-sm text-gray-400">No goals yet. Create your first goal to get started.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map(g => <GoalCard key={g.id} goal={g} onSelect={setSelectedGoal} />)}
          </div>
        </div>
      )}

      {/* ── Goal Tree ── */}
      {tab === 'tree' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-4">Hierarchical Goal Breakdown</div>
          {tree.length === 0 && <div className="text-sm text-gray-400">No goals in tree. Create goals with parent relationships.</div>}
          {tree.map(g => <GoalTreeNode key={g.id} goal={g} onSelect={setSelectedGoal} />)}
        </div>
      )}

      {/* ── AI Mentor ── */}
      {tab === 'mentor' && mentor && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentor.insights.map(insight => (
              <div key={insight.goalId} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="font-semibold text-gray-800 mb-1 text-sm">{insight.goalTitle}</div>
                <div className={`text-xs font-medium mb-2 ${probColor(insight.successProb)}`}>
                  {insight.successProb}% success probability
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{insight.insight}</p>
              </div>
            ))}
          </div>
          {mentor.strategicAdvice.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-5">
              <div className="text-sm font-semibold text-purple-800 mb-3">Strategic Portfolio Advice</div>
              <ul className="space-y-2">
                {mentor.strategicAdvice.map((a, i) => (
                  <li key={i} className="text-sm text-purple-700 flex gap-2">
                    <span className="text-purple-400 shrink-0 font-bold">{i + 1}.</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Roadmap ── */}
      {tab === 'roadmap' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-4">Generate Strategic Roadmap</div>
            <div className="flex gap-2 flex-wrap mb-4">
              {(['30d', '90d', '1y', '5y'] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    horizon === h ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {h === '30d' ? '30 Days' : h === '90d' ? '90 Days' : h === '1y' ? '1 Year' : '5 Years'}
                </button>
              ))}
            </div>
            <button
              onClick={generateRoadmap}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Generate Roadmap
            </button>
          </div>

          {roadmapResult && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="text-lg font-bold text-gray-800 mb-1">{roadmapResult.title}</div>
              {roadmapResult.executiveSummary && (
                <p className="text-sm text-gray-600 mb-4">{roadmapResult.executiveSummary}</p>
              )}
              <div className="space-y-4">
                {roadmapResult.phases.map((phase, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="font-semibold text-gray-700 mb-2 text-sm">{phase.title}</div>
                    <ul className="space-y-1">
                      {phase.actions.map((action, j) => (
                        <li key={j} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-gray-300">•</span> {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {roadmaps.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-3">Past Roadmaps</div>
              <div className="space-y-2">
                {roadmaps.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700 font-medium">{r.title}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{r.horizon}</span>
                      <span className="text-xs text-gray-400">{new Date(r.generatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Decision Impact ── */}
      {tab === 'decision' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-1">AI Decision Impact Analyser</div>
            <p className="text-xs text-gray-400 mb-4">Before executing a business decision, see how it impacts your active goals.</p>
            <textarea
              value={decision}
              onChange={e => setDecision(e.target.value)}
              placeholder="e.g. Hire 5 new sales reps and expand to 2 new cities..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={3}
            />
            <button
              onClick={assessDecision}
              disabled={!decision.trim()}
              className="mt-3 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Analyse Impact
            </button>
          </div>

          {impactResult && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  impactResult.overallRisk === 'low' ? 'bg-green-100 text-green-700' :
                  impactResult.overallRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {impactResult.overallRisk.toUpperCase()} RISK
                </div>
                <div className={`text-sm font-medium ${impactResult.proceed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {impactResult.proceed ? '✓ Recommended to Proceed' : '✗ Caution Advised'}
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4">{impactResult.recommendation}</p>

              {impactResult.affectedGoals.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Affected Goals</div>
                  <div className="space-y-2">
                    {impactResult.affectedGoals.map((g, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 font-semibold ${g.impact === 'positive' ? 'text-emerald-500' : g.impact === 'negative' ? 'text-red-500' : 'text-gray-400'}`}>
                          {g.impact === 'positive' ? '↑' : g.impact === 'negative' ? '↓' : '~'}
                        </span>
                        <span className="text-gray-700">{g.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {impactResult.affectedGoals.length === 0 && (
                <p className="text-sm text-gray-400">No direct goal impact detected for this decision.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Goal Detail Drawer ── */}
      {selectedGoal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelectedGoal(null)}>
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="font-semibold text-gray-800">{selectedGoal.title}</div>
              <button onClick={() => setSelectedGoal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-5">
              {/* Status row */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[selectedGoal.status] ?? STATUS_COLOR.active}`}>{selectedGoal.status}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[selectedGoal.priority] ?? PRIORITY_COLOR.medium}`}>{selectedGoal.priority}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{selectedGoal.type}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{selectedGoal.category}</span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-semibold">{Math.round((selectedGoal.progress ?? 0) * 100)}%</span>
                </div>
                <ProgressBar value={selectedGoal.progress ?? 0} />
              </div>

              {/* Analysis */}
              {selectedGoal.analysis && (
                <div className={`text-sm font-medium ${VERDICT_COLOR[selectedGoal.analysis.verdict] ?? 'text-gray-500'}`}>
                  {selectedGoal.analysis.message}
                </div>
              )}

              {/* Success prob */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Success Probability</span>
                <span className={`font-bold ${probColor(selectedGoal.successProb ?? 0)}`}>{selectedGoal.successProb ?? 0}%</span>
              </div>

              {/* Target date */}
              {selectedGoal.targetDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Target Date</span>
                  <span className="text-gray-700">{new Date(selectedGoal.targetDate).toLocaleDateString()}</span>
                </div>
              )}

              {/* KPIs */}
              {selectedGoal.kpis && selectedGoal.kpis.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">KPIs</div>
                  <div className="space-y-2">
                    {selectedGoal.kpis.map(kpi => (
                      <div key={kpi.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2">
                        <div>
                          <div className="font-medium text-gray-700">{kpi.name}</div>
                          <div className="text-xs text-gray-400">{kpi.baseline} → {kpi.target} {kpi.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">{kpi.current} {kpi.unit}</div>
                          <div className={`text-xs ${TREND_COLOR[kpi.trend] ?? 'text-gray-400'}`}>
                            {TREND_ICON[kpi.trend] ?? '→'} {kpi.trend}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Milestones</div>
                  <div className="space-y-1">
                    {selectedGoal.milestones.map(ms => (
                      <div key={ms.id} className="flex items-center gap-2 text-sm">
                        <span className={ms.status === 'completed' ? 'text-emerald-500' : 'text-gray-300'}>
                          {ms.status === 'completed' ? '✓' : '○'}
                        </span>
                        <span className={ms.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}>{ms.title}</span>
                        {ms.dueDate && (
                          <span className="text-xs text-gray-400 ml-auto">{new Date(ms.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Goal Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="font-bold text-gray-800 mb-4">Create New Goal</div>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Goal title"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="company">Company</option>
                </select>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                >
                  <option value="sales">Sales</option>
                  <option value="growth">Growth</option>
                  <option value="hiring">Hiring</option>
                  <option value="cost">Cost</option>
                  <option value="product">Product</option>
                  <option value="health">Health</option>
                  <option value="learning">Learning</option>
                  <option value="finance">Finance</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={e => setForm({ ...form, targetDate: e.target.value })}
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={createGoal} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
