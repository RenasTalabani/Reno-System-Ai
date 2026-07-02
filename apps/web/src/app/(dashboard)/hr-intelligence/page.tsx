'use client'

import { useState, useEffect, useCallback } from 'react'

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
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return r.json()
}
async function apiDelete(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return r.json()
}

interface Employee { id: string; fullName: string; email?: string; department?: string; role?: string; level?: string; status: string; aiProfileScore?: number; retentionRisk?: string; potentialLevel?: string; aiInsights?: string[] }
interface Performance { id: string; employeeId: string; period: string; performanceScore: number; goalsScore: number; skillsScore: number; cultureScore: number; overallRating: string; aiPrediction?: string }
interface SuccessionPlan { id: string; roleTitle: string; department?: string; criticality: string; readinessGap: number; timeline?: string; aiSummary?: string; aiRecommended?: string[] }
interface WorkforceInsight { id: string; type: string; title: string; summary?: string; severity: string; actionItems?: string[] }
interface Analytics { totalEmployees: number; activeEmployees: number; avgTenureYears: number; avgSalary: number; attritionRate: number; highRiskCount: number; highPotentialCount: number; departmentBreakdown?: { dept: string; count: number }[] }

const TABS = ['Dashboard', 'Employees', 'Performance', 'Succession', 'Insights'] as const
type Tab = typeof TABS[number]

const RISK_COLORS: Record<string, string> = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }
const RATING_COLORS: Record<string, string> = { exceptional: 'bg-green-100 text-green-700', exceeds: 'bg-blue-100 text-blue-700', meets: 'bg-gray-100 text-gray-700', below: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }
const CRIT_COLORS: Record<string, string> = { low: 'bg-gray-100', medium: 'bg-yellow-50 border-yellow-200', high: 'bg-orange-50 border-orange-200', critical: 'bg-red-50 border-red-200' }
const SEV_COLORS: Record<string, string> = { info: 'border-blue-200 bg-blue-50', warning: 'border-yellow-200 bg-yellow-50', critical: 'border-red-200 bg-red-50' }

