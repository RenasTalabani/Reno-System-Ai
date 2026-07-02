'use client'

import { useState, useEffect, useCallback } from 'react'

async function apiGet(path: string) { const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`); return r.json() }
async function apiPost(path: string, body?: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'POST', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined })
  return r.json()
}
async function apiDelete(path: string) { const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'DELETE' }); return r.json() }

interface LedgerEntry { id: string; period: string; category: string; subcategory?: string; description?: string; amount: number; budgeted?: number; type: string }
interface Pnl { revenue: number; cogs: number; grossProfit: number; grossMargin: number; opex: number; ebitda: number; ebitdaMargin: number; netIncome: number; period: string }
interface CashForecast { id: string; period: string; inflows: number; outflows: number; netCashFlow: number; closingBalance: number; aiAdjusted: number; aiConfidence: number; aiSummary?: string }
interface BudgetAlert { id: string; category: string; period: string; budgeted: number; actual: number; variance: number; variancePct: number; severity: string; aiSuggestion?: string; resolved: boolean }
interface Variance { category: string; budgeted: number; actual: number; variance: number; variancePct: number; severity: string; aiSuggestion: string }
interface Insight { id: string; type: string; title: string; summary?: string; impact?: number; severity: string; actionItems?: string[] }

const TABS = ['Dashboard', 'P&L', 'Ledger', 'Cash Flow', 'Budget', 'Insights'] as const
type Tab = typeof TABS[number]
const SEV: Record<string, string> = { info: 'bg-blue-50 border-blue-200', warning: 'bg-yellow-50 border-yellow-200', critical: 'bg-red-50 border-red-200' }
const BADGE: Record<string, string> = { info: 'bg-blue-100 text-blue-700', warning: 'bg-yellow-100 text-yellow-700', critical: 'bg-red-100 text-red-700' }

export default function FinancialIntelligencePage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [pnl, setPnl] = useState<Pnl | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [forecasts, setForecasts] = useState<CashForecast[]>([])
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const [variances, setVariances] = useState<Variance[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [newEntry, setNewEntry] = useState({ period: new Date().toISOString().substring(0, 7), category: 'revenue', description: '', amount: '', budgeted: '', type: 'actual' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/fi/dashboard'); setPnl(d.pnl); setAlerts(d.alerts ?? []) }, [])
  const loadPnl = useCallback(async () => { const d = await apiGet('/v1/fi/pnl'); setPnl(d.pnl) }, [])
  const loadLedger = useCallback(async () => { const d = await apiGet('/v1/fi/ledger'); setLedger(d.entries ?? []) }, [])
  const loadForecasts = useCallback(async () => { const d = await apiGet('/v1/fi/cash-forecast'); setForecasts(d.forecasts ?? []) }, [])
  const loadBudget = useCallback(async () => { const d = await apiGet('/v1/fi/budget-variance'); setVariances(d.variances ?? []); const a = await apiGet('/v1/fi/budget-alerts'); setAlerts(a.alerts ?? []) }, [])
  const loadInsights = useCallback(async () => { const d = await apiGet('/v1/fi/insights'); setInsights(d.insights ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = { Dashboard: loadDashboard, 'P&L': loadPnl, Ledger: loadLedger, 'Cash Flow': loadForecasts, Budget: loadBudget, Insights: loadInsights }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadPnl, loadLedger, loadForecasts, loadBudget, loadInsights])

  const addEntry = async () => {
    if (!newEntry.amount || !newEntry.period) return flash('Period and amount required')
    const r = await apiPost('/v1/fi/ledger', { ...newEntry, amount: Number(newEntry.amount), budgeted: newEntry.budgeted ? Number(newEntry.budgeted) : undefined })
    if (r.id) { flash('Entry added'); await loadLedger() }
  }

  const generateForecast = async () => {
    flash('Generating AI cash forecast...')
    const r = await apiPost('/v1/fi/cash-forecast/generate', { period: new Date().toISOString().substring(0, 7) })
    flash(`Cash forecast: Net $${r.result?.netCashFlow?.toFixed(0)} | Closing $${r.result?.closingBalance?.toFixed(0)}`); await loadForecasts()
  }

  const generateBudgetAlerts = async () => {
    flash('Analyzing budget variances...')
    const r = await apiPost('/v1/fi/budget-alerts/generate', { period: new Date().toISOString().substring(0, 7) })
    flash(`Generated ${r.alerts?.length ?? 0} budget alerts`); await loadBudget()
  }

  const generateInsights = async () => {
    flash('Running AI financial analysis...')
    const r = await apiPost('/v1/fi/insights/generate', {})
    flash(`Generated ${r.insights?.length ?? 0} insights`); await loadInsights()
  }

  const deleteEntry = async (id: string) => { await apiDelete(`/v1/fi/ledger/${id}`); await loadLedger() }

  const fmt = (n: number) => `$${n.toLocaleString('en', { maximumFractionDigits: 0 })}`
  const fmtPct = (n: number) => `${n.toFixed(1)}%`

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Financial Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">P&L analysis · Cash flow forecasting · Budget variance · AI financial insights</p>
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
      {!loading && tab === 'Dashboard' && pnl && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Revenue', value: fmt(pnl.revenue), color: 'text-green-600' },
              { label: 'Gross Margin', value: fmtPct(pnl.grossMargin), color: pnl.grossMargin >= 30 ? 'text-green-600' : 'text-red-600' },
              { label: 'EBITDA Margin', value: fmtPct(pnl.ebitdaMargin), color: pnl.ebitdaMargin >= 15 ? 'text-green-600' : 'text-orange-600' },
              { label: 'Net Income', value: fmt(pnl.netIncome), color: pnl.netIncome >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[{ label: 'Gross Profit', value: fmt(pnl.grossProfit) }, { label: 'EBITDA', value: fmt(pnl.ebitda) }, { label: 'Total OpEx', value: fmt(pnl.opex) }].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className="text-xl font-bold text-gray-700">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Active Budget Alerts</h3>
              <div className="space-y-2">
                {alerts.slice(0, 4).map(a => (
                  <div key={a.id} className={`p-3 rounded-lg border ${SEV[a.severity]}`}>
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm capitalize">{a.category} — {a.period}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[a.severity]}`}>{a.severity}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">Variance: {fmt(a.variance)} ({fmtPct(a.variancePct)})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* P&L */}
      {!loading && tab === 'P&L' && pnl && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Profit & Loss Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Revenue', value: pnl.revenue, bold: true, color: 'text-green-600' },
                { label: 'COGS', value: -pnl.cogs, bold: false, color: 'text-gray-700' },
                { label: 'Gross Profit', value: pnl.grossProfit, bold: true, color: pnl.grossProfit >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: `Gross Margin`, value: null, pct: pnl.grossMargin, bold: false, color: 'text-gray-400' },
                { label: 'Operating Expenses (OpEx)', value: -pnl.opex, bold: false, color: 'text-gray-700' },
                { label: 'EBITDA', value: pnl.ebitda, bold: true, color: pnl.ebitda >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: `EBITDA Margin`, value: null, pct: pnl.ebitdaMargin, bold: false, color: 'text-gray-400' },
                { label: 'CapEx', value: 0, bold: false, color: 'text-gray-700' },
                { label: 'Net Income', value: pnl.netIncome, bold: true, color: pnl.netIncome >= 0 ? 'text-green-600' : 'text-red-600' },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between py-2 ${row.bold ? 'border-t border-gray-200 font-semibold' : ''}`}>
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className={`text-sm ${row.color}`}>
                    {'pct' in row && row.pct !== undefined ? fmtPct(row.pct) : row.value != null ? fmt(row.value) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ledger */}
      {!loading && tab === 'Ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Add Ledger Entry</h3>
            <div className="flex flex-wrap gap-3">
              <input value={newEntry.period} onChange={e => setNewEntry(p => ({ ...p, period: e.target.value }))} placeholder="Period (YYYY-MM)" className="border rounded-lg px-3 py-2 text-sm w-36" />
              <select title="Category" value={newEntry.category} onChange={e => setNewEntry(p => ({ ...p, category: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['revenue', 'cogs', 'opex', 'capex', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={newEntry.description} onChange={e => setNewEntry(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input value={newEntry.amount} onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))} placeholder="Amount *" type="number" className="w-32 border rounded-lg px-3 py-2 text-sm" />
              <input value={newEntry.budgeted} onChange={e => setNewEntry(p => ({ ...p, budgeted: e.target.value }))} placeholder="Budgeted" type="number" className="w-28 border rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={addEntry} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Add Entry</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Period','Category','Description','Amount','Budgeted','Type',''].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {ledger.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{e.period}</td>
                    <td className="px-4 py-3 capitalize">{e.category}</td>
                    <td className="px-4 py-3 text-gray-500">{e.description ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-400">{e.budgeted ? fmt(e.budgeted) : '—'}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{e.type}</span></td>
                    <td className="px-4 py-3"><button type="button" onClick={() => deleteEntry(e.id)} className="text-xs text-red-500 hover:underline">Del</button></td>
                  </tr>
                ))}
                {ledger.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No ledger entries. Add your first transaction above.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cash Flow */}
      {!loading && tab === 'Cash Flow' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={generateForecast} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">📊 Generate Forecast</button>
          </div>
          {forecasts[0]?.aiSummary && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="font-medium text-indigo-800 mb-1">AI Summary</div>
              <p className="text-sm text-indigo-700">{forecasts[0].aiSummary}</p>
            </div>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Period','Inflows','Outflows','Net Cash','Opening Bal','Closing Bal','AI Adjusted','Confidence'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {forecasts.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{f.period}</td>
                    <td className="px-4 py-3 text-green-600">{fmt(f.inflows)}</td>
                    <td className="px-4 py-3 text-red-600">{fmt(f.outflows)}</td>
                    <td className={`px-4 py-3 font-medium ${f.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(f.netCashFlow)}</td>
                    <td className="px-4 py-3">{fmt(f.openingBalance)}</td>
                    <td className={`px-4 py-3 font-medium ${f.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(f.closingBalance)}</td>
                    <td className="px-4 py-3 text-indigo-600">{fmt(f.aiAdjusted)}</td>
                    <td className="px-4 py-3">{fmtPct(f.aiConfidence * 100)}</td>
                  </tr>
                ))}
                {forecasts.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No forecasts. Click Generate above.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Budget */}
      {!loading && tab === 'Budget' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={generateBudgetAlerts} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">⚠️ Analyze Variances</button>
          </div>
          {variances.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">Budget Variance Analysis</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-t"><tr>{['Category','Budgeted','Actual','Variance','Variance %','Status','AI Suggestion'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {variances.map(v => (
                    <tr key={v.category} className="hover:bg-gray-50">
                      <td className="px-4 py-3 capitalize font-medium">{v.category}</td>
                      <td className="px-4 py-3">{fmt(v.budgeted)}</td>
                      <td className="px-4 py-3">{fmt(v.actual)}</td>
                      <td className={`px-4 py-3 font-medium ${v.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>{v.variance > 0 ? '+' : ''}{fmt(v.variance)}</td>
                      <td className={`px-4 py-3 ${v.variancePct > 10 ? 'text-red-600' : 'text-gray-600'}`}>{fmtPct(v.variancePct)}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[v.severity]}`}>{v.severity}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{v.aiSuggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Budget Alerts</h3>
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className={`p-3 rounded-lg border ${SEV[a.severity]}`}>
                  <div className="flex justify-between">
                    <div className="font-medium text-sm capitalize">{a.category} · {a.period}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[a.severity]}`}>{a.severity}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Budget: {fmt(a.budgeted)} · Actual: {fmt(a.actual)} · Gap: {fmt(a.variance)} ({fmtPct(a.variancePct)})</div>
                  {a.aiSuggestion && <div className="text-xs text-gray-500 mt-1 italic">{a.aiSuggestion}</div>}
                </div>
              ))}
              {alerts.length === 0 && <p className="text-sm text-gray-400">No alerts. Click "Analyze Variances" to generate.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {!loading && tab === 'Insights' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{insights.length} financial insights</p>
            <button type="button" onClick={generateInsights} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">🧠 Generate AI Insights</button>
          </div>
          <div className="space-y-3">
            {insights.map(i => (
              <div key={i.id} className={`rounded-xl border p-4 ${SEV[i.severity] ?? 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-800">{i.title}</div>
                  <div className="flex items-center gap-2">
                    {i.impact != null && <span className="text-sm font-medium text-gray-600">{fmt(i.impact)}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[i.severity]}`}>{i.severity}</span>
                  </div>
                </div>
                {i.summary && <p className="text-sm text-gray-600 mb-2">{i.summary}</p>}
                {i.actionItems && i.actionItems.length > 0 && (
                  <ul className="space-y-0.5">
                    {i.actionItems.map((a, idx) => <li key={idx} className="text-xs text-gray-700">• {a}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {insights.length === 0 && <div className="bg-white rounded-xl border p-8 text-center text-gray-400">No insights yet. Add ledger entries and click Generate AI Insights.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
