'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'
const p = (path: string) => `${API}?path=${encodeURIComponent(path)}`

async function apiGet(path: string) { const r = await fetch(p(path)); return r.json() }
async function apiPost(path: string, body: any) { const r = await fetch(p(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json() }
async function apiPatch(path: string, body: any) { const r = await fetch(p(path), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json() }
async function apiDelete(path: string) { await fetch(p(path), { method: 'DELETE' }) }

const MATURITY: Record<string, string> = { manual: 'bg-red-100 text-red-800', basic: 'bg-orange-100 text-orange-800', intermediate: 'bg-yellow-100 text-yellow-800', advanced: 'bg-blue-100 text-blue-800', optimized: 'bg-green-100 text-green-800' }
const SEV: Record<string, string> = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-blue-100 text-blue-800' }

export default function OperationsAIPage() {
  const [tab, setTab] = useState<'dashboard' | 'processes' | 'bottlenecks' | 'kpis' | 'insights'>('dashboard')
  const [dash, setDash] = useState<any>(null)
  const [processes, setProcesses] = useState<any[]>([])
  const [bottlenecks, setBottlenecks] = useState<any[]>([])
  const [kpis, setKpis] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>({})

  const loadDash = useCallback(async () => { const d = await apiGet('/opi/dashboard'); setDash(d) }, [])
  const loadProcesses = useCallback(async () => { const d = await apiGet('/opi/processes'); setProcesses(Array.isArray(d) ? d : []) }, [])
  const loadBottlenecks = useCallback(async () => { const d = await apiGet('/opi/bottlenecks'); setBottlenecks(Array.isArray(d) ? d : []) }, [])
  const loadKpis = useCallback(async () => { const d = await apiGet('/opi/kpis'); setKpis(Array.isArray(d) ? d : []) }, [])
  const loadInsights = useCallback(async () => { const d = await apiGet('/opi/insights'); setInsights(Array.isArray(d) ? d : []) }, [])

  useEffect(() => { loadDash() }, [loadDash])
  useEffect(() => {
    if (tab === 'processes') loadProcesses()
    else if (tab === 'bottlenecks') loadBottlenecks()
    else if (tab === 'kpis') loadKpis()
    else if (tab === 'insights') loadInsights()
  }, [tab, loadProcesses, loadBottlenecks, loadKpis, loadInsights])

  const addProcess = async () => {
    if (!form.name) return
    setLoading(true)
    await apiPost('/opi/processes', form)
    setForm({})
    await loadProcesses()
    setLoading(false)
  }

  const analyzeProcess = async (id: string) => {
    setLoading(true)
    await apiPost(`/opi/processes/${id}/analyze`, {})
    await loadProcesses()
    await loadBottlenecks()
    setLoading(false)
  }

  const deleteProcess = async (id: string) => {
    await apiDelete(`/opi/processes/${id}`)
    await loadProcesses()
  }

  const resolveBottleneck = async (id: string) => {
    await apiPatch(`/opi/bottlenecks/${id}/resolve`, {})
    await loadBottlenecks()
  }

  const upsertKpis = async () => {
    setLoading(true)
    await apiPost('/opi/kpis/upsert', { period: new Date().toISOString().slice(0, 7) })
    await loadKpis()
    setLoading(false)
  }

  const generateInsights = async () => {
    setLoading(true)
    await apiPost('/opi/insights/generate', {})
    await loadInsights()
    setLoading(false)
  }

  const tabs = ['dashboard', 'processes', 'bottlenecks', 'kpis', 'insights'] as const

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">AI Operations Intelligence</h1>
      <p className="text-sm text-gray-500 mb-6">Process mining, bottleneck detection & operational KPI management</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && dash && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Processes', value: dash.kpis?.totalProcesses ?? 0 },
              { label: 'Avg Efficiency', value: `${dash.kpis?.avgEfficiency ?? 0}/100` },
              { label: 'Avg Automation', value: `${dash.kpis?.avgAutomation ?? 0}%` },
              { label: 'Optimized Processes', value: dash.kpis?.optimizedCount ?? 0, green: true },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.green ? 'text-green-600' : 'text-indigo-600'}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Lowest Efficiency Processes</h3>
              {dash.processes?.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center mb-2 p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.department ?? 'No dept'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${MATURITY[p.aiMaturityLevel] ?? ''}`}>{p.aiMaturityLevel}</span>
                </div>
              ))}
              {!dash.processes?.length && <p className="text-sm text-gray-400">No processes tracked yet</p>}
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Open Bottlenecks</h3>
              {dash.openBottlenecks?.map((b: any) => (
                <div key={b.id} className="mb-2 p-3 rounded-lg bg-orange-50">
                  <div className="flex gap-2 mb-1">
                    <span className="font-medium text-sm">{b.step}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEV[b.severity] ?? ''}`}>{b.severity}</span>
                  </div>
                  <p className="text-xs text-gray-600">{b.aiSolution}</p>
                </div>
              ))}
              {!dash.openBottlenecks?.length && <p className="text-sm text-gray-400">No open bottlenecks</p>}
            </div>
          </div>
        </div>
      )}

      {/* Processes */}
      {tab === 'processes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Process</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Process Name" value={form.name ?? ''} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Department" value={form.department ?? ''} onChange={e => setForm((p: any) => ({ ...p, department: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Owner" value={form.owner ?? ''} onChange={e => setForm((p: any) => ({ ...p, owner: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Cycle Days" value={form.cycleDays ?? ''} onChange={e => setForm((p: any) => ({ ...p, cycleDays: parseFloat(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Automation %" value={form.automationPct ?? ''} onChange={e => setForm((p: any) => ({ ...p, automationPct: parseFloat(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Error Rate %" value={form.errorRate ?? ''} onChange={e => setForm((p: any) => ({ ...p, errorRate: parseFloat(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Throughput (units/day)" value={form.throughput ?? ''} onChange={e => setForm((p: any) => ({ ...p, throughput: parseFloat(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={addProcess} disabled={loading} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Add Process</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Process', 'Dept', 'Cycle Days', 'Automation', 'Error Rate', 'AI Score', 'Maturity', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {processes.map(proc => (
                  <tr key={proc.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{proc.name}</td>
                    <td className="px-4 py-3 text-xs">{proc.department ?? '—'}</td>
                    <td className="px-4 py-3">{proc.cycleDays}</td>
                    <td className="px-4 py-3">{proc.automationPct}%</td>
                    <td className="px-4 py-3">{proc.errorRate}%</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">{proc.aiEfficiencyScore}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${MATURITY[proc.aiMaturityLevel] ?? ''}`}>{proc.aiMaturityLevel}</span></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => analyzeProcess(proc.id)} className="text-xs text-indigo-600 hover:underline">Mine</button>
                      <button onClick={() => deleteProcess(proc.id)} className="text-xs text-red-500 hover:underline">Del</button>
                    </td>
                  </tr>
                ))}
                {processes.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No processes tracked</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {tab === 'bottlenecks' && (
        <div className="space-y-3">
          {bottlenecks.map(b => (
            <div key={b.id} className={`bg-white rounded-xl border p-4 ${b.resolved ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{b.step}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEV[b.severity] ?? ''}`}>{b.severity}</span>
                    {b.process && <span className="text-xs text-gray-400">in {b.process.name}</span>}
                  </div>
                  <p className="text-sm text-gray-600 mb-1"><strong>Root cause:</strong> {b.aiRootCause}</p>
                  <p className="text-sm text-indigo-700"><strong>AI Solution:</strong> {b.aiSolution}</p>
                </div>
                {!b.resolved && (
                  <button onClick={() => resolveBottleneck(b.id)} className="ml-4 text-sm text-green-600 hover:underline shrink-0">Resolve</button>
                )}
              </div>
            </div>
          ))}
          {bottlenecks.length === 0 && <div className="text-center py-12 text-gray-400">No bottlenecks detected — analyze processes to find them</div>}
        </div>
      )}

      {/* KPIs */}
      {tab === 'kpis' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Operational KPIs</h3>
            <button onClick={upsertKpis} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Updating...' : 'Load/Refresh KPIs'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kpis.map(k => {
              const pct = k.target > 0 ? Math.round((k.actual / k.target) * 100) : 0
              return (
                <div key={k.id} className="bg-white rounded-xl border p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-sm">{k.kpiName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${k.trend === 'improving' ? 'bg-green-100 text-green-800' : k.trend === 'declining' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{k.trend}</span>
                  </div>
                  <div className="flex gap-4 text-sm mb-2">
                    <div><span className="text-gray-500">Actual:</span> <strong>{k.actual}</strong></div>
                    <div><span className="text-gray-500">Target:</span> <strong>{k.target}</strong></div>
                    <div><span className="text-gray-500">AI Pred:</span> <strong className="text-indigo-600">{k.aiPredicted}</strong></div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% of target</p>
                  {k.aiSummary && <p className="text-xs text-gray-600 mt-2 italic">{k.aiSummary}</p>}
                </div>
              )
            })}
            {kpis.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">Load KPIs to see operational metrics</div>}
          </div>
        </div>
      )}

      {/* Insights */}
      {tab === 'insights' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">AI Efficiency Insights</h3>
            <button onClick={generateInsights} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Insights'}
            </button>
          </div>
          <div className="space-y-3">
            {insights.map(i => (
              <div key={i.id} className="bg-white rounded-xl border p-4">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">{i.title}</span>
                  <div className="flex gap-2">
                    {i.savingsEst > 0 && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">~${i.savingsEst.toLocaleString()} savings</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${i.priority === 'high' ? 'bg-red-100 text-red-800' : i.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>{i.priority}</span>
                  </div>
                </div>
                {i.summary && <p className="text-sm text-gray-600 mb-2">{i.summary}</p>}
                {Array.isArray(i.actionItems) && i.actionItems.map((a: string, idx: number) => <p key={idx} className="text-xs text-indigo-700">• {a}</p>)}
              </div>
            ))}
            {insights.length === 0 && <div className="text-center py-12 text-gray-400">Add processes and KPIs, then generate insights</div>}
          </div>
        </div>
      )}
    </div>
  )
}
