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

interface Deal { id: string; title: string; contactName: string; company?: string; stage: string; value: number; probability: number; aiProbability?: number; source: string; nextBestAction?: string; aiInsights?: string[] }
interface LeadScore { id: string; contactName: string; contactEmail?: string; company?: string; overallScore: number; grade: string; fitScore: number; intentScore: number; recommendation: string; signals: string[] }
interface Forecast { id: string; period: string; committed: number; bestCase: number; pipeline: number; aiAdjusted: number; aiConfidence: number; aiSummary?: string; dealCount: number }
interface Stage { id: string; name: string; defaultProbability: number; color: string; deals?: Deal[]; totalValue?: number }
interface Kpis { totalRevenue: number; winRate: number; avgDealSize: number; avgCycleDays: number; wonCount: number; lostCount: number; activeCount: number }

const TABS = ['Dashboard', 'Pipeline', 'Deals', 'Lead Scoring', 'Forecast'] as const
type Tab = typeof TABS[number]

const GRADE_COLORS: Record<string, string> = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-yellow-100 text-yellow-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-700' }
const SOURCE_COLORS: Record<string, string> = { inbound: 'bg-green-100 text-green-700', outbound: 'bg-blue-100 text-blue-700', referral: 'bg-purple-100 text-purple-700', partner: 'bg-amber-100 text-amber-700' }

