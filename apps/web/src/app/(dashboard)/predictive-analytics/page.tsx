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

interface Dataset { id: string; name: string; slug: string; dataType: string; source: string; rowCount: number; status: string; _count?: { models: number; forecasts: number } }
interface Model { id: string; name: string; algorithmType: string; targetColumn: string; status: string; accuracy?: number; maeScore?: number; rmseScore?: number; r2Score?: number; trainingMs?: number; dataset: Dataset }
interface Forecast { id: string; name: string; horizon: number; granularity: string; status: string; aiSummary?: string; insights?: string[]; runMs?: number; model: Model; dataset: Dataset; _count?: { predictions_: number } }
interface Anomaly { id: string; period: string; predictedAt: string; value: number; anomalyScore?: number }
interface Algorithm { id: string; name: string; desc: string; bestFor: string }
interface Template { slug: string; name: string; dataType: string; source: string; description: string }
interface Stats { totalDatasets: number; totalModels: number; trainedModels: number; totalForecasts: number; avgAccuracy: number; anomaliesDetected: number; grade: string }

const TABS = ['Dashboard', 'Datasets', 'Models', 'Forecasts', 'Anomalies'] as const
type Tab = typeof TABS[number]

const STATUS_COLORS: Record<string, string> = {
  ready: 'bg-green-100 text-green-700', processing: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700', untrained: 'bg-gray-100 text-gray-600',
  training: 'bg-blue-100 text-blue-700', trained: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700', pending: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
}
const GRADE_COLORS: Record<string, string> = { A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-orange-600', F: 'text-red-600' }
const SOURCE_ICONS: Record<string, string> = { finance: '💰', crm: '👥', hr: '👔', manual: '📊', custom: '⚙️' }
const ALGO_ICONS: Record<string, string> = { linear: '📈', arima: '〰️', prophet: '🔮', lstm: '🧠', xgboost: '🚀', ensemble: '⭐' }

export default function PredictiveAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Form state
  const [newDataset, setNewDataset] = useState({ name: '', slug: '', description: '', source: 'manual', dataType: 'timeseries' })
  const [newModel, setNewModel] = useState({ datasetId: '', name: '', algorithmType: 'prophet', targetColumn: '' })
  const [newForecast, setNewForecast] = useState({ modelId: '', name: '', horizon: 30, granularity: 'daily' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => {
    const d = await apiGet('/v1/apa/dashboard')
    setStats(d.stats); setAlgorithms(d.algorithms ?? [])
    const t = await apiGet('/v1/apa/dataset-templates')
    setTemplates(t.templates ?? [])
  }, [])
  const loadDatasets = useCallback(async () => { const d = await apiGet('/v1/apa/datasets'); setDatasets(d.datasets ?? []) }, [])
  const loadModels = useCallback(async () => { const d = await apiGet('/v1/apa/models'); setModels(d.models ?? []); setAlgorithms(d.algorithms ?? []) }, [])
  const loadForecasts = useCallback(async () => { const d = await apiGet('/v1/apa/forecasts'); setForecasts(d.forecasts ?? []) }, [])
  const loadAnomalies = useCallback(async () => { const d = await apiGet('/v1/apa/anomalies'); setAnomalies(d.anomalies ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard, Datasets: loadDatasets, Models: loadModels, Forecasts: loadForecasts, Anomalies: loadAnomalies,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadDatasets, loadModels, loadForecasts, loadAnomalies])

  const installTemplates = async () => {
    const r = await apiPost('/v1/apa/dataset-templates/install', {})
    flash(`${r.installed} dataset${r.installed !== 1 ? 's' : ''} installed`); await loadDatasets(); setTab('Datasets')
  }

  const createDataset = async () => {
    if (!newDataset.name || !newDataset.slug) return flash('Name and slug required')
    const r = await apiPost('/v1/apa/datasets', newDataset)
    if (r.id) { flash('Dataset created'); await loadDatasets(); setNewDataset({ name: '', slug: '', description: '', source: 'manual', dataType: 'timeseries' }) }
  }

  const createModel = async () => {
    if (!newModel.datasetId || !newModel.name || !newModel.targetColumn) return flash('Dataset, name and target column required')
    const r = await apiPost('/v1/apa/models', newModel)
    if (r.id) { flash('Model created'); await loadModels(); setNewModel({ datasetId: '', name: '', algorithmType: 'prophet', targetColumn: '' }) }
  }

  const trainModel = async (id: string, name: string) => {
    flash(`Training ${name}...`)
    const r = await apiPost(`/v1/apa/models/${id}/train`, {})
    flash(`${name} trained — accuracy: ${r.model?.accuracy?.toFixed(1)}%`); await loadModels()
  }

  const createForecast = async () => {
    if (!newForecast.modelId || !newForecast.name) return flash('Model and name required')
    const r = await apiPost('/v1/apa/forecasts', newForecast)
    if (r.id) { flash('Forecast created'); await loadForecasts(); setNewForecast({ modelId: '', name: '', horizon: 30, granularity: 'daily' }) }
  }

  const runForecast = async (id: string, name: string) => {
    flash(`Running forecast: ${name}...`)
    const r = await apiPost(`/v1/apa/forecasts/${id}/run`, {})
    flash(`${name} complete — ${r.result?.trend} trend`); await loadForecasts(); await loadAnomalies()
  }

  const deleteDataset = async (id: string) => { await apiDelete(`/v1/apa/datasets/${id}`); await loadDatasets() }
  const deleteModel = async (id: string) => { await apiDelete(`/v1/apa/models/${id}`); await loadModels() }
  const deleteForecast = async (id: string) => { await apiDelete(`/v1/apa/forecasts/${id}`); await loadForecasts() }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Predictive Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Forecast revenue, leads, headcount & KPIs · Train ML models · Detect anomalies</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* Dashboard */}
      {!loading && tab === 'Dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'AI Forecast Grade', value: stats.grade, color: GRADE_COLORS[stats.grade] ?? 'text-gray-600', large: true },
              { label: 'Datasets', value: stats.totalDatasets, color: 'text-blue-600' },
              { label: 'Trained Models', value: `${stats.trainedModels}/${stats.totalModels}`, color: 'text-green-600' },
              { label: 'Anomalies Found', value: stats.anomaliesDetected, color: stats.anomaliesDetected > 0 ? 'text-red-600' : 'text-gray-400' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`font-bold ${s.large ? 'text-5xl' : 'text-2xl'} ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Algorithms */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Available Algorithms</h3>
              <div className="space-y-2">
                {algorithms.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <span className="text-xl">{ALGO_ICONS[a.id] ?? '📊'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{a.name}</div>
                      <div className="text-xs text-gray-400 truncate">{a.bestFor}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Quick Start</h3>
              <div className="space-y-3">
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="font-medium text-indigo-800 text-sm mb-1">Step 1: Install Sample Datasets</div>
                  <div className="text-xs text-indigo-600 mb-2">Revenue, Leads, Headcount — pre-configured for instant use</div>
                  <button onClick={installTemplates} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700">Install {templates.length} Datasets</button>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="font-medium text-purple-800 text-sm mb-1">Step 2: Train a Model</div>
                  <div className="text-xs text-purple-600">Choose an algorithm, select target column, click Train</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="font-medium text-green-800 text-sm mb-1">Step 3: Run Forecast</div>
                  <div className="text-xs text-green-600">Generate predictions with confidence intervals & anomaly detection</div>
                </div>
              </div>
            </div>
          </div>

          {stats.avgAccuracy > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Average Model Accuracy</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${stats.avgAccuracy}%` }} />
                </div>
                <span className="text-lg font-bold text-green-600">{stats.avgAccuracy.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Datasets */}
      {!loading && tab === 'Datasets' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Add Dataset</h3>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <input value={newDataset.name} onChange={e => setNewDataset(p => ({ ...p, name: e.target.value }))} placeholder="Dataset name" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newDataset.slug} onChange={e => setNewDataset(p => ({ ...p, slug: e.target.value }))} placeholder="Unique slug" className="border rounded-lg px-3 py-2 text-sm" />
              <select value={newDataset.source} onChange={e => setNewDataset(p => ({ ...p, source: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['manual', 'finance', 'crm', 'hr', 'custom'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <input value={newDataset.description} onChange={e => setNewDataset(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={createDataset} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Add Dataset</button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map(d => (
              <div key={d.id} className="bg-white rounded-xl border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SOURCE_ICONS[d.source] ?? '📊'}</span>
                      <div className="font-semibold text-sm">{d.name}</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.slug}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>📋 {d.rowCount} rows</span>
                  <span>🤖 {d._count?.models ?? 0} models</span>
                  <span>📈 {d._count?.forecasts ?? 0} forecasts</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-xs text-gray-400">{d.dataType} · {d.source}</span>
                  <button onClick={() => deleteDataset(d.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
            {datasets.length === 0 && (
              <div className="md:col-span-3 bg-white rounded-xl border p-8 text-center">
                <p className="text-gray-400">No datasets. Install sample datasets from the Dashboard tab.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Models */}
      {!loading && tab === 'Models' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Create Model</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <select value={newModel.datasetId} onChange={e => setNewModel(p => ({ ...p, datasetId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Select dataset...</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input value={newModel.name} onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))} placeholder="Model name" className="border rounded-lg px-3 py-2 text-sm" />
              <select value={newModel.algorithmType} onChange={e => setNewModel(p => ({ ...p, algorithmType: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {algorithms.map(a => <option key={a.id} value={a.id}>{ALGO_ICONS[a.id]} {a.name}</option>)}
              </select>
              <input value={newModel.targetColumn} onChange={e => setNewModel(p => ({ ...p, targetColumn: e.target.value }))} placeholder="Target column (e.g. revenue)" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={createModel} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Create Model</button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Model','Algorithm','Target','Status','Accuracy','R²','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {models.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium">{m.name}</div><div className="text-xs text-gray-400">{m.dataset?.name}</div></td>
                    <td className="px-4 py-3">{ALGO_ICONS[m.algorithmType] ?? '📊'} {m.algorithmType}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.targetColumn}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>{m.status}</span></td>
                    <td className="px-4 py-3">{m.accuracy != null ? <span className="text-green-600 font-medium">{m.accuracy.toFixed(1)}%</span> : '—'}</td>
                    <td className="px-4 py-3">{m.r2Score != null ? m.r2Score.toFixed(3) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {m.status !== 'trained' && m.status !== 'training' && (
                          <button onClick={() => trainModel(m.id, m.name)} className="text-blue-600 hover:underline text-xs">Train</button>
                        )}
                        <button onClick={() => deleteModel(m.id)} className="text-red-500 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {models.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No models yet. Create one above.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forecasts */}
      {!loading && tab === 'Forecasts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">New Forecast</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <select value={newForecast.modelId} onChange={e => setNewForecast(p => ({ ...p, modelId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Select trained model...</option>
                {models.filter(m => m.status === 'trained').map(m => <option key={m.id} value={m.id}>{m.name} ({m.accuracy?.toFixed(0)}%)</option>)}
              </select>
              <input value={newForecast.name} onChange={e => setNewForecast(p => ({ ...p, name: e.target.value }))} placeholder="Forecast name" className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" value={newForecast.horizon} onChange={e => setNewForecast(p => ({ ...p, horizon: Number(e.target.value) }))} placeholder="Horizon (periods)" className="border rounded-lg px-3 py-2 text-sm" min={1} max={365} />
              <select value={newForecast.granularity} onChange={e => setNewForecast(p => ({ ...p, granularity: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['hourly', 'daily', 'weekly', 'monthly'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button onClick={createForecast} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Create Forecast</button>
          </div>

          <div className="space-y-3">
            {forecasts.map(f => (
              <div key={f.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.model?.name} · {f.horizon} {f.granularity} periods · {f._count?.predictions_ ?? 0} predictions</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[f.status] ?? 'bg-gray-100 text-gray-600'}`}>{f.status}</span>
                    {f.status !== 'completed' && (
                      <button onClick={() => runForecast(f.id, f.name)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">▶ Run</button>
                    )}
                    <button onClick={() => deleteForecast(f.id)} className="text-red-500 hover:underline text-xs">Del</button>
                  </div>
                </div>
                {f.aiSummary && <div className="bg-indigo-50 rounded-lg p-2 text-xs text-indigo-800 mb-2">{f.aiSummary}</div>}
                {f.insights && f.insights.length > 0 && (
                  <ul className="space-y-1">
                    {f.insights.map((ins, i) => <li key={i} className="text-xs text-gray-600">• {ins}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {forecasts.length === 0 && (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">No forecasts yet. Create one above after training a model.</div>
            )}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {!loading && tab === 'Anomalies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{anomalies.length} anomalies detected across all forecasts</p>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Period','Predicted At','Value','Anomaly Score','Flag'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {anomalies.map(a => (
                  <tr key={a.id} className="hover:bg-red-50">
                    <td className="px-4 py-3 font-mono text-xs">{a.period}</td>
                    <td className="px-4 py-3 text-xs">{new Date(a.predictedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">{a.value.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className="text-red-600 font-mono text-xs">{a.anomalyScore?.toFixed(3) ?? '—'}</span></td>
                    <td className="px-4 py-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">⚠ Anomaly</span></td>
                  </tr>
                ))}
                {anomalies.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No anomalies detected. Run a forecast to scan for outliers.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
