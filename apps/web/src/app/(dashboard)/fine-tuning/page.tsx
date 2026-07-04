'use client'
import { useState, useEffect, useCallback } from 'react'
import { BrainCog, Plus, Trash2, RefreshCw, Play, Rocket, MessageSquareMore, Trophy } from 'lucide-react'

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

const TABS = ['Datasets', 'Jobs', 'Models', 'Deployments', 'Feedback']

export default function FineTuningPage() {
  const api = useApi()
  const [tab, setTab] = useState('Datasets')
  const [datasets, setDatasets] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [deployments, setDeployments] = useState<any[]>([])
  const [feedback, setFeedback] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Datasets') { const d = await api.get('/fine-tuning/datasets'); setDatasets(d.datasets ?? []) }
    if (tab === 'Jobs') { const d = await api.get('/fine-tuning/jobs'); setJobs(d.jobs ?? []) }
    if (tab === 'Models') {
      const d = await api.get('/fine-tuning/models'); setModels(d.models ?? [])
      const lb = await api.get('/fine-tuning/leaderboard'); setLeaderboard(lb.leaderboard ?? [])
    }
    if (tab === 'Deployments') { const d = await api.get('/fine-tuning/deployments'); setDeployments(d.deployments ?? []) }
    if (tab === 'Feedback') { const d = await api.get('/fine-tuning/feedback'); setFeedback(d.feedback ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { ready: 'bg-green-100 text-green-700', succeeded: 'bg-green-100 text-green-700', deployed: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-600', queued: 'bg-yellow-100 text-yellow-700', running: 'bg-blue-100 text-blue-700', failed: 'bg-red-100 text-red-700', invalid: 'bg-red-100 text-red-700', 'pending-approval': 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-700', retired: 'bg-gray-100 text-gray-500', cancelled: 'bg-gray-100 text-gray-500' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
            <BrainCog className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fine-Tuning Studio</h1>
            <p className="text-sm text-gray-500">Datasets, training jobs, models, evals, and gated deployments — Reno Brain primary</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Datasets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Datasets ({datasets.length})</h2>
            <button type="button" onClick={() => api.post('/fine-tuning/datasets', { name: 'dataset-' + Date.now(), taskType: 'chat', samples: [{ input: 'What is our refund policy?', output: 'Refunds within 30 days.' }, { input: 'How do I reset my password?', output: 'Use the Forgot Password link.' }, { input: 'What are support hours?', output: 'Mon-Fri 9am-6pm.' }] }).then(() => { notify('Dataset created with 3 samples'); load() })} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Dataset</button>
          </div>
          <div className="grid gap-2">
            {datasets.map((d: any) => (
              <div key={d.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{d.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>{d.status}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.taskType}</span>
                  </div>
                  <p className="text-xs text-gray-400">{d.sampleCount} samples · {d._count?.jobs ?? 0} jobs</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/fine-tuning/datasets/' + d.id + '/validate', {}).then((r: any) => { notify(r.valid ? 'Valid — ready to train' : 'Invalid: ' + r.issues.join(', ')); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Validate</button>
                  {d.status === 'ready' && <button type="button" onClick={() => api.post('/fine-tuning/jobs', { datasetId: d.id, name: 'job-' + Date.now(), provider: 'reno-brain' }).then((r: any) => { notify(r.id ? 'Job queued (Reno Brain)' : r.error); load() })} className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded">Train</button>}
                  <button type="button" onClick={() => api.post('/fine-tuning/datasets/' + d.id + '/harvest-feedback', {}).then((r: any) => { notify('Harvested ' + r.harvested + ' corrections'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Harvest</button>
                  <button type="button" onClick={() => api.remove('/fine-tuning/datasets/' + d.id).then(() => { notify('Deleted'); load() })} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {datasets.length === 0 && <div className="text-center py-12 text-gray-400">No datasets</div>}
          </div>
        </div>
      )}

      {tab === 'Jobs' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Training Jobs ({jobs.length})</h2>
          <div className="grid gap-2">
            {jobs.map((j: any) => (
              <div key={j.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{j.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(j.status)}`}>{j.status}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{j.provider}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{j.baseModel}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    dataset: {j.dataset?.name} · {j.epochs} epochs · lr {j.learningRate}
                    {j.trainLoss != null && ' · loss ' + j.trainLoss}
                  </p>
                </div>
                <div className="flex gap-1">
                  {j.status === 'queued' && <>
                    <button type="button" onClick={() => api.post('/fine-tuning/jobs/' + j.id + '/run', {}).then((r: any) => { notify('Trained! Model: ' + r.model.name + ' (loss ' + r.job.trainLoss + ')'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"><Play className="w-3 h-3 inline" /> Run</button>
                    <button type="button" onClick={() => api.post('/fine-tuning/jobs/' + j.id + '/cancel', {}).then(() => { notify('Cancelled'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">Cancel</button>
                  </>}
                </div>
              </div>
            ))}
            {jobs.length === 0 && <div className="text-center py-8 text-gray-400">No jobs — train from a validated dataset</div>}
          </div>
        </div>
      )}

      {tab === 'Models' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Models ({models.length})</h2>
            {models.map((m: any) => (
              <div key={m.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(m.status)}`}>{m.status}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{m.provider}</span>
                  </div>
                  <p className="text-xs text-gray-400">{m.sizeMb} MB · {m._count?.evaluations ?? 0} evals · {m._count?.deployments ?? 0} deployments</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/fine-tuning/models/' + m.id + '/evaluate', { evalType: 'accuracy' }).then((r: any) => { notify('Eval: ' + r.score + ' (baseline ' + r.baselineScore + ')'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Evaluate</button>
                  <button type="button" onClick={() => api.post('/fine-tuning/models/' + m.id + '/infer', { prompt: 'What is our refund policy?' }).then((r: any) => notify(r.completion))} className="text-xs bg-gray-100 px-2 py-1 rounded">Test</button>
                  <button type="button" onClick={() => api.post('/fine-tuning/models/' + m.id + '/deploy', { environment: 'staging' }).then(() => { notify('Deployment requested — pending approval'); load() })} className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded"><Rocket className="w-3 h-3 inline" /> Deploy</button>
                  <button type="button" onClick={() => api.post('/fine-tuning/models/' + m.id + '/retire', {}).then(() => { notify('Retired'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">Retire</button>
                </div>
              </div>
            ))}
            {models.length === 0 && <div className="text-center py-8 text-gray-400">No models yet</div>}
          </div>

          {leaderboard.length > 0 && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard</h3>
              {leaderboard.map((m: any, i: number) => (
                <div key={m.id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                  <span>#{i + 1} {m.name} <span className="text-xs text-gray-400">({m.provider})</span></span>
                  <span className="font-mono">{m.bestScore.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Deployments' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Deployments ({deployments.length})</h2>
          <p className="text-xs text-gray-500">Deployments require explicit approval — no automatic production rollout.</p>
          <div className="grid gap-2">
            {deployments.map((dep: any) => (
              <div key={dep.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{dep.model?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(dep.status)}`}>{dep.status}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{dep.environment}</span>
                    {dep.status === 'deployed' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{dep.trafficPct}% traffic</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {dep.status === 'pending-approval' && <>
                    <button type="button" onClick={() => api.post('/fine-tuning/deployments/' + dep.id + '/approve', {}).then(() => { notify('Approved & deployed at 10% traffic (audited)'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approve</button>
                    <button type="button" onClick={() => api.post('/fine-tuning/deployments/' + dep.id + '/reject', {}).then(() => { notify('Rejected'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Reject</button>
                  </>}
                  {dep.status === 'deployed' && <button type="button" onClick={() => api.post('/fine-tuning/deployments/' + dep.id + '/traffic', { trafficPct: Math.min(100, dep.trafficPct + 20) }).then((r: any) => { notify('Traffic → ' + r.trafficPct + '%'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+20% Traffic</button>}
                  <button type="button" onClick={() => api.remove('/fine-tuning/deployments/' + dep.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {deployments.length === 0 && <div className="text-center py-8 text-gray-400">No deployments</div>}
          </div>
        </div>
      )}

      {tab === 'Feedback' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquareMore className="w-5 h-5" /> Feedback ({feedback.length})</h2>
            <button type="button" onClick={() => api.post('/fine-tuning/feedback', { modelRef: 'reno-brain-base', prompt: 'What is our SLA?', completion: 'I am not sure.', rating: -1, correction: 'Our SLA is 99.9% uptime with 4h response.' }).then(() => { notify('Feedback logged with correction'); load() })} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Log Feedback</button>
          </div>
          <div className="grid gap-2">
            {feedback.map((f: any) => (
              <div key={f.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.rating > 0 ? 'bg-green-100 text-green-700' : f.rating < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>{f.rating > 0 ? '👍' : f.rating < 0 ? '👎' : '—'}</span>
                    <span className="text-xs font-mono text-gray-400">{f.modelRef}</span>
                    {f.addedToDataset && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">harvested</span>}
                  </div>
                  <button type="button" onClick={() => api.remove('/fine-tuning/feedback/' + f.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="text-sm mt-2"><span className="text-gray-400">Q:</span> {f.prompt}</p>
                <p className="text-sm"><span className="text-gray-400">A:</span> {f.completion}</p>
                {f.correction && <p className="text-sm text-green-700"><span className="text-gray-400">Fix:</span> {f.correction}</p>}
              </div>
            ))}
            {feedback.length === 0 && <div className="text-center py-8 text-gray-400">No feedback</div>}
          </div>
        </div>
      )}
    </div>
  )
}
