'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'
const p = (path: string) => `${API}?path=${encodeURIComponent(path)}`

async function apiGet(path: string) {
  const r = await fetch(p(path), { headers: { 'Content-Type': 'application/json' } })
  return r.json()
}
async function apiPost(path: string, body: any) {
  const r = await fetch(p(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}
async function apiPatch(path: string, body: any) {
  const r = await fetch(p(path), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}
async function apiDelete(path: string) {
  const r = await fetch(p(path), { method: 'DELETE' })
  return r.status === 204 ? {} : r.json()
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}
const SEV_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
}

export default function SupplyChainAIPage() {
  const [tab, setTab] = useState<'dashboard' | 'suppliers' | 'shipments' | 'forecasts' | 'alerts'>('dashboard')
  const [dash, setDash] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>({})
  const [shipForm, setShipForm] = useState<any>({})

  const loadDash = useCallback(async () => { const d = await apiGet('/sci/dashboard'); setDash(d) }, [])
  const loadSuppliers = useCallback(async () => { const d = await apiGet('/sci/suppliers'); setSuppliers(d) }, [])
  const loadShipments = useCallback(async () => { const d = await apiGet('/sci/shipments'); setShipments(d) }, [])
  const loadForecasts = useCallback(async () => { const d = await apiGet('/sci/demand-forecasts'); setForecasts(Array.isArray(d) ? d : []) }, [])
  const loadAlerts = useCallback(async () => { const d = await apiGet('/sci/inventory-alerts'); setAlerts(Array.isArray(d) ? d : []) }, [])

  useEffect(() => { loadDash() }, [loadDash])
  useEffect(() => {
    if (tab === 'suppliers') loadSuppliers()
    else if (tab === 'shipments') { loadShipments(); loadSuppliers() }
    else if (tab === 'forecasts') loadForecasts()
    else if (tab === 'alerts') loadAlerts()
  }, [tab, loadSuppliers, loadShipments, loadForecasts, loadAlerts])

  const addSupplier = async () => {
    if (!form.name) return
    setLoading(true)
    await apiPost('/sci/suppliers', form)
    setForm({})
    await loadSuppliers()
    setLoading(false)
  }

  const assessSupplier = async (id: string) => {
    setLoading(true)
    await apiPost(`/sci/suppliers/${id}/assess`, {})
    await loadSuppliers()
    setLoading(false)
  }

  const deleteSupplier = async (id: string) => {
    await apiDelete(`/sci/suppliers/${id}`)
    await loadSuppliers()
  }

  const addShipment = async () => {
    if (!shipForm.supplierId || !shipForm.scheduledDate) return
    setLoading(true)
    await apiPost('/sci/shipments', shipForm)
    setShipForm({})
    await loadShipments()
    setLoading(false)
  }

  const generateForecasts = async () => {
    setLoading(true)
    await apiPost('/sci/demand-forecasts/generate', { period: new Date().toISOString().slice(0, 7) })
    await loadForecasts()
    setLoading(false)
  }

  const generateAlerts = async () => {
    setLoading(true)
    await apiPost('/sci/inventory-alerts/generate', {})
    await loadAlerts()
    setLoading(false)
  }

  const resolveAlert = async (id: string) => {
    await apiPatch(`/sci/inventory-alerts/${id}/resolve`, {})
    await loadAlerts()
  }

  const tabs = ['dashboard', 'suppliers', 'shipments', 'forecasts', 'alerts'] as const

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">AI Supply Chain Intelligence</h1>
      <p className="text-sm text-gray-500 mb-6">AI-powered supplier risk, demand forecasting & shipment tracking</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && dash && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Suppliers', value: dash.kpis?.totalSuppliers ?? 0 },
              { label: 'High Risk Suppliers', value: dash.kpis?.highRiskSuppliers ?? 0, red: true },
              { label: 'Avg On-Time %', value: `${dash.kpis?.avgOnTime ?? 0}%` },
              { label: 'On-Time Rate', value: `${dash.kpis?.onTimeRate ?? 100}%` },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.red ? 'text-red-600' : 'text-indigo-600'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Critical Alerts</h3>
              {dash.criticalAlerts?.length === 0 && <p className="text-sm text-gray-400">No active alerts</p>}
              {dash.criticalAlerts?.map((a: any) => (
                <div key={a.id} className="mb-2 p-3 rounded-lg bg-red-50 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{a.skuName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_COLORS[a.severity] ?? ''}`}>{a.severity}</span>
                  </div>
                  <p className="text-gray-600 mt-1">{a.aiSuggestion}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Recent Shipments</h3>
              {dash.recentShipments?.length === 0 && <p className="text-sm text-gray-400">No shipments yet</p>}
              {dash.recentShipments?.map((s: any) => (
                <div key={s.id} className="mb-2 p-3 rounded-lg border text-sm flex justify-between">
                  <span>{s.trackingNumber ?? s.id.slice(0, 8)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'delivered' ? 'bg-green-100 text-green-800' : s.status === 'delayed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suppliers */}
      {tab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Supplier</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['name', 'country', 'category'].map(f => (
                <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={form[f] ?? ''}
                  onChange={e => setForm((p: any) => ({ ...p, [f]: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm" />
              ))}
              <input type="number" placeholder="Lead Time Days" value={form.leadTimeDays ?? ''}
                onChange={e => setForm((p: any) => ({ ...p, leadTimeDays: parseInt(e.target.value) }))}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="On-Time % (0-100)" value={form.onTimeDelivery ?? ''}
                onChange={e => setForm((p: any) => ({ ...p, onTimeDelivery: parseFloat(e.target.value) }))}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Quality Score (0-100)" value={form.qualityScore ?? ''}
                onChange={e => setForm((p: any) => ({ ...p, qualityScore: parseFloat(e.target.value) }))}
                className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={addSupplier} disabled={loading}
              className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              Add Supplier
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Name', 'Country', 'Category', 'On-Time %', 'Quality', 'AI Risk', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.country ?? '—'}</td>
                    <td className="px-4 py-3">{s.category ?? '—'}</td>
                    <td className="px-4 py-3">{s.onTimeDelivery}%</td>
                    <td className="px-4 py-3">{s.qualityScore}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_COLORS[s.aiRiskLevel] ?? ''}`}>{s.aiRiskLevel} ({s.aiRiskScore})</span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => assessSupplier(s.id)} className="text-xs text-indigo-600 hover:underline">Re-assess</button>
                      <button onClick={() => deleteSupplier(s.id)} className="text-xs text-red-500 hover:underline">Del</button>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No suppliers yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipments */}
      {tab === 'shipments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Shipment</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={shipForm.supplierId ?? ''} onChange={e => setShipForm((p: any) => ({ ...p, supplierId: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {['trackingNumber', 'origin', 'destination', 'carrier'].map(f => (
                <input key={f} placeholder={f.replace(/([A-Z])/g, ' $1')} value={shipForm[f] ?? ''}
                  onChange={e => setShipForm((p: any) => ({ ...p, [f]: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm" />
              ))}
              <input type="datetime-local" value={shipForm.scheduledDate ?? ''}
                onChange={e => setShipForm((p: any) => ({ ...p, scheduledDate: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={addShipment} disabled={loading}
              className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              Create Shipment
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Tracking #', 'Supplier', 'Route', 'Status', 'AI Delay Risk', 'AI ETA'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{s.trackingNumber ?? s.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{s.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{s.origin ?? '?'} → {s.destination ?? '?'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'delivered' ? 'bg-green-100 text-green-800' : s.status === 'delayed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-xs font-medium ${s.aiDelayRisk >= 60 ? 'text-red-600' : s.aiDelayRisk >= 30 ? 'text-yellow-600' : 'text-green-600'}`}>{s.aiDelayRisk}%</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{s.aiEta ? new Date(s.aiEta).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {shipments.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No shipments yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demand Forecasts */}
      {tab === 'forecasts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">AI Demand Forecasts</h3>
            <button onClick={generateForecasts} disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Forecasts'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecasts.map(f => (
              <div key={f.id} className="bg-white rounded-xl border p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">{f.skuName}</span>
                  <span className="text-xs text-gray-400">{f.period}</span>
                </div>
                <div className="text-2xl font-bold text-indigo-600 mb-1">{f.aiDemand} units</div>
                <div className="text-xs text-gray-500">Confidence: {(f.aiConfidence * 100).toFixed(0)}%</div>
                <div className="text-xs text-gray-500">Reorder: {f.reorderPoint} | Safety: {f.safetyStock}</div>
                {f.aiSummary && <p className="text-xs text-gray-600 mt-2 italic">{f.aiSummary}</p>}
              </div>
            ))}
            {forecasts.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">Generate AI demand forecasts to see predictions</div>}
          </div>
        </div>
      )}

      {/* Inventory Alerts */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Inventory Alerts</h3>
            <button onClick={generateAlerts} disabled={loading}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
              {loading ? 'Scanning...' : 'Scan Inventory'}
            </button>
          </div>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className={`bg-white rounded-xl border p-4 flex justify-between items-center ${a.resolved ? 'opacity-50' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{a.skuName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_COLORS[a.severity] ?? ''}`}>{a.severity}</span>
                    <span className="text-xs text-gray-500 capitalize">{a.alertType.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{a.aiSuggestion}</p>
                  <p className="text-xs text-gray-400 mt-1">Current: {a.currentQty} | Threshold: {a.threshold}</p>
                </div>
                {!a.resolved && (
                  <button onClick={() => resolveAlert(a.id)} className="ml-4 text-xs text-green-600 hover:underline shrink-0">Resolve</button>
                )}
              </div>
            ))}
            {alerts.length === 0 && <div className="text-center py-12 text-gray-400">No inventory alerts</div>}
          </div>
        </div>
      )}
    </div>
  )
}
