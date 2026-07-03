'use client'
import { useState, useEffect, useCallback } from 'react'
import { Siren, Plus, Trash2, RefreshCw, Crosshair, BookOpen, Users2 } from 'lucide-react'

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

const TABS = ['Overview', 'Incidents', 'Alert Rules', 'Threat Intel', 'Playbooks']

export default function SocPage() {
  const api = useApi()
  const [tab, setTab] = useState('Overview')
  const [overview, setOverview] = useState<any>(null)
  const [incidents, setIncidents] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [intel, setIntel] = useState<any[]>([])
  const [playbooks, setPlaybooks] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [showIncident, setShowIncident] = useState(false)
  const [incForm, setIncForm] = useState({ title: '', severity: 'medium', category: 'intrusion', description: '' })
  const [iocValue, setIocValue] = useState('185.220.101.1')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Overview') { const d = await api.get('/soc/overview'); setOverview(d) }
    if (tab === 'Incidents') { const d = await api.get('/soc/incidents'); setIncidents(d.incidents ?? []) }
    if (tab === 'Alert Rules') { const d = await api.get('/soc/alert-rules'); setRules(d.rules ?? []) }
    if (tab === 'Threat Intel') { const d = await api.get('/soc/threat-intel'); setIntel(d.indicators ?? []) }
    if (tab === 'Playbooks') { const d = await api.get('/soc/playbooks'); setPlaybooks(d.playbooks ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  async function createIncident() {
    const res = await api.post('/soc/incidents', incForm)
    if (res.id) { notify('Incident created'); setShowIncident(false); load() } else notify(res.error ?? 'Error')
  }

  const sevColor = (s: string) => {
    const m: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-blue-100 text-blue-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }
  const statusColor = (s: string) => {
    const m: Record<string, string> = { open: 'bg-red-100 text-red-700', investigating: 'bg-yellow-100 text-yellow-700', contained: 'bg-blue-100 text-blue-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Siren className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SOC Dashboard</h1>
            <p className="text-sm text-gray-500">Incidents, alert rules, threat intelligence, and response playbooks</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && overview && (
        <div className="space-y-6">
          <div className={`rounded-2xl p-6 text-center ${overview.threatLevel === 'critical' ? 'bg-red-50 border border-red-300' : overview.threatLevel === 'elevated' ? 'bg-yellow-50 border border-yellow-300' : 'bg-green-50 border border-green-300'}`}>
            <p className="text-sm uppercase tracking-wide text-gray-500">Threat Level</p>
            <p className={`text-4xl font-bold mt-1 ${overview.threatLevel === 'critical' ? 'text-red-600' : overview.threatLevel === 'elevated' ? 'text-yellow-600' : 'text-green-600'}`}>{overview.threatLevel.toUpperCase()}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Total Incidents', overview.totalIncidents], ['Open', overview.openIncidents], ['Critical Open', overview.criticalOpen], ['Avg MTTR (min)', overview.avgMttrMinutes]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-3">By Severity</h3>
              {Object.entries(overview.bySeverity ?? {}).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-sm py-1"><span className={`px-2 rounded ${sevColor(k)}`}>{k}</span><span>{v}</span></div>
              ))}
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-3">By Category</h3>
              {Object.entries(overview.byCategory ?? {}).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-sm py-1"><span>{k}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Incidents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Incidents ({incidents.length})</h2>
            <button type="button" onClick={() => setShowIncident(!showIncident)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Incident</button>
          </div>
          {showIncident && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <input placeholder="Title" value={incForm.title} onChange={e => setIncForm(f => ({...f, title: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <div className="grid grid-cols-2 gap-3">
                <select value={incForm.severity} onChange={e => setIncForm(f => ({...f, severity: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['low', 'medium', 'high', 'critical'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={incForm.category} onChange={e => setIncForm(f => ({...f, category: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['intrusion', 'malware', 'phishing', 'data-leak', 'dos', 'insider-threat', 'misconfiguration'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <textarea placeholder="Description" value={incForm.description} onChange={e => setIncForm(f => ({...f, description: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" rows={2} />
              <div className="flex gap-2">
                <button type="button" onClick={createIncident} disabled={!incForm.title} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowIncident(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(inc.severity)}`}>{inc.severity}</span>
                      <span className="font-medium">{inc.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inc.status)}`}>{inc.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{inc.category}</span>
                    </div>
                    {inc.description && <p className="text-xs text-gray-500">{inc.description}</p>}
                    <p className="text-xs text-gray-400">Detected {new Date(inc.detectedAt).toLocaleString()} {inc.mttrMinutes != null && '· MTTR ' + inc.mttrMinutes + ' min'}</p>
                  </div>
                  <div className="flex gap-1">
                    {inc.status === 'open' && <button type="button" onClick={() => api.patch('/soc/incidents/' + inc.id, { status: 'investigating' }).then(() => { notify('Investigating'); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Investigate</button>}
                    {['open', 'investigating', 'contained'].includes(inc.status) && <button type="button" onClick={() => api.post('/soc/incidents/' + inc.id + '/resolve', {}).then((r: any) => { notify('Resolved — MTTR ' + r.mttrMinutes + ' min'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolve</button>}
                  </div>
                </div>
              </div>
            ))}
            {incidents.length === 0 && <div className="text-center py-8 text-gray-400">No incidents</div>}
          </div>
        </div>
      )}

      {tab === 'Alert Rules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Alert Rules ({rules.length})</h2>
            <button type="button" onClick={() => api.post('/soc/alert-rules', { name: 'rule-' + Date.now(), source: 'logs', condition: 'failed_logins > 10 in 5m', severity: 'high' }).then(() => { notify('Rule created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Rule</button>
          </div>
          <div className="grid gap-2">
            {rules.map((rl: any) => (
              <div key={rl.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rl.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(rl.severity)}`}>{rl.severity}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{rl.source}</span>
                    {rl.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{rl.condition}</p>
                  <p className="text-xs text-gray-400">triggered {rl.triggerCount}× {rl.lastTriggeredAt && '· last ' + new Date(rl.lastTriggeredAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/soc/alert-rules/' + rl.id + '/trigger', {}).then((r: any) => { notify('Triggered' + (r.incidentCreated ? ' — incident created' : '')); load() })} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Trigger</button>
                  <button type="button" onClick={() => api.remove('/soc/alert-rules/' + rl.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {rules.length === 0 && <div className="text-center py-8 text-gray-400">No alert rules</div>}
          </div>
        </div>
      )}

      {tab === 'Threat Intel' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Crosshair className="w-5 h-5" /> Threat Intelligence ({intel.length})</h2>
            <button type="button" onClick={() => api.post('/soc/threat-intel', { indicator: '185.220.101.' + Math.floor(Math.random() * 255), indicatorType: 'ip', threatType: 'tor-exit', confidence: 0.9, source: 'feed' }).then(() => { notify('IOC added'); load() })} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add IOC</button>
          </div>
          <div className="bg-white border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">IOC Lookup</p>
            <div className="flex gap-2">
              <input value={iocValue} onChange={e => setIocValue(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 font-mono" />
              <button type="button" onClick={() => api.post('/soc/threat-intel/check', { indicator: iocValue }).then((r: any) => notify(r.found ? 'THREAT: ' + r.threat.threatType + ' (confidence ' + r.threat.confidence + ')' : 'Clean — no match'))} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Check</button>
            </div>
          </div>
          <div className="grid gap-2">
            {intel.map((ioc: any) => (
              <div key={ioc.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{ioc.indicator}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ioc.indicatorType}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{ioc.threatType}</span>
                  </div>
                  <p className="text-xs text-gray-400">confidence {(ioc.confidence * 100).toFixed(0)}% · {ioc.source ?? 'manual'}</p>
                </div>
                <button type="button" onClick={() => api.remove('/soc/threat-intel/' + ioc.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {intel.length === 0 && <div className="text-center py-8 text-gray-400">No indicators</div>}
          </div>
        </div>
      )}

      {tab === 'Playbooks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5" /> Playbooks ({playbooks.length})</h2>
            <button type="button" onClick={() => api.post('/soc/playbooks', { name: 'containment-' + Date.now(), triggerType: 'manual', steps: [{ action: 'isolate-host' }, { action: 'collect-forensics' }, { action: 'block-iocs' }, { action: 'notify-team' }] }).then(() => { notify('Playbook created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Playbook</button>
          </div>
          <div className="grid gap-2">
            {playbooks.map((pb: any) => (
              <div key={pb.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pb.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{pb.triggerType}</span>
                    {pb.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                  </div>
                  <p className="text-xs text-gray-400">{(pb.steps ?? []).length} steps · {pb._count?.runs ?? 0} runs</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/soc/playbooks/' + pb.id + '/run', {}).then((r: any) => { notify('Playbook run: ' + r.stepsDone + '/' + r.stepsTotal + ' steps'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Run</button>
                  <button type="button" onClick={() => api.remove('/soc/playbooks/' + pb.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {playbooks.length === 0 && <div className="text-center py-8 text-gray-400">No playbooks</div>}
          </div>
        </div>
      )}
    </div>
  )
}
