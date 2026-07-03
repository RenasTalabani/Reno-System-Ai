'use client'
import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Plus, Trash2, RefreshCw, Laptop, ShieldAlert, Network } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as HeadersInit }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as HeadersInit }).then(r => r.json())
  const patch = (url: string, body: unknown) => fetch(API + url, { method: 'PATCH', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  return { get, post, remove, patch }
}

const TABS = ['Posture', 'Policies', 'Devices', 'Access Log', 'Violations']

export default function ZeroTrustPage() {
  const api = useApi()
  const [tab, setTab] = useState('Posture')
  const [posture, setPosture] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [showPolicy, setShowPolicy] = useState(false)
  const [policyForm, setPolicyForm] = useState({ name: '', policyType: 'access', resource: '/api/*', action: 'allow', priority: 0 })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Posture') { const d = await api.get('/zero-trust/posture'); setPosture(d) }
    if (tab === 'Policies') { const d = await api.get('/zero-trust/policies'); setPolicies(d.policies ?? []) }
    if (tab === 'Devices') { const d = await api.get('/zero-trust/devices'); setDevices(d.devices ?? []) }
    if (tab === 'Access Log') { const d = await api.get('/zero-trust/access/requests'); setRequests(d.requests ?? []) }
    if (tab === 'Violations') { const d = await api.get('/zero-trust/violations'); setViolations(d.violations ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  async function createPolicy() {
    const res = await api.post('/zero-trust/policies', policyForm)
    if (res.id) { notify('Policy created'); setShowPolicy(false); load() } else notify(res.error ?? 'Error')
  }

  async function testAccess() {
    const res = await api.post('/zero-trust/access/evaluate', { resource: '/api/finance/reports', context: { newIp: true } })
    notify('Decision: ' + res.decision + ' (risk ' + res.riskScore + ') — ' + res.reason)
  }

  const decisionColor = (d: string) => {
    const m: Record<string, string> = { allow: 'bg-green-100 text-green-700', deny: 'bg-red-100 text-red-700', 'mfa-required': 'bg-yellow-100 text-yellow-700' }
    return m[d] ?? 'bg-gray-100 text-gray-700'
  }
  const sevColor = (s: string) => {
    const m: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-blue-100 text-blue-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }
  const trustColor = (t: string) => {
    const m: Record<string, string> = { trusted: 'bg-green-100 text-green-700', managed: 'bg-blue-100 text-blue-700', basic: 'bg-yellow-100 text-yellow-700', unverified: 'bg-red-100 text-red-700' }
    return m[t] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zero Trust</h1>
            <p className="text-sm text-gray-500">Policies, device trust, access decisions, and security posture</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={testAccess} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">Test Access</button>
          <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {msg && <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Posture' && posture && (
        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-6xl font-bold text-indigo-600">{posture.grade}</p>
            <p className="text-lg mt-2">Posture Score: {posture.postureScore}/100</p>
            <p className="text-sm text-gray-500 mt-1">Avg risk {posture.avgRiskScore} · {posture.openViolations} open violations</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Devices', posture.devices], ['Compliant', posture.compliantDevices], ['Policies', posture.activePolicies], ['Violations', posture.openViolations], ['Denials', posture.recentDenials], ['Avg Risk', posture.avgRiskScore]] as [string, any][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-xl font-bold">{v}</p><p className="text-xs text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Attack Simulations (safe)</h3>
            <div className="flex flex-wrap gap-2">
              {['credential-stuffing', 'lateral-movement', 'data-exfiltration', 'privilege-escalation'].map(s => (
                <button type="button" key={s} onClick={() => api.post('/zero-trust/simulate/attack', { scenario: s }).then(() => { notify('Simulated: ' + s); load() })} className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Policies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Policies ({policies.length})</h2>
            <button type="button" onClick={() => setShowPolicy(!showPolicy)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Policy</button>
          </div>
          {showPolicy && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Policy name" value={policyForm.name} onChange={e => setPolicyForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Resource pattern (e.g. /api/finance/*)" value={policyForm.resource} onChange={e => setPolicyForm(f => ({...f, resource: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm font-mono" />
                <select value={policyForm.policyType} onChange={e => setPolicyForm(f => ({...f, policyType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['access', 'device', 'network', 'data', 'session'].map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={policyForm.action} onChange={e => setPolicyForm(f => ({...f, action: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['allow', 'deny', 'mfa-required', 'step-up'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={createPolicy} disabled={!policyForm.name || !policyForm.resource} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowPolicy(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            {policies.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${decisionColor(p.action)}`}>{p.action}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.policyType}</span>
                    {p.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{p.resource} · priority {p.priority}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.patch('/zero-trust/policies/' + p.id, { isActive: !p.isActive }).then(() => { notify('Updated'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{p.isActive ? 'Disable' : 'Enable'}</button>
                  <button type="button" onClick={() => api.remove('/zero-trust/policies/' + p.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {policies.length === 0 && <div className="text-center py-8 text-gray-400">No policies</div>}
          </div>
        </div>
      )}

      {tab === 'Devices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Laptop className="w-5 h-5" /> Devices ({devices.length})</h2>
            <button type="button" onClick={() => api.post('/zero-trust/devices', { name: 'device-' + Date.now(), deviceType: 'laptop', os: 'Windows 11' }).then(() => { notify('Device registered'); load() })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Register Device</button>
          </div>
          <div className="grid gap-2">
            {devices.map((d: any) => (
              <div key={d.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${trustColor(d.trustLevel)}`}>{d.trustLevel}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.deviceType}</span>
                    {d.isCompliant ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">compliant</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">non-compliant</span>}
                  </div>
                  <p className="text-xs text-gray-400">{d.os} {d.lastCheckAt && '· checked ' + new Date(d.lastCheckAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/zero-trust/devices/' + d.id + '/compliance-check', {}).then((r: any) => { notify('Check: ' + r.passed + '/4 passed — ' + (r.isCompliant ? 'compliant' : 'non-compliant')); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Check</button>
                  <button type="button" onClick={() => api.post('/zero-trust/devices/' + d.id + '/trust', { trustLevel: 'trusted' }).then(() => { notify('Trusted'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Trust</button>
                  <button type="button" onClick={() => api.remove('/zero-trust/devices/' + d.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {devices.length === 0 && <div className="text-center py-8 text-gray-400">No devices registered</div>}
          </div>
        </div>
      )}

      {tab === 'Access Log' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Network className="w-5 h-5" /> Access Requests ({requests.length})</h2>
          <div className="grid gap-2">
            {requests.map((q: any) => (
              <div key={q.id} className="bg-white border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${decisionColor(q.decision)}`}>{q.decision}</span>
                  <span className="text-sm font-mono">{q.resource}</span>
                  <span className="text-xs text-gray-400">risk: {q.riskScore}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{q.reason}</p>
                <p className="text-xs text-gray-400">{new Date(q.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {requests.length === 0 && <div className="text-center py-8 text-gray-400">No access requests — use Test Access</div>}
          </div>
        </div>
      )}

      {tab === 'Violations' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Violations ({violations.length})</h2>
          <div className="grid gap-2">
            {violations.map((v: any) => (
              <div key={v.id} className={`border rounded-xl p-3 ${v.isResolved ? 'bg-gray-50' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(v.severity)}`}>{v.severity}</span>
                      <span className="text-sm font-medium">{v.violationType}</span>
                      {v.isResolved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">resolved</span>}
                    </div>
                    <p className="text-xs text-gray-600">{v.description}</p>
                    <p className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                  {!v.isResolved && <button type="button" onClick={() => api.post('/zero-trust/violations/' + v.id + '/resolve', {}).then(() => { notify('Resolved'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolve</button>}
                </div>
              </div>
            ))}
            {violations.length === 0 && <div className="text-center py-8 text-gray-400">No violations</div>}
          </div>
        </div>
      )}
    </div>
  )
}
