'use client'
import { useState, useEffect, useCallback } from 'react'
import { Terminal, Plus, Trash2, RefreshCw, Play, FlaskConical, Variable, ScrollText } from 'lucide-react'

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

const TABS = ['Apps', 'Logs', 'Tests', 'Env Vars', 'Playground']

export default function DevConsolePage() {
  const api = useApi()
  const [tab, setTab] = useState('Apps')
  const [apps, setApps] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [envVars, setEnvVars] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [pgMethod, setPgMethod] = useState('GET')
  const [pgPath, setPgPath] = useState('/v1/users')
  const [pgResult, setPgResult] = useState<any>(null)

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Apps') { const d = await api.get('/dev-console/apps'); setApps(d.apps ?? []) }
    if (tab === 'Logs' && selected) { const d = await api.get('/dev-console/apps/' + selected.id + '/logs'); setLogs(d.logs ?? []) }
    if (tab === 'Tests' && selected) { const d = await api.get('/dev-console/apps/' + selected.id + '/test-runs'); setRuns(d.runs ?? []) }
    if (tab === 'Env Vars' && selected) { const d = await api.get('/dev-console/apps/' + selected.id + '/env'); setEnvVars(d.vars ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selected) api.get('/dev-console/apps/' + selected.id + '/health').then((d: any) => setHealth(d))
  }, [selected])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { development: 'bg-blue-100 text-blue-700', testing: 'bg-yellow-100 text-yellow-700', 'staging-ready': 'bg-purple-100 text-purple-700', production: 'bg-green-100 text-green-700', archived: 'bg-gray-100 text-gray-500', passed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', healthy: 'bg-green-100 text-green-700', degraded: 'bg-yellow-100 text-yellow-700', unhealthy: 'bg-red-100 text-red-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }
  const levelColor = (l: string) => {
    const m: Record<string, string> = { error: 'bg-red-100 text-red-700', warn: 'bg-yellow-100 text-yellow-700', info: 'bg-blue-100 text-blue-700', debug: 'bg-gray-100 text-gray-500' }
    return m[l] ?? 'bg-gray-100'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
            <Terminal className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Console</h1>
            <p className="text-sm text-gray-500">Apps, sandboxes, logs, tests, env vars, and API playground</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-gray-900 text-green-400 rounded-lg px-4 py-3 text-sm font-mono break-all">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && health && (
        <div className="bg-gray-50 border rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selected.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(health.health)}`}>{health.health}</span>
            <span className="text-xs text-gray-500">{health.errorsLast24h} errors/24h · last tests: {health.lastTestStatus}</span>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-gray-500">Clear</button>
        </div>
      )}

      {tab === 'Apps' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Apps ({apps.length})</h2>
            <button type="button" onClick={() => api.post('/dev-console/apps', { name: 'app-' + Date.now(), appType: 'api-integration', description: 'Created from console' }).then(() => { notify('App created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New App</button>
          </div>
          <div className="grid gap-2">
            {apps.map((a: any) => (
              <div key={a.id} onClick={() => setSelected(a)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === a.id ? 'border-gray-400 bg-gray-50' : 'hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a.appType}</span>
                    </div>
                    <p className="text-xs text-gray-400">{a._count?.sandboxes ?? 0} sandboxes · {a._count?.testRuns ?? 0} test runs · {a._count?.envVars ?? 0} env vars</p>
                  </div>
                  <div className="flex gap-1">
                    {a.status !== 'production' && a.status !== 'archived' && <button type="button" onClick={e => { e.stopPropagation(); api.post('/dev-console/apps/' + a.id + '/promote', {}).then((r: any) => { notify(r.error ?? 'Promoted to ' + r.status); load() }) }} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Promote</button>}
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/dev-console/apps/' + a.id + '/sandboxes', { name: 'sbx-' + Date.now() }).then(() => { notify('Sandbox created'); load() }) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+ Sandbox</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/dev-console/apps/' + a.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {apps.length === 0 && <div className="text-center py-12 text-gray-400">No apps</div>}
          </div>
        </div>
      )}

      {tab === 'Logs' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select an app first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><ScrollText className="w-5 h-5" /> Logs ({logs.length})</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => api.post('/dev-console/apps/' + selected.id + '/simulate-logs', { count: 15 }).then(() => { notify('Logs simulated'); load() })} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Simulate</button>
                  <button type="button" onClick={() => api.post('/dev-console/apps/' + selected.id + '/logs/clear', {}).then((r: any) => { notify('Cleared ' + r.cleared); load() })} className="px-3 py-2 bg-gray-100 rounded-lg text-sm">Clear</button>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                {logs.map((l: any) => (
                  <div key={l.id} className="flex gap-2">
                    <span className="text-gray-500">{new Date(l.createdAt).toLocaleTimeString()}</span>
                    <span className={`px-1 rounded ${levelColor(l.level)}`}>{l.level}</span>
                    <span className="text-gray-200">{l.message}</span>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-gray-500">No logs</p>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Tests' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select an app first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><FlaskConical className="w-5 h-5" /> Test Runs ({runs.length})</h2>
                <button type="button" onClick={() => api.post('/dev-console/apps/' + selected.id + '/test-runs', { suiteName: 'integration', testCount: 12 }).then((r: any) => { notify('Run: ' + r.passedTests + '/' + r.totalTests + ' passed'); load() })} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"><Play className="w-4 h-4" /> Run Tests</button>
              </div>
              <div className="grid gap-2">
                {runs.map((r: any) => (
                  <div key={r.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                      <span className="text-sm font-medium">{r.suiteName}</span>
                      <span className="text-xs text-gray-500">{r.passedTests}/{r.totalTests} passed · {r.durationMs}ms</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.startedAt).toLocaleString()}</span>
                  </div>
                ))}
                {runs.length === 0 && <div className="text-center py-8 text-gray-400">No test runs</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Env Vars' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select an app first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Variable className="w-5 h-5" /> Environment Variables ({envVars.length})</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => api.post('/dev-console/apps/' + selected.id + '/env', { key: 'API_URL', value: 'https://api.reno.dev', isSecret: false }).then(() => { notify('Var set'); load() })} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">+ Plain</button>
                  <button type="button" onClick={() => api.post('/dev-console/apps/' + selected.id + '/env', { key: 'SECRET_TOKEN', value: 'tok_' + Date.now(), isSecret: true }).then(() => { notify('Secret set'); load() })} className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm">+ Secret</button>
                </div>
              </div>
              <div className="grid gap-2">
                {envVars.map((v: any) => (
                  <div key={v.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="font-semibold">{v.key}</span>
                      <span className="text-gray-400">=</span>
                      <span className={v.isSecret ? 'text-amber-600' : 'text-gray-600'}>{v.value}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-sans">{v.environment}</span>
                    </div>
                    <div className="flex gap-1">
                      {v.isSecret && <button type="button" onClick={() => api.post('/dev-console/env/' + v.id + '/reveal', {}).then((r: any) => notify('REVEALED (audited): ' + r.key + '=' + r.value))} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Reveal</button>}
                      <button type="button" onClick={() => api.remove('/dev-console/env/' + v.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {envVars.length === 0 && <div className="text-center py-8 text-gray-400">No env vars</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Playground' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">API Playground</h2>
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <div className="flex gap-2">
              <select value={pgMethod} onChange={e => setPgMethod(e.target.value)} className="border rounded-lg px-3 py-2 text-sm font-mono">
                {['GET', 'POST', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
              </select>
              <input value={pgPath} onChange={e => setPgPath(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 font-mono" />
              <button type="button" onClick={() => api.post('/dev-console/playground/execute', { method: pgMethod, path: pgPath }).then((r: any) => setPgResult(r))} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"><Play className="w-4 h-4" /> Send</button>
            </div>
            {pgResult && (
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">{JSON.stringify(pgResult.response, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
