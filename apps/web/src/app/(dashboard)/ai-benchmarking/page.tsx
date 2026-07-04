'use client'
import { useState, useEffect, useCallback } from 'react'
import { Gauge, Plus, Trash2, RefreshCw, Play, Trophy, TrendingDown } from 'lucide-react'

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

const TABS = ['Dashboard', 'Suites', 'Runs', 'Regressions', 'Leaderboard']

export default function AiBenchmarkingPage() {
  const api = useApi()
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [suites, setSuites] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [regressions, setRegressions] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Dashboard') { const d = await api.get('/ai-benchmarking/dashboard'); setDashboard(d) }
    if (tab === 'Suites') { const d = await api.get('/ai-benchmarking/suites'); setSuites(d.suites ?? []) }
    if (tab === 'Runs') { const d = await api.get('/ai-benchmarking/runs'); setRuns(d.runs ?? []) }
    if (tab === 'Regressions') { const d = await api.get('/ai-benchmarking/regressions'); setRegressions(d.regressions ?? []) }
    if (tab === 'Leaderboard') { const d = await api.get('/ai-benchmarking/leaderboard'); setLeaderboard(d.leaderboard ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const sevColor = (s: string) => {
    const m: Record<string, string> = { severe: 'bg-red-100 text-red-700', moderate: 'bg-orange-100 text-orange-700', minor: 'bg-yellow-100 text-yellow-700' }
    return m[s] ?? 'bg-gray-100'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <Gauge className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Benchmarking</h1>
            <p className="text-sm text-gray-500">Benchmark suites, runs, baselines, regressions, and model leaderboard</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-pink-50 border border-pink-200 text-pink-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className={`rounded-2xl p-6 text-center border ${dashboard.health === 'stable' ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
            <p className="text-2xl font-bold uppercase">{dashboard.health.replace('-', ' ')}</p>
            <p className="text-sm text-gray-500 mt-1">Avg score (last 10 runs): {dashboard.avgScore}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Suites', dashboard.suites], ['Recent Runs', dashboard.recentRuns], ['Avg Score', dashboard.avgScore], ['Open Regressions', dashboard.openRegressions]] as [string, any][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-xl p-5 space-y-2">
            <h3 className="font-semibold">Regression Sweep</h3>
            <p className="text-sm text-gray-500">Run every suite against a model to detect quality drops.</p>
            <button type="button" onClick={() => api.post('/ai-benchmarking/sweep', { modelRef: 'reno-brain-base' }).then((r: any) => { notify('Swept ' + r.swept + ' suites'); load() })} className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm">Run Sweep</button>
          </div>
        </div>
      )}

      {tab === 'Suites' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Benchmark Suites ({suites.length})</h2>
            <button type="button" onClick={() => api.post('/ai-benchmarking/suites/seed-demo', {}).then((r: any) => { notify('Demo suite created with ' + r.casesCreated + ' cases'); load() })} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Seed Demo Suite</button>
          </div>
          <div className="grid gap-2">
            {suites.map((s: any) => (
              <div key={s.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.category}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{s.metricType}</span>
                  </div>
                  <p className="text-xs text-gray-400">{s._count?.cases ?? 0} cases · {s._count?.runs ?? 0} runs</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/ai-benchmarking/suites/' + s.id + '/run', { modelRef: 'reno-brain-base' }).then((r: any) => { notify(r.error ?? ('Run: score ' + r.run.score + (r.regression ? ' ⚠ REGRESSION ' + r.regression.deltaPct + '%' : ''))); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"><Play className="w-3 h-3 inline" /> Run</button>
                  <button type="button" onClick={() => api.post('/ai-benchmarking/suites/' + s.id + '/run', { modelRef: 'reno-brain-v2', quality: 0.9 }).then((r: any) => { notify(r.error ?? ('v2 run: ' + r.run.score)); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Run v2</button>
                  <button type="button" onClick={() => api.remove('/ai-benchmarking/suites/' + s.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {suites.length === 0 && <div className="text-center py-12 text-gray-400">No suites — seed a demo suite</div>}
          </div>
        </div>
      )}

      {tab === 'Runs' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Runs ({runs.length})</h2>
          <div className="grid gap-2">
            {runs.map((r: any) => (
              <div key={r.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{r.modelRef}</span>
                    <span className="text-xs text-gray-500">on {r.suite?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">score {r.score} · pass rate {(r.passRate * 100)?.toFixed(0)}% · {r.latencyMsAvg}ms avg · {r.totalCases} cases</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/ai-benchmarking/runs/' + r.id + '/set-baseline', {}).then((b: any) => notify(b.error ?? 'Baseline set: ' + b.score))} className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">Set Baseline</button>
                  <button type="button" onClick={() => api.remove('/ai-benchmarking/runs/' + r.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {runs.length === 0 && <div className="text-center py-8 text-gray-400">No runs</div>}
          </div>
        </div>
      )}

      {tab === 'Regressions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Regressions ({regressions.length})</h2>
            <button type="button" onClick={() => api.post('/ai-benchmarking/regressions/acknowledge-all', {}).then((r: any) => { notify('Acknowledged ' + r.acknowledged); load() })} className="px-3 py-2 bg-gray-100 rounded-lg text-sm">Acknowledge All</button>
          </div>
          <div className="grid gap-2">
            {regressions.map((rg: any) => (
              <div key={rg.id} className={`border rounded-xl p-3 ${!rg.acknowledged ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(rg.severity)}`}>{rg.severity}</span>
                    <span className="text-sm">score {rg.baselineScore} → {rg.currentScore} ({rg.deltaPct}%)</span>
                    {rg.acknowledged && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">ack</span>}
                  </div>
                  {!rg.acknowledged && <button type="button" onClick={() => api.post('/ai-benchmarking/regressions/' + rg.id + '/acknowledge', {}).then(() => { notify('Acknowledged'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">Ack</button>}
                </div>
              </div>
            ))}
            {regressions.length === 0 && <div className="text-center py-8 text-gray-400">No regressions detected</div>}
          </div>
        </div>
      )}

      {tab === 'Leaderboard' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Model Leaderboard</h2>
          <div className="bg-white border rounded-xl p-5">
            {leaderboard.map((m: any, i: number) => (
              <div key={m.modelRef} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                <span className="font-mono text-sm flex-1">{m.modelRef}</span>
                <span className="text-xs text-gray-400">{m.runs} runs</span>
                <span className="font-bold">{m.avgScore}</span>
              </div>
            ))}
            {leaderboard.length === 0 && <div className="text-center py-8 text-gray-400">No completed runs yet</div>}
          </div>
        </div>
      )}
    </div>
  )
}
