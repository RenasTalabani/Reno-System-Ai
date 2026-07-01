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
async function apiDelete(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return r.json()
}

interface Customer { id: string; name: string; email?: string; plan: string; mrr: number; ltv: number; healthScore: number; churnRisk: string; npsScore?: number; segment: string; _count?: { healthScores: number; churnPredictions: number; playbookRuns: number } }
interface Playbook { id: string; name: string; slug: string; trigger: string; isActive: boolean; runCount: number; successRate: number; _count?: { runs: number } }
interface ChurnPrediction { id: string; churnProbability: number; riskLevel: string; factors: string[]; recommendation: string; predictedAt: string; customer: Customer }
interface Stats { totalCustomers: number; atRiskCount: number; avgHealthScore: number; avgMrr: number; riskDistribution: Record<string, number> }

const TABS = ['Dashboard', 'Customers', 'Health', 'Churn AI', 'Playbooks', 'Runs'] as const
type Tab = typeof TABS[number]

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
}
const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600', growth: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700', enterprise: 'bg-amber-100 text-amber-700',
}
const healthColor = (score: number) => score >= 75 ? 'text-green-600' : score >= 55 ? 'text-yellow-600' : score >= 35 ? 'text-orange-600' : 'text-red-600'

export default function CustomerSuccessPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([])
  const [runs, setRuns] = useState<{ id: string; status: string; stepsRun: number; outcome?: string; createdAt: string; playbook: Playbook; customer: Customer }[]>([])
  const [atRisk, setAtRisk] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', plan: 'starter', mrr: '', ltv: '', npsScore: '', segment: 'standard' })
  const [runPlaybookId, setRunPlaybookId] = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/csp/dashboard'); setStats(d.stats); setAtRisk(d.atRiskCustomers ?? []) }, [])
  const loadCustomers = useCallback(async () => { const d = await apiGet('/v1/csp/customers'); setCustomers(d.customers ?? []) }, [])
  const loadPlaybooks = useCallback(async () => { const d = await apiGet('/v1/csp/playbooks'); setPlaybooks(d.playbooks ?? []) }, [])
  const loadPredictions = useCallback(async () => { const d = await apiGet('/v1/csp/churn-predictions'); setPredictions(d.predictions ?? []) }, [])
  const loadRuns = useCallback(async () => { const d = await apiGet('/v1/csp/playbook-runs'); setRuns(d.runs ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard, Customers: loadCustomers, Health: loadCustomers,
      'Churn AI': loadPredictions, Playbooks: loadPlaybooks, Runs: loadRuns,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadCustomers, loadPlaybooks, loadPredictions, loadRuns])

  const installPlaybooks = async () => {
    const r = await apiPost('/v1/csp/playbook-templates/install', {})
    flash(`${r.installed} playbook${r.installed !== 1 ? 's' : ''} installed`); await loadPlaybooks()
  }

  const createCustomer = async () => {
    if (!newCustomer.name) return flash('Name required')
    const payload = { ...newCustomer, mrr: Number(newCustomer.mrr) || 0, ltv: Number(newCustomer.ltv) || 0, npsScore: newCustomer.npsScore ? Number(newCustomer.npsScore) : undefined }
    const r = await apiPost('/v1/csp/customers', payload)
    if (r.id) { flash('Customer created'); await loadCustomers(); setNewCustomer({ name: '', email: '', plan: 'starter', mrr: '', ltv: '', npsScore: '', segment: 'standard' }) }
  }

  const scoreCustomer = async (id: string, name: string) => {
    flash(`Scoring ${name}...`)
    const r = await apiPost(`/v1/csp/customers/${id}/score`, {})
    flash(`${name} scored: ${r.result?.overallScore}/100 — ${r.result?.churnRisk} risk`); await loadCustomers()
  }

  const scoreAll = async () => {
    flash('Scoring all customers...')
    const r = await apiPost('/v1/csp/health/score-all', {})
    flash(`${r.scored} customers scored`); await loadCustomers()
  }

  const predictChurn = async (id: string, name: string) => {
    flash(`Predicting churn for ${name}...`)
    const r = await apiPost(`/v1/csp/customers/${id}/predict-churn`, {})
    flash(`${name}: ${(r.result?.probability * 100).toFixed(0)}% churn probability (${r.result?.riskLevel})`); await loadPredictions()
  }

  const runPlaybook = async () => {
    if (!runPlaybookId || !selectedCustomer) return flash('Select playbook and customer')
    const r = await apiPost(`/v1/csp/playbooks/${runPlaybookId}/run`, { customerId: selectedCustomer })
    flash(`Playbook run: ${r.run?.status}`); await loadRuns(); await loadPlaybooks()
  }

  const deleteCustomer = async (id: string) => { await apiDelete(`/v1/csp/customers/${id}`); await loadCustomers() }
  const deletePlaybook = async (id: string) => { await apiDelete(`/v1/csp/playbooks/${id}`); await loadPlaybooks() }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Customer Success</h1>
        <p className="text-gray-500 text-sm mt-1">Health scores · Churn prediction · Playbook automation · Retention intelligence</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {!loading && tab === 'Dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Customers', value: stats.totalCustomers, color: 'text-blue-600' },
              { label: 'At Risk', value: stats.atRiskCount, color: stats.atRiskCount > 0 ? 'text-red-600' : 'text-green-600' },
              { label: 'Avg Health', value: `${stats.avgHealthScore}/100`, color: healthColor(stats.avgHealthScore) },
              { label: 'Avg MRR', value: `$${stats.avgMrr.toFixed(0)}`, color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Risk Distribution</h3>
              <div className="space-y-2">
                {(['critical', 'high', 'medium', 'low'] as const).map(r => (
                  <div key={r} className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs w-16 text-center ${RISK_COLORS[r]}`}>{r}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${r === 'critical' ? 'bg-red-500' : r === 'high' ? 'bg-orange-500' : r === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.round(((stats.riskDistribution[r] ?? 0) / Math.max(stats.totalCustomers, 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{stats.riskDistribution[r] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">⚠️ At-Risk Customers</h3>
                <button onClick={installPlaybooks} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Install Playbooks</button>
              </div>
              <div className="space-y-2">
                {atRisk.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100">
                    <div><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-gray-400">{c.plan} · MRR ${c.mrr}</div></div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${healthColor(c.healthScore)}`}>{c.healthScore}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${RISK_COLORS[c.churnRisk]}`}>{c.churnRisk}</span>
                    </div>
                  </div>
                ))}
                {atRisk.length === 0 && <p className="text-sm text-gray-400">No at-risk customers yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'Customers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Add Customer</h3>
            <div className="grid md:grid-cols-4 gap-3 mb-3">
              <input value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Customer name *" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="border rounded-lg px-3 py-2 text-sm" />
              <select title="Plan" value={newCustomer.plan} onChange={e => setNewCustomer(p => ({ ...p, plan: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['starter', 'growth', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input value={newCustomer.mrr} onChange={e => setNewCustomer(p => ({ ...p, mrr: e.target.value }))} placeholder="MRR ($)" type="number" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <input value={newCustomer.npsScore} onChange={e => setNewCustomer(p => ({ ...p, npsScore: e.target.value }))} placeholder="NPS (0-10)" type="number" className="w-40 border rounded-lg px-3 py-2 text-sm" min={0} max={10} />
              <button onClick={createCustomer} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Add Customer</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Customer','Plan','MRR','Health','Churn Risk','NPS','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium">{c.name}</div><div className="text-xs text-gray-400">{c.email}</div></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${PLAN_COLORS[c.plan] ?? 'bg-gray-100'}`}>{c.plan}</span></td>
                    <td className="px-4 py-3">${c.mrr}</td>
                    <td className="px-4 py-3"><span className={`font-bold ${healthColor(c.healthScore)}`}>{c.healthScore}/100</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${RISK_COLORS[c.churnRisk] ?? 'bg-gray-100'}`}>{c.churnRisk}</span></td>
                    <td className="px-4 py-3">{c.npsScore != null ? c.npsScore : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => scoreCustomer(c.id, c.name)} className="text-blue-600 hover:underline text-xs">Score</button>
                        <button onClick={() => predictChurn(c.id, c.name)} className="text-purple-600 hover:underline text-xs">Churn</button>
                        <button onClick={() => deleteCustomer(c.id)} className="text-red-500 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No customers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'Health' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{customers.length} customers</p>
            <button onClick={scoreAll} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">🧠 Score All</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map(c => (
              <div key={c.id} className={`bg-white rounded-xl border p-4 space-y-2 ${c.churnRisk === 'critical' ? 'border-red-300' : c.churnRisk === 'high' ? 'border-orange-200' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="font-medium">{c.name}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${RISK_COLORS[c.churnRisk] ?? 'bg-gray-100'}`}>{c.churnRisk}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${c.healthScore >= 75 ? 'bg-green-500' : c.healthScore >= 55 ? 'bg-yellow-500' : c.healthScore >= 35 ? 'bg-orange-500' : 'bg-red-500'}`}
                      style={{ width: `${c.healthScore}%` }} />
                  </div>
                  <span className={`font-bold text-sm ${healthColor(c.healthScore)}`}>{c.healthScore}</span>
                </div>
                <div className="text-xs text-gray-500">{c.plan} · MRR ${c.mrr} · NPS {c.npsScore ?? '—'}</div>
                <button onClick={() => scoreCustomer(c.id, c.name)} className="text-xs text-blue-600 hover:underline">Re-score</button>
              </div>
            ))}
            {customers.length === 0 && <div className="md:col-span-3 bg-white rounded-xl border p-8 text-center text-gray-400">Add customers first.</div>}
          </div>
        </div>
      )}

      {!loading && tab === 'Churn AI' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>{['Customer','Churn %','Risk','Top Factor','Recommendation','Date'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {predictions.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${p.churnProbability >= 0.75 ? 'bg-red-500' : p.churnProbability >= 0.5 ? 'bg-orange-500' : 'bg-yellow-400'}`}
                          style={{ width: `${p.churnProbability * 100}%` }} />
                      </div>
                      <span className="font-mono text-xs">{(p.churnProbability * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${RISK_COLORS[p.riskLevel] ?? 'bg-gray-100'}`}>{p.riskLevel}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.factors[0] ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{p.recommendation}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(p.predictedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {predictions.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No predictions. Click "Churn" on a customer row.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'Playbooks' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{playbooks.length} playbooks</p>
            <button onClick={installPlaybooks} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">📚 Install Templates</button>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Run Playbook</h3>
            <div className="flex gap-3">
              <select title="Playbook" value={runPlaybookId} onChange={e => setRunPlaybookId(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">Select playbook...</option>
                {playbooks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select title="Customer" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={runPlaybook} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">▶ Run</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {playbooks.map(p => (
              <div key={p.id} className="bg-white rounded-xl border p-4 space-y-2">
                <div className="flex justify-between">
                  <div><div className="font-semibold">{p.name}</div><div className="text-xs text-gray-400">trigger: {p.trigger}</div></div>
                  <button onClick={() => deletePlaybook(p.id)} className="text-xs text-red-500 hover:underline">Del</button>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>▶ {p.runCount} runs</span><span>✓ {p.successRate.toFixed(0)}% success</span>
                  <span className={p.isActive ? 'text-green-600' : 'text-gray-400'}>{p.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
            {playbooks.length === 0 && <div className="md:col-span-2 text-center py-8 text-gray-400">No playbooks. Click "Install Templates".</div>}
          </div>
        </div>
      )}

      {!loading && tab === 'Runs' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>{['Playbook','Customer','Status','Steps','Outcome','Date'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.playbook?.name ?? '—'}</td>
                  <td className="px-4 py-3">{r.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'completed' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span></td>
                  <td className="px-4 py-3">{r.stepsRun} steps</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{r.outcome}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {runs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No runs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