export default function HrIntelligencePage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [performances, setPerformances] = useState<Performance[]>([])
  const [successionPlans, setSuccessionPlans] = useState<SuccessionPlan[]>([])
  const [insights, setInsights] = useState<WorkforceInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [newEmp, setNewEmp] = useState({ fullName: '', email: '', department: '', role: '', level: 'mid', salary: '', location: '' })
  const [newPerf, setNewPerf] = useState({ employeeId: '', period: '', performanceScore: '70', goalsScore: '70', skillsScore: '70', cultureScore: '70' })
  const [newSucc, setNewSucc] = useState({ roleTitle: '', department: '', criticality: 'medium' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => {
    const d = await apiGet('/v1/hri/dashboard'); setAnalytics(d.analytics); setInsights(d.insights ?? [])
  }, [])
  const loadEmployees = useCallback(async () => { const d = await apiGet('/v1/hri/employees'); setEmployees(d.employees ?? []) }, [])
  const loadPerformance = useCallback(async () => { const d = await apiGet('/v1/hri/performance'); setPerformances(d.performances ?? []) }, [])
  const loadSuccession = useCallback(async () => { const d = await apiGet('/v1/hri/succession'); setSuccessionPlans(d.plans ?? []) }, [])
  const loadInsights = useCallback(async () => { const d = await apiGet('/v1/hri/insights'); setInsights(d.insights ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = { Dashboard: loadDashboard, Employees: loadEmployees, Performance: loadPerformance, Succession: loadSuccession, Insights: loadInsights }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadEmployees, loadPerformance, loadSuccession, loadInsights])

  const createEmployee = async () => {
    if (!newEmp.fullName) return flash('Full name required')
    const r = await apiPost('/v1/hri/employees', { ...newEmp, salary: newEmp.salary ? Number(newEmp.salary) : undefined })
    if (r.id) { flash('Employee added'); await loadEmployees(); setNewEmp({ fullName: '', email: '', department: '', role: '', level: 'mid', salary: '', location: '' }) }
  }

  const profileEmployee = async (id: string, name: string) => {
    flash(`Profiling ${name}...`)
    const r = await apiPost(`/v1/hri/employees/${id}/profile`, {})
    flash(`${name}: risk=${r.result?.retentionRisk}, potential=${r.result?.potentialLevel}, score=${r.result?.aiProfileScore}`)
    await loadEmployees()
  }

  const profileAll = async () => {
    flash('AI profiling all employees...')
    const r = await apiPost('/v1/hri/employees/profile-all', {})
    flash(`Profiled ${r.profiled} employees`); await loadEmployees()
  }

  const createPerformance = async () => {
    if (!newPerf.employeeId || !newPerf.period) return flash('Employee and period required')
    const r = await apiPost('/v1/hri/performance', { ...newPerf, performanceScore: Number(newPerf.performanceScore), goalsScore: Number(newPerf.goalsScore), skillsScore: Number(newPerf.skillsScore), cultureScore: Number(newPerf.cultureScore) })
    if (r.performance?.id) { flash(`Performance saved: ${r.evaluation?.overallRating}`); await loadPerformance() }
  }

  const createSuccession = async () => {
    if (!newSucc.roleTitle) return flash('Role title required')
    const r = await apiPost('/v1/hri/succession', newSucc)
    if (r.plan?.id) { flash(`Succession plan created. Gap: ${r.result?.readinessGap}/100`); await loadSuccession() }
  }

  const generateInsights = async () => {
    flash('Generating AI workforce insights...')
    const r = await apiPost('/v1/hri/insights/generate', {})
    flash(`Generated ${r.insights?.length ?? 0} insights`); await loadInsights()
  }

  const deleteEmployee = async (id: string) => { await apiDelete(`/v1/hri/employees/${id}`); await loadEmployees() }
  const deleteSuccession = async (id: string) => { await apiDelete(`/v1/hri/succession/${id}`); await loadSuccession() }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI HR Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">Workforce analytics · AI employee profiling · Performance AI · Succession planning</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* Dashboard */}
      {!loading && tab === 'Dashboard' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: analytics.totalEmployees, color: 'text-blue-600' },
              { label: 'Attrition Rate', value: `${analytics.attritionRate}%`, color: analytics.attritionRate > 20 ? 'text-red-600' : 'text-green-600' },
              { label: 'High Risk', value: analytics.highRiskCount, color: analytics.highRiskCount > 0 ? 'text-orange-600' : 'text-green-600' },
              { label: 'High Potential', value: analytics.highPotentialCount, color: 'text-indigo-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: 'Active Employees', value: analytics.activeEmployees, unit: '' },
              { label: 'Avg Tenure', value: analytics.avgTenureYears, unit: ' yrs' },
              { label: 'Avg Salary', value: `$${analytics.avgSalary.toLocaleString()}`, unit: '' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className="text-3xl font-bold text-gray-700">{s.value}{s.unit}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          {analytics.departmentBreakdown && analytics.departmentBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">By Department</h3>
              <div className="flex flex-wrap gap-2">
                {analytics.departmentBreakdown.map(d => (
                  <span key={d.dept} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">{d.dept}: {d.count}</span>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Recent Insights</h3>
            <div className="space-y-2">
              {insights.map(i => (
                <div key={i.id} className={`p-3 rounded-lg border ${SEV_COLORS[i.severity] ?? 'bg-gray-50'}`}>
                  <div className="font-medium text-sm">{i.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{i.summary}</div>
                </div>
              ))}
              {insights.length === 0 && <p className="text-sm text-gray-400">No insights yet. Generate in the Insights tab.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Employees */}
      {!loading && tab === 'Employees' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Add Employee</h3>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <input value={newEmp.fullName} onChange={e => setNewEmp(p => ({ ...p, fullName: e.target.value }))} placeholder="Full name *" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newEmp.email} onChange={e => setNewEmp(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newEmp.department} onChange={e => setNewEmp(p => ({ ...p, department: e.target.value }))} placeholder="Department" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-wrap gap-3">
              <input value={newEmp.role} onChange={e => setNewEmp(p => ({ ...p, role: e.target.value }))} placeholder="Role title" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <select title="Level" value={newEmp.level} onChange={e => setNewEmp(p => ({ ...p, level: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['junior', 'mid', 'senior', 'lead', 'exec'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <input value={newEmp.salary} onChange={e => setNewEmp(p => ({ ...p, salary: e.target.value }))} placeholder="Salary ($)" type="number" className="w-32 border rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={createEmployee} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Add</button>
              <button type="button" onClick={profileAll} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">🧠 Profile All</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Name','Dept','Level','AI Score','Retention Risk','Potential','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium">{e.fullName}</div><div className="text-xs text-gray-400">{e.email}</div></td>
                    <td className="px-4 py-3">{e.department}</td>
                    <td className="px-4 py-3 capitalize">{e.level}</td>
                    <td className="px-4 py-3">{e.aiProfileScore != null ? <span className="font-medium text-indigo-600">{e.aiProfileScore}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">{e.retentionRisk ? <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${RISK_COLORS[e.retentionRisk]}`}>{e.retentionRisk}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 capitalize text-sm">{e.potentialLevel ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => profileEmployee(e.id, e.fullName)} className="text-indigo-600 hover:underline text-xs">Profile</button>
                        <button type="button" onClick={() => deleteEmployee(e.id)} className="text-red-500 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No employees yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance */}
      {!loading && tab === 'Performance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Add Performance Review</h3>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <select title="Employee" value={newPerf.employeeId} onChange={e => setNewPerf(p => ({ ...p, employeeId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Select employee *</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
              <input value={newPerf.period} onChange={e => setNewPerf(p => ({ ...p, period: e.target.value }))} placeholder="Period (e.g. 2026-Q2) *" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {(['performanceScore', 'goalsScore', 'skillsScore', 'cultureScore'] as const).map(field => (
                <div key={field}>
                  <div className="text-xs text-gray-500 mb-1 capitalize">{field.replace('Score', '')} Score</div>
                  <input value={newPerf[field]} onChange={e => setNewPerf(p => ({ ...p, [field]: e.target.value }))} type="number" min="0" max="100" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
            <button type="button" onClick={createPerformance} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Save Review</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Employee','Period','Performance','Goals','Skills','Culture','Rating','AI Prediction'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {performances.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{employees.find(e => e.id === p.employeeId)?.fullName ?? p.employeeId.substring(0, 8)}</td>
                    <td className="px-4 py-3">{p.period}</td>
                    <td className="px-4 py-3">{p.performanceScore}</td>
                    <td className="px-4 py-3">{p.goalsScore}</td>
                    <td className="px-4 py-3">{p.skillsScore}</td>
                    <td className="px-4 py-3">{p.cultureScore}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${RATING_COLORS[p.overallRating] ?? 'bg-gray-100'}`}>{p.overallRating}</span></td>
                    <td className="px-4 py-3 max-w-xs"><div className="text-xs text-gray-500 truncate">{p.aiPrediction}</div></td>
                  </tr>
                ))}
                {performances.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No performance reviews yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Succession */}
      {!loading && tab === 'Succession' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Create Succession Plan</h3>
            <div className="flex flex-wrap gap-3">
              <input value={newSucc.roleTitle} onChange={e => setNewSucc(p => ({ ...p, roleTitle: e.target.value }))} placeholder="Role title *" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input value={newSucc.department} onChange={e => setNewSucc(p => ({ ...p, department: e.target.value }))} placeholder="Department" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <select title="Criticality" value={newSucc.criticality} onChange={e => setNewSucc(p => ({ ...p, criticality: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['low', 'medium', 'high', 'critical'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={createSuccession} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Create Plan</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {successionPlans.map(plan => (
              <div key={plan.id} className={`rounded-xl border p-4 ${CRIT_COLORS[plan.criticality] ?? 'bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{plan.roleTitle}</div>
                    <div className="text-xs text-gray-500">{plan.department} · {plan.timeline}</div>
                  </div>
                  <span className="text-xs font-medium capitalize text-gray-600">{plan.criticality}</span>
                </div>
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">Readiness Gap: {plan.readinessGap}/100</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${100 - plan.readinessGap}%` }} />
                  </div>
                </div>
                {plan.aiSummary && <p className="text-xs text-gray-600 mt-2">{plan.aiSummary}</p>}
                <button type="button" onClick={() => deleteSuccession(plan.id)} className="text-xs text-red-500 hover:underline mt-2">Delete</button>
              </div>
            ))}
            {successionPlans.length === 0 && <div className="md:col-span-2 bg-white rounded-xl border p-8 text-center text-gray-400">No succession plans yet.</div>}
          </div>
        </div>
      )}

      {/* Insights */}
      {!loading && tab === 'Insights' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{insights.length} workforce insights</p>
            <button type="button" onClick={generateInsights} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">🧠 Generate AI Insights</button>
          </div>
          <div className="space-y-3">
            {insights.map(i => (
              <div key={i.id} className={`rounded-xl border p-4 ${SEV_COLORS[i.severity] ?? 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-800">{i.title}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${i.severity === 'critical' ? 'bg-red-100 text-red-700' : i.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{i.severity}</span>
                </div>
                {i.summary && <p className="text-sm text-gray-600 mb-2">{i.summary}</p>}
                {i.actionItems && i.actionItems.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Action Items:</div>
                    <ul className="space-y-1">
                      {i.actionItems.map((a, idx) => <li key={idx} className="text-xs text-gray-700">• {a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {insights.length === 0 && <div className="bg-white rounded-xl border p-8 text-center text-gray-400">No insights yet. Click "Generate AI Insights" to analyze your workforce.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
