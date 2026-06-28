'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Brain, Plus, Play, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface FcstModel { id: string; name: string; type: string; status: string; accuracy: number | null; lastTrainedAt: string | null; _count?: { predictions: number } }
interface Prediction { period: string; predicted: number; lowerBound: number; upperBound: number; confidence: number; actual: number | null }
interface Anomaly { id: string; metric: string; period: string; expected: number; actual: number; deviation: number; severity: string; acknowledged: boolean }
interface Dashboard { trainedModels: number; nextMonthPrediction: { period: string; predicted: number; confidence: number } | null; unacknowledgedAnomalies: number; recentPredictions: Prediction[] }

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-red-500/20 text-red-400',
}

export default function ForecastingPage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<'overview' | 'models' | 'anomalies'>('overview')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [models, setModels] = useState<FcstModel[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [training, setTraining] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'revenue', targetMetric: 'revenue' })

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/v1/forecasting/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/forecasting/models`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/forecasting/anomalies`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([d, m, a]) => { setDashboard(d.data); setModels(m.data ?? []); setAnomalies(a.data ?? []) })
  }, [token])

  const trainModel = async (id: string) => {
    setTraining(id)
    const res = await fetch(`${API}/v1/forecasting/models/${id}/train`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    setTraining(null)
    if (res.data?.predictions) setPredictions(res.data.predictions)
    setModels(m => m.map(x => x.id === id ? { ...x, status: 'trained', accuracy: res.data?.accuracy } : x))
  }

  const detectAnomalies = async () => {
    setDetecting(true)
    const res = await fetch(`${API}/v1/forecasting/anomalies/detect`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    setDetecting(false)
    if (res.data?.anomalies?.length) setAnomalies(prev => [...res.data.anomalies, ...prev])
  }

  const acknowledge = async (id: string) => {
    await fetch(`${API}/v1/forecasting/anomalies/${id}/acknowledge`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setAnomalies(a => a.map(x => x.id === id ? { ...x, acknowledged: true } : x))
  }

  const createModel = async () => {
    const res = await fetch(`${API}/v1/forecasting/models`, { method: 'POST', headers: h, body: JSON.stringify(form) }).then(r => r.json())
    if (res.data) { setModels(m => [res.data, ...m]); setShowCreate(false) }
  }

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  const maxPred = Math.max(...(dashboard?.recentPredictions ?? []).map(p => Number(p.predicted)), 1)

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-500" /> AI Forecasting & Predictive Analytics
      </h1>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          {(['overview', 'models', 'anomalies'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg capitalize transition-colors ${tab === t ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={detectAnomalies} disabled={detecting} className="flex items-center gap-2 border border-border text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
            <AlertTriangle className="w-4 h-4 text-amber-400" />{detecting ? 'Detecting...' : 'Detect Anomalies'}
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Model
          </button>
        </div>
      </div>

      {tab === 'overview' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Trained Models', value: dashboard.trainedModels, color: 'text-indigo-400' },
              { label: 'Next Month Forecast', value: dashboard.nextMonthPrediction ? fmt(Number(dashboard.nextMonthPrediction.predicted)) : 'No data', color: 'text-green-400' },
              { label: 'Unacked Anomalies', value: dashboard.unacknowledgedAnomalies, color: dashboard.unacknowledgedAnomalies > 0 ? 'text-red-400' : 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {dashboard.recentPredictions.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Forecast</h3>
              <div className="flex items-end gap-2 h-32">
                {dashboard.recentPredictions.map(p => {
                  const h = Math.max(4, (Number(p.predicted) / maxPred) * 100)
                  return (
                    <div key={p.period} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-indigo-500/20 rounded-t-sm relative" style={{ height: `${h}%` }}>
                        <div className="absolute inset-0 bg-indigo-500/40 rounded-t-sm" style={{ height: `${Math.min(100, (Number(p.confidence ?? 80)) / 100 * 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{p.period.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {predictions.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Latest Training Predictions</h3>
              <div className="space-y-2">
                {predictions.map(p => (
                  <div key={p.period} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{p.period}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{fmt(p.lowerBound)} – {fmt(p.upperBound)}</span>
                      <span className="font-semibold text-foreground">{fmt(p.predicted)}</span>
                      <span className="text-xs text-indigo-400">{p.confidence}% conf.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'models' && (
        <div className="space-y-3">
          {models.map(m => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm">{m.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.status === 'trained' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>{m.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.type} · {m._count?.predictions ?? 0} predictions{m.accuracy != null ? ` · ${m.accuracy}% accuracy` : ''}</p>
              </div>
              <button onClick={() => trainModel(m.id)} disabled={training === m.id}
                className="flex items-center gap-1.5 text-xs text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:text-indigo-300 transition-colors disabled:opacity-50">
                <Play className="w-3 h-3" />{training === m.id ? 'Training...' : 'Train'}
              </button>
            </div>
          ))}
          {models.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No models yet. Create one to get started.</p>}
        </div>
      )}

      {tab === 'anomalies' && (
        <div className="space-y-3">
          {anomalies.map(a => (
            <div key={a.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${a.acknowledged ? 'opacity-50 border-border' : 'border-amber-500/30'}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${a.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm">{a.metric} anomaly — {a.period}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                </div>
                <p className="text-xs text-muted-foreground">Expected {fmt(Number(a.expected))} · Actual {fmt(Number(a.actual))} · {Number(a.deviation).toFixed(1)}σ deviation</p>
              </div>
              {!a.acknowledged && (
                <button onClick={() => acknowledge(a.id)} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" /> Acknowledge
                </button>
              )}
            </div>
          ))}
          {anomalies.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No anomalies detected. Click "Detect Anomalies" to scan.</p>}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">New Forecast Model</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                  {['revenue', 'churn', 'inventory', 'headcount'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={createModel} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