export default function SalesIntelligencePage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [leads, setLeads] = useState<LeadScore[]>([])
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [pipeline, setPipeline] = useState<Stage[]>([])
  const [recentDeals, setRecentDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [newDeal, setNewDeal] = useState({ title: '', contactName: '', company: '', stage: 'prospecting', value: '', source: 'inbound' })
  const [newLead, setNewLead] = useState({ contactName: '', contactEmail: '', company: '', source: 'inbound' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => {
    const d = await apiGet('/v1/si/dashboard')
    setKpis(d.kpis); setRecentDeals(d.recentDeals ?? [])
  }, [])
  const loadDeals = useCallback(async () => { const d = await apiGet('/v1/si/deals'); setDeals(d.deals ?? []) }, [])
  const loadLeads = useCallback(async () => { const d = await apiGet('/v1/si/leads'); setLeads(d.leads ?? []) }, [])
  const loadForecast = useCallback(async () => { const d = await apiGet('/v1/si/forecast'); setForecasts(d.forecasts ?? []) }, [])
  const loadPipeline = useCallback(async () => { const d = await apiGet('/v1/si/pipeline'); setPipeline(d.byStage ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard, Pipeline: loadPipeline, Deals: loadDeals, 'Lead Scoring': loadLeads, Forecast: loadForecast,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadPipeline, loadDeals, loadLeads, loadForecast])

  const createDeal = async () => {
    if (!newDeal.title || !newDeal.contactName) return flash('Title and contact name required')
    const r = await apiPost('/v1/si/deals', { ...newDeal, value: Number(newDeal.value) || 0 })
    if (r.id) { flash('Deal created'); await loadDeals(); setNewDeal({ title: '', contactName: '', company: '', stage: 'prospecting', value: '', source: 'inbound' }) }
  }

  const analyzeDeal = async (id: string, title: string) => {
    flash(`Analyzing ${title}...`)
    const r = await apiPost(`/v1/si/deals/${id}/analyze`, {})
    flash(`${title}: AI probability ${r.analysis?.aiProbability}% — ${r.opportunities?.length ?? 0} opportunities found`)
    await loadDeals()
  }

  const updateDealStage = async (id: string, stage: string) => {
    await apiPatch(`/v1/si/deals/${id}`, { stage }); await loadDeals()
  }

  const scoreLead = async () => {
    if (!newLead.contactName) return flash('Contact name required')
    const r = await apiPost('/v1/si/leads/score', newLead)
    flash(`${newLead.contactName}: Grade ${r.result?.grade} (${r.result?.overallScore}/100)`); await loadLeads()
    setNewLead({ contactName: '', contactEmail: '', company: '', source: 'inbound' })
  }

  const generateForecast = async () => {
    flash('Generating AI forecast...')
    const r = await apiPost('/v1/si/forecast/generate', { period: new Date().toISOString().substring(0, 7), forecastType: 'monthly' })
    flash(`Forecast: AI adjusted $${r.result?.aiAdjusted?.toFixed(0)}`); await loadForecast()
  }

  const deleteDeal = async (id: string) => { await apiDelete(`/v1/si/deals/${id}`); await loadDeals() }
  const deleteLead = async (id: string) => { await apiDelete(`/v1/si/leads/${id}`); await loadLeads() }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Sales Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">Pipeline optimization · AI deal scoring · Lead intelligence · Revenue forecasting</p>
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
      {!loading && tab === 'Dashboard' && kpis && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: `$${kpis.totalRevenue.toLocaleString()}`, color: 'text-green-600' },
              { label: 'Win Rate', value: `${kpis.winRate}%`, color: kpis.winRate >= 30 ? 'text-green-600' : 'text-orange-600' },
              { label: 'Avg Deal Size', value: `$${kpis.avgDealSize.toFixed(0)}`, color: 'text-blue-600' },
              { label: 'Avg Cycle', value: `${kpis.avgCycleDays}d`, color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[{ label: 'Won', count: kpis.wonCount, color: 'text-green-600' }, { label: 'Lost', count: kpis.lostCount, color: 'text-red-600' }, { label: 'Active', count: kpis.activeCount, color: 'text-blue-600' }].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-sm text-gray-500">{s.label} Deals</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Recent Deals</h3>
            <div className="space-y-2">
              {recentDeals.map(d => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div><div className="font-medium text-sm">{d.title}</div><div className="text-xs text-gray-400">{d.contactName} · {d.company}</div></div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">${d.value.toLocaleString()}</span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full capitalize">{d.stage.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
              {recentDeals.length === 0 && <p className="text-sm text-gray-400">No deals yet. Add your first deal in the Deals tab.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline */}
      {!loading && tab === 'Pipeline' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Kanban-style pipeline view</p>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {pipeline.map(stage => (
              <div key={stage.id} className="min-w-[220px] bg-gray-50 rounded-xl p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{stage.name}</div>
                  <span className="text-xs text-gray-400">{stage.deals?.length ?? 0}</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">${(stage.totalValue ?? 0).toLocaleString()}</div>
                <div className="space-y-2">
                  {(stage.deals ?? []).map(d => (
                    <div key={d.id} className="bg-white rounded-lg p-2 border shadow-sm">
                      <div className="font-medium text-xs truncate">{d.title}</div>
                      <div className="text-xs text-gray-400">{d.contactName}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-medium">${d.value.toLocaleString()}</span>
                        {d.aiProbability != null && <span className="text-xs text-indigo-600">AI {d.aiProbability}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deals */}
      {!loading && tab === 'Deals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Add Deal</h3>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <input value={newDeal.title} onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))} placeholder="Deal title *" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newDeal.contactName} onChange={e => setNewDeal(p => ({ ...p, contactName: e.target.value }))} placeholder="Contact name *" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newDeal.company} onChange={e => setNewDeal(p => ({ ...p, company: e.target.value }))} placeholder="Company" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <input value={newDeal.value} onChange={e => setNewDeal(p => ({ ...p, value: e.target.value }))} placeholder="Value ($)" type="number" className="border rounded-lg px-3 py-2 text-sm w-36" />
              <select title="Stage" value={newDeal.stage} onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['prospecting', 'qualification', 'proposal', 'negotiation'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select title="Source" value={newDeal.source} onChange={e => setNewDeal(p => ({ ...p, source: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['inbound', 'outbound', 'referral', 'partner'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" onClick={createDeal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Add Deal</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Deal','Contact','Stage','Value','AI %','Source','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {deals.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium">{d.title}</div>{d.nextBestAction && <div className="text-xs text-indigo-600 mt-0.5 truncate max-w-xs">→ {d.nextBestAction}</div>}</td>
                    <td className="px-4 py-3"><div>{d.contactName}</div><div className="text-xs text-gray-400">{d.company}</div></td>
                    <td className="px-4 py-3">
                      <select title="Stage" value={d.stage} onChange={e => updateDealStage(d.id, e.target.value)} className="text-xs border rounded px-2 py-1">
                        {['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-medium">${d.value.toLocaleString()}</td>
                    <td className="px-4 py-3">{d.aiProbability != null ? <span className="text-indigo-600 font-medium">{d.aiProbability}%</span> : <span className="text-gray-400">{d.probability}%</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${SOURCE_COLORS[d.source] ?? 'bg-gray-100'}`}>{d.source}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => analyzeDeal(d.id, d.title)} className="text-indigo-600 hover:underline text-xs">Analyze</button>
                        <button type="button" onClick={() => deleteDeal(d.id)} className="text-red-500 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {deals.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No deals yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Scoring */}
      {!loading && tab === 'Lead Scoring' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Score a Lead</h3>
            <div className="flex gap-3">
              <input value={newLead.contactName} onChange={e => setNewLead(p => ({ ...p, contactName: e.target.value }))} placeholder="Contact name *" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input value={newLead.contactEmail} onChange={e => setNewLead(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Email" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input value={newLead.company} onChange={e => setNewLead(p => ({ ...p, company: e.target.value }))} placeholder="Company" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={scoreLead} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">🧠 Score Lead</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map(l => (
              <div key={l.id} className="bg-white rounded-xl border p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{l.contactName}</div>
                    <div className="text-xs text-gray-400">{l.company} · {l.contactEmail}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-700">{l.overallScore}</span>
                    <span className={`px-2 py-1 rounded-full text-sm font-bold ${GRADE_COLORS[l.grade] ?? 'bg-gray-100'}`}>{l.grade}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs text-center">
                  {[{ label: 'Fit', val: l.fitScore }, { label: 'Intent', val: l.intentScore }, { label: 'Engage', val: l.engagementScore }].map(m => (
                    <div key={m.label} className="bg-gray-50 rounded p-1"><div className="font-medium">{m.val}</div><div className="text-gray-400">{m.label}</div></div>
                  ))}
                </div>
                <p className="text-xs text-gray-600">{l.recommendation}</p>
                <button type="button" onClick={() => deleteLead(l.id)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            {leads.length === 0 && <div className="md:col-span-3 bg-white rounded-xl border p-8 text-center text-gray-400">No scored leads yet. Use the form above.</div>}
          </div>
        </div>
      )}

      {/* Forecast */}
      {!loading && tab === 'Forecast' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{forecasts.length} forecast snapshots</p>
            <button type="button" onClick={generateForecast} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">📈 Generate Forecast</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Period','Committed','Best Case','Pipeline','AI Adjusted','AI Confidence','Deals'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {forecasts.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{f.period}</td>
                    <td className="px-4 py-3">${f.committed.toFixed(0)}</td>
                    <td className="px-4 py-3">${f.bestCase.toFixed(0)}</td>
                    <td className="px-4 py-3">${f.pipeline.toFixed(0)}</td>
                    <td className="px-4 py-3 font-medium text-indigo-600">${f.aiAdjusted.toFixed(0)}</td>
                    <td className="px-4 py-3 text-green-600">{(f.aiConfidence * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3">{f.dealCount}</td>
                  </tr>
                ))}
                {forecasts.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No forecasts yet. Click Generate Forecast.</td></tr>}
              </tbody>
            </table>
          </div>
          {forecasts[0]?.aiSummary && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
              <div className="font-medium text-indigo-800 mb-1">AI Summary</div>
              <p className="text-sm text-indigo-700">{forecasts[0].aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
