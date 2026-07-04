'use client'
import { useState, useEffect, useCallback } from 'react'
import { Lightbulb, Trash2, RefreshCw, GitBranch, FileBarChart, Sparkles } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as HeadersInit }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as HeadersInit }).then(r => r.json())
  return { get, post, remove }
}

const TABS = ['Decisions', 'Explanation', 'Feature Importance', 'Reports', 'Stats']

export default function ExplainabilityPage() {
  const api = useApi()
  const [tab, setTab] = useState('Decisions')
  const [decisions, setDecisions] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [explanation, setExplanation] = useState<any>(null)
  const [counterfactuals, setCounterfactuals] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Decisions') { const d = await api.get('/explainability/decisions'); setDecisions(d.decisions ?? []) }
    if (tab === 'Explanation' && selected) {
      const e = await api.get('/explainability/decisions/' + selected.id + '/explain'); setExplanation(e)
      const c = await api.get('/explainability/decisions/' + selected.id + '/counterfactuals'); setCounterfactuals(c.counterfactuals ?? [])
    }
    if (tab === 'Feature Importance') { const d = await api.get('/explainability/feature-importance/reno-brain-credit'); setFeatures(d.features ?? []) }
    if (tab === 'Reports') { const d = await api.get('/explainability/reports'); setReports(d.reports ?? []) }
    if (tab === 'Stats') { const d = await api.get('/explainability/stats'); setStats(d) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  async function seedFeatures() {
    await api.post('/explainability/feature-importance', { modelRef: 'reno-brain-credit', features: [
      { featureName: 'account_age', importance: 0.35 },
      { featureName: 'transaction_history', importance: 0.28 },
      { featureName: 'recent_disputes', importance: 0.18 },
      { featureName: 'balance', importance: 0.12 },
      { featureName: 'region', importance: 0.07 },
    ] })
    notify('Feature importance seeded'); load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Explainability</h1>
            <p className="text-sm text-gray-500">Decision explanations, feature attribution, counterfactuals, and transparency reports</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.modelRef} → {selected.outcome} ({(selected.confidence * 100).toFixed(0)}%)</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-amber-600">Clear</button>
        </div>
      )}

      {tab === 'Decisions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Decisions ({decisions.length})</h2>
            <button type="button" onClick={() => api.post('/explainability/simulate/decision', { modelRef: 'reno-brain-credit', subjectRef: 'applicant-' + Date.now() }).then((r: any) => { notify('Decision: ' + r.decision.outcome + ' with ' + r.factorsCreated + ' factors'); load() })} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"><Sparkles className="w-4 h-4" /> Simulate Decision</button>
          </div>
          <div className="grid gap-2">
            {decisions.map((d: any) => (
              <div key={d.id} onClick={() => { setSelected(d); setTab('Explanation') }} className="bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-amber-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{d.modelRef}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.outcome === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.outcome}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.decisionType}</span>
                  </div>
                  <p className="text-xs text-gray-400">{d.inputSummary} · confidence {(d.confidence * 100).toFixed(0)}% · {d._count?.factors ?? 0} factors</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); api.remove('/explainability/decisions/' + d.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {decisions.length === 0 && <div className="text-center py-12 text-gray-400">No decisions — simulate one</div>}
          </div>
        </div>
      )}

      {tab === 'Explanation' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a decision first</div> : explanation && (
            <>
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold mb-2">Plain-language explanation</h3>
                <p className="text-sm text-gray-700">{explanation.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Factors supporting</h4>
                  {(explanation.decision.factors ?? []).filter((f: any) => f.direction === 'positive').map((f: any) => (
                    <div key={f.id} className="flex items-center gap-2 py-1">
                      <div className="flex-1"><span className="text-sm">{f.featureName}</span> {f.value && <span className="text-xs text-gray-400">({f.value})</span>}</div>
                      <div className="w-24 bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: Math.min(100, Math.abs(f.contribution) * 100) + '%' }} /></div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">Factors against</h4>
                  {(explanation.decision.factors ?? []).filter((f: any) => f.direction === 'negative').map((f: any) => (
                    <div key={f.id} className="flex items-center gap-2 py-1">
                      <div className="flex-1"><span className="text-sm">{f.featureName}</span> {f.value && <span className="text-xs text-gray-400">({f.value})</span>}</div>
                      <div className="w-24 bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: Math.min(100, Math.abs(f.contribution) * 100) + '%' }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><GitBranch className="w-4 h-4" /> Counterfactuals</h4>
                  <button type="button" onClick={() => api.post('/explainability/decisions/' + selected.id + '/counterfactuals/auto', {}).then((r: any) => { notify('Generated ' + r.generated); load() })} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Auto-generate</button>
                </div>
                {counterfactuals.map((c: any) => (
                  <div key={c.id} className="text-sm py-1 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.wouldChangeOutcome ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{c.wouldChangeOutcome ? 'would flip' : 'no change'}</span>
                    <span>{c.change}</span>
                  </div>
                ))}
                {counterfactuals.length === 0 && <p className="text-xs text-gray-400">No counterfactuals — auto-generate</p>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Feature Importance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Feature Importance — reno-brain-credit ({features.length})</h2>
            <button type="button" onClick={seedFeatures} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">Seed Features</button>
          </div>
          <div className="bg-white border rounded-xl p-5 space-y-3">
            {features.map((f: any) => (
              <div key={f.id} className="flex items-center gap-3">
                <span className="text-xs w-6 text-gray-400">#{f.rank + 1}</span>
                <span className="text-sm w-40">{f.featureName}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3"><div className="bg-amber-500 h-3 rounded-full" style={{ width: (f.importance * 100) + '%' }} /></div>
                <span className="text-xs font-mono w-12 text-right">{(f.importance * 100).toFixed(0)}%</span>
              </div>
            ))}
            {features.length === 0 && <div className="text-center py-8 text-gray-400">No feature importance — click Seed Features</div>}
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><FileBarChart className="w-5 h-5" /> Transparency Reports ({reports.length})</h2>
            <button type="button" onClick={() => api.post('/explainability/reports/generate', { modelRef: 'reno-brain-credit' }).then(() => { notify('Report generated'); load() })} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">Generate Report</button>
          </div>
          <div className="grid gap-2">
            {reports.map((r: any) => (
              <div key={r.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{r.modelRef}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.reportType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span>
                  </div>
                  <div className="flex gap-1">
                    {r.status !== 'published' && <button type="button" onClick={() => api.post('/explainability/reports/' + r.id + '/publish', {}).then(() => { notify('Published'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish</button>}
                    <button type="button" onClick={() => api.remove('/explainability/reports/' + r.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {r.content?.avgConfidence != null && <p className="text-xs text-gray-500 mt-2">{r.content.decisionsAnalyzed} decisions · avg confidence {(r.content.avgConfidence * 100).toFixed(0)}% · {r.content.lowConfidenceDecisions} low-confidence</p>}
              </div>
            ))}
            {reports.length === 0 && <div className="text-center py-8 text-gray-400">No reports</div>}
          </div>
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Explainability Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Decisions', stats.decisions], ['Factors', stats.factors], ['Traces', stats.traces], ['Counterfactuals', stats.counterfactuals], ['Feature Imp.', stats.featureImportances], ['Reports', stats.reports]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
