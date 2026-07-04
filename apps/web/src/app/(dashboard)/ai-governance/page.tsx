'use client'
import { useState, useEffect, useCallback } from 'react'
import { Scale, Plus, Trash2, RefreshCw, ShieldCheck, AlertOctagon, ClipboardCheck } from 'lucide-react'

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

const TABS = ['Dashboard', 'Model Registry', 'Approvals', 'Usage Limits', 'Incidents']

export default function AiGovernancePage() {
  const api = useApi()
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [models, setModels] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [limits, setLimits] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Dashboard') {
      const d = await api.get('/ai-governance/dashboard'); setDashboard(d)
      const rv = await api.get('/ai-governance/reviews'); setReviews(rv.reviews ?? [])
    }
    if (tab === 'Model Registry') { const d = await api.get('/ai-governance/models'); setModels(d.models ?? []) }
    if (tab === 'Approvals') { const d = await api.get('/ai-governance/approvals'); setApprovals(d.approvals ?? []) }
    if (tab === 'Usage Limits') { const d = await api.get('/ai-governance/usage-limits'); setLimits(d.limits ?? []) }
    if (tab === 'Incidents') { const d = await api.get('/ai-governance/incidents'); setIncidents(d.incidents ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const tierColor = (t: string) => {
    const m: Record<string, string> = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', prohibited: 'bg-red-100 text-red-700' }
    return m[t] ?? 'bg-gray-100'
  }
  const statusColor = (s: string) => {
    const m: Record<string, string> = { approved: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-700', suspended: 'bg-red-100 text-red-700', open: 'bg-red-100 text-red-700', resolved: 'bg-green-100 text-green-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Governance</h1>
            <p className="text-sm text-gray-500">Model registry, approval gates, usage limits, incidents, and reviews</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-violet-50 border border-violet-200 text-violet-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className={`rounded-2xl p-6 text-center border ${dashboard.governanceStatus === 'healthy' ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
            <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
            <p className="text-2xl font-bold uppercase">{dashboard.governanceStatus.replace('-', ' ')}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Active Policies', dashboard.activePolicies], ['Registered Models', dashboard.registeredModels], ['Approved', dashboard.approvedModels], ['High Risk', dashboard.highRiskModels], ['Pending Approvals', dashboard.pendingApprovals], ['Open Incidents', dashboard.openIncidents], ['Limits Near Threshold', dashboard.limitsNearThreshold]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Governance Reviews</h3>
              <button type="button" onClick={() => api.post('/ai-governance/reviews', { reviewType: 'quarterly', scope: 'All AI systems' }).then((r: any) => { api.post('/ai-governance/reviews/' + r.id + '/complete', {}).then((c: any) => { notify('Review scored: ' + c.score); load() }) })} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm">Run Review</button>
            </div>
            {reviews.map((rv: any) => (
              <div key={rv.id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                <span>{rv.reviewType} — {rv.scope}</span>
                <span>{rv.status === 'completed' ? 'Score: ' + rv.score : rv.status}</span>
              </div>
            ))}
            {reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet</p>}
          </div>
        </div>
      )}

      {tab === 'Model Registry' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Model Registry ({models.length})</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => api.post('/ai-governance/models', { modelName: 'reno-brain-base', provider: 'reno-brain', riskTier: 'low', allowedUses: ['chat', 'summarization'], prohibitedUses: ['medical-diagnosis'] }).then(() => { notify('Model registered'); load() })} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm">+ Reno Brain</button>
              <button type="button" onClick={() => api.post('/ai-governance/models', { modelName: 'gpt-4', provider: 'openai', riskTier: 'high', prohibitedUses: ['pii-processing'] }).then(() => { notify('External model registered'); load() })} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm">+ External</button>
            </div>
          </div>
          <div className="grid gap-2">
            {models.map((m: any) => (
              <div key={m.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold font-mono">{m.modelName}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{m.provider}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor(m.riskTier)}`}>{m.riskTier} risk</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(m.approvalStatus)}`}>{m.approvalStatus}</span>
                  </div>
                  {(m.prohibitedUses ?? []).length > 0 && <p className="text-xs text-red-500">Prohibited: {(m.prohibitedUses ?? []).join(', ')}</p>}
                </div>
                <div className="flex gap-1">
                  {m.approvalStatus === 'pending' && <button type="button" onClick={() => api.post('/ai-governance/models/' + m.id + '/approve', {}).then((r: any) => { notify(r.error ?? 'Approved (audited)'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approve</button>}
                  {m.approvalStatus === 'approved' && <button type="button" onClick={() => api.post('/ai-governance/models/' + m.id + '/suspend', {}).then(() => { notify('Suspended'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Suspend</button>}
                  <button type="button" onClick={() => api.remove('/ai-governance/models/' + m.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {models.length === 0 && <div className="text-center py-8 text-gray-400">No models registered</div>}
          </div>
        </div>
      )}

      {tab === 'Approvals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Approval Requests ({approvals.length})</h2>
            <button type="button" onClick={() => api.post('/ai-governance/approvals', { requestType: 'external-provider', subject: 'Enable Claude for legal drafting', justification: 'Higher quality contract analysis' }).then(() => { notify('Request submitted'); load() })} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Request</button>
          </div>
          <div className="grid gap-2">
            {approvals.map((a: any) => (
              <div key={a.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a.requestType}</span>
                      <span className="font-medium">{a.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
                    </div>
                    {a.justification && <p className="text-xs text-gray-500">{a.justification}</p>}
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.post('/ai-governance/approvals/' + a.id + '/decide', { decision: 'approve', note: 'OK' }).then(() => { notify('Approved (audited)'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approve</button>
                      <button type="button" onClick={() => api.post('/ai-governance/approvals/' + a.id + '/decide', { decision: 'reject', note: 'Denied' }).then(() => { notify('Rejected'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {approvals.length === 0 && <div className="text-center py-8 text-gray-400">No approval requests</div>}
          </div>
        </div>
      )}

      {tab === 'Usage Limits' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Usage Limits ({limits.length})</h2>
            <button type="button" onClick={() => api.post('/ai-governance/usage-limits', { scope: 'tenant', limitType: 'tokens-per-day', limitValue: 1000000, action: 'warn' }).then(() => { notify('Limit created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Limit</button>
          </div>
          <div className="grid gap-2">
            {limits.map((l: any) => (
              <div key={l.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{l.limitType}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{l.scope}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.action === 'hard-block' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{l.action}</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => api.post('/ai-governance/usage-limits/' + l.id + '/consume', { amount: Math.round(l.limitValue * 0.3) }).then((r: any) => { notify(r.allowed ? (r.warning ? 'Consumed (warning: near limit)' : 'Consumed') : 'BLOCKED'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Consume 30%</button>
                    <button type="button" onClick={() => api.post('/ai-governance/usage-limits/' + l.id + '/reset', {}).then(() => { notify('Reset'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">Reset</button>
                    <button type="button" onClick={() => api.remove('/ai-governance/usage-limits/' + l.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{l.usedValue.toLocaleString()} / {l.limitValue.toLocaleString()}</span><span>{l.pctUsed}%</span></div>
                <div className="bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${l.pctUsed > 90 ? 'bg-red-500' : l.pctUsed > 70 ? 'bg-yellow-500' : 'bg-violet-500'}`} style={{ width: Math.min(100, l.pctUsed) + '%' }} /></div>
              </div>
            ))}
            {limits.length === 0 && <div className="text-center py-8 text-gray-400">No usage limits</div>}
          </div>
        </div>
      )}

      {tab === 'Incidents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><AlertOctagon className="w-5 h-5 text-red-500" /> AI Incidents ({incidents.length})</h2>
            <button type="button" onClick={() => api.post('/ai-governance/incidents', { incidentType: 'hallucination', severity: 'high', description: 'Model produced fabricated citation', modelRef: 'reno-brain-base' }).then(() => { notify('Incident logged'); load() })} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Log Incident</button>
          </div>
          <div className="grid gap-2">
            {incidents.map((i: any) => (
              <div key={i.id} className={`border rounded-xl p-3 ${i.status === 'open' ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor(i.severity)}`}>{i.severity}</span>
                      <span className="text-sm font-medium">{i.incidentType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(i.status)}`}>{i.status}</span>
                      {i.modelRef && <span className="text-xs font-mono text-gray-400">{i.modelRef}</span>}
                    </div>
                    <p className="text-xs text-gray-600">{i.description}</p>
                  </div>
                  {i.status === 'open' && <button type="button" onClick={() => api.post('/ai-governance/incidents/' + i.id + '/resolve', { resolution: 'Added guardrail' }).then(() => { notify('Resolved'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolve</button>}
                </div>
              </div>
            ))}
            {incidents.length === 0 && <div className="text-center py-8 text-gray-400">No incidents</div>}
          </div>
        </div>
      )}
    </div>
  )
}
