'use client'
import { useState, useEffect, useCallback } from 'react'
import { PackageCheck, Plus, Trash2, RefreshCw, Rocket, HardDriveDownload, ListChecks } from 'lucide-react'

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

const TABS = ['Releases', 'Checklist', 'Channels', 'Installer', 'Deploy Plans']

export default function ReleasePage() {
  const api = useApi()
  const [tab, setTab] = useState('Releases')
  const [releases, setReleases] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [checklist, setChecklist] = useState<any>(null)
  const [readiness, setReadiness] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [installations, setInstallations] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  const load = useCallback(async () => {
    if (tab === 'Releases') { const d = await api.get('/release/releases'); setReleases(d.releases ?? []) }
    if (tab === 'Checklist' && selected) {
      const c = await api.get('/release/releases/' + selected.id + '/checklist'); setChecklist(c)
      const rd = await api.get('/release/releases/' + selected.id + '/readiness'); setReadiness(rd)
    }
    if (tab === 'Channels') { const d = await api.get('/release/channels'); setChannels(d.channels ?? []) }
    if (tab === 'Installer') { const d = await api.get('/release/installations'); setInstallations(d.installations ?? []) }
    if (tab === 'Deploy Plans') { const d = await api.get('/release/deploy-plans'); setPlans(d.plans ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { ga: 'bg-green-100 text-green-700', candidate: 'bg-yellow-100 text-yellow-700', draft: 'bg-gray-100 text-gray-600', deprecated: 'bg-red-100 text-red-700', installed: 'bg-green-100 text-green-700', approved: 'bg-blue-100 text-blue-700', planned: 'bg-gray-100 text-gray-600', 'dry-run-completed': 'bg-green-100 text-green-700', executed: 'bg-green-100 text-green-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <PackageCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Release & Installer</h1>
            <p className="text-sm text-gray-500">Releases, artifacts, channels, installer, and deploy plans — production deploys are always dry-run</p>
          </div>
        </div>
        <button type="button" title="Refresh" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">v{selected.version} {selected.codename && '· ' + selected.codename}</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-green-600">Clear</button>
        </div>
      )}

      {tab === 'Releases' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Releases ({releases.length})</h2>
            <button type="button" onClick={() => api.post('/release/releases', { version: '1.0.' + Date.now() % 10000, codename: 'Aurora', releaseNotes: '100 modules, enterprise-ready.' }).then(() => { notify('Release created with default checklist'); load() })} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Release</button>
          </div>
          <div className="grid gap-2">
            {releases.map((rel: any) => (
              <div key={rel.id} onClick={() => setSelected(rel)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === rel.id ? 'border-green-400 bg-green-50' : 'hover:border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold font-mono">v{rel.version}</span>
                      {rel.codename && <span className="text-sm text-gray-500">{rel.codename}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(rel.status)}`}>{rel.status}</span>
                    </div>
                    <p className="text-xs text-gray-400">{rel._count?.artifacts ?? 0} artifacts · {rel._count?.checklistItems ?? 0} checklist · {rel._count?.deployPlans ?? 0} plans</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/release/releases/' + rel.id + '/build', { platforms: ['docker', 'kubernetes-helm', 'windows-installer'] }).then((r: any) => { notify('Built ' + r.built + ' artifacts'); load() }) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Build</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/release/releases/' + rel.id + '/promote', {}).then((r: any) => { notify(r.error ?? 'Promoted to ' + r.status); load() }) }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"><Rocket className="w-3 h-3 inline" /> Promote</button>
                    <button type="button" title="Delete" onClick={e => { e.stopPropagation(); api.remove('/release/releases/' + rel.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {releases.length === 0 && <div className="text-center py-12 text-gray-400">No releases</div>}
          </div>
        </div>
      )}

      {tab === 'Checklist' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a release first</div> : (
            <>
              {readiness && (
                <div className={`rounded-xl p-5 border ${readiness.ready ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <p className="font-semibold">{readiness.ready ? '✓ Ready for GA' : 'Not ready'} — {readiness.checklist}</p>
                  {readiness.blockers?.length > 0 && <p className="text-sm text-gray-600 mt-1">Blockers: {readiness.blockers.join(', ')}</p>}
                </div>
              )}
              <h2 className="text-lg font-semibold flex items-center gap-2"><ListChecks className="w-5 h-5" /> Checklist ({checklist?.done ?? 0}/{checklist?.total ?? 0})</h2>
              <div className="grid gap-2">
                {(checklist?.items ?? []).map((item: any) => (
                  <div key={item.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${item.isDone ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>{item.isDone ? '✓' : ''}</span>
                      <span className="text-sm">{item.title}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.category}</span>
                      {item.isRequired && <span className="text-xs text-red-400">required</span>}
                    </div>
                    {!item.isDone && <button type="button" onClick={() => api.post('/release/checklist/' + item.id + '/done', {}).then(() => { notify('Done'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Mark Done</button>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Channels' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Channels ({channels.length})</h2>
            <div className="flex gap-2">
              {['stable', 'beta', 'canary'].map(n => (
                <button type="button" key={n} onClick={() => api.post('/release/channels', { name: n }).then((r: any) => { notify(r.id ? n + ' channel created' : 'Already exists'); load() })} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm">+ {n}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            {channels.map((ch: any) => (
              <div key={ch.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{ch.name}</span>
                  <span className="text-xs font-mono text-gray-500">{ch.currentVersion ? 'v' + ch.currentVersion : 'no release'}</span>
                </div>
                <div className="flex gap-1">
                  {selected && <button type="button" onClick={() => api.post('/release/channels/' + ch.id + '/publish', { releaseId: selected.id }).then((r: any) => { notify(r.error ?? 'Published v' + r.currentVersion); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish Selected</button>}
                  <button type="button" title="Delete" onClick={() => api.remove('/release/channels/' + ch.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {channels.length === 0 && <div className="text-center py-8 text-gray-400">No channels</div>}
          </div>
        </div>
      )}

      {tab === 'Installer' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><HardDriveDownload className="w-5 h-5" /> Installations ({installations.length})</h2>
            <button type="button" onClick={() => api.post('/release/install', { siteName: 'site-' + Date.now(), installType: 'docker-compose', version: selected?.version ?? '1.0.0', channel: 'stable' }).then((r: any) => { notify('Installed ' + r.siteName + ' (' + (r.steps?.length ?? 0) + ' steps, simulated)'); load() })} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Run Installer</button>
          </div>
          <div className="grid gap-2">
            {installations.map((inst: any) => (
              <div key={inst.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inst.siteName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inst.status)}`}>{inst.status}</span>
                    <span className="text-xs font-mono text-gray-500">v{inst.version}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{inst.installType}</span>
                  </div>
                  <p className="text-xs text-gray-400">{(inst.steps ?? []).length} install steps · channel {inst.channel}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/release/installations/' + inst.id + '/health-check', {}).then((h: any) => notify('Health: api=' + h.api + ' web=' + h.web + ' db=' + h.database))} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Health</button>
                  <button type="button" onClick={() => api.post('/release/installations/' + inst.id + '/upgrade', { toVersion: (selected?.version ?? '1.1.0') }).then((r: any) => { notify('Upgraded to v' + r.version); load() })} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Upgrade</button>
                  <button type="button" title="Delete" onClick={() => api.remove('/release/installations/' + inst.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {installations.length === 0 && <div className="text-center py-8 text-gray-400">No installations</div>}
          </div>
        </div>
      )}

      {tab === 'Deploy Plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Deploy Plans ({plans.length})</h2>
            {selected && (
              <div className="flex gap-2">
                <button type="button" onClick={() => api.post('/release/releases/' + selected.id + '/deploy-plans', { environment: 'staging', strategy: 'blue-green', isDryRun: false }).then(() => { notify('Staging plan created'); load() })} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Staging</button>
                <button type="button" onClick={() => api.post('/release/releases/' + selected.id + '/deploy-plans', { environment: 'production', strategy: 'canary' }).then(() => { notify('Production plan created — forced dry-run'); load() })} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm">+ Production (dry-run)</button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Golden rule: production deploy plans are always dry-run — no real deploy is ever executed.</p>
          <div className="grid gap-2">
            {plans.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">v{p.release?.version}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.environment}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{p.strategy}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                    {p.isDryRun && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">dry-run</span>}
                  </div>
                  <p className="text-xs text-gray-400">{(p.planSteps ?? []).length} steps</p>
                </div>
                <div className="flex gap-1">
                  {p.status === 'planned' && <button type="button" onClick={() => api.post('/release/deploy-plans/' + p.id + '/approve', {}).then(() => { notify('Approved (audited)'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approve</button>}
                  {p.status === 'approved' && <button type="button" onClick={() => api.post('/release/deploy-plans/' + p.id + '/execute', {}).then((r: any) => { notify(r.error ?? r.note); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Execute</button>}
                  <button type="button" title="Delete" onClick={() => api.remove('/release/deploy-plans/' + p.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {plans.length === 0 && <div className="text-center py-8 text-gray-400">No deploy plans</div>}
          </div>
        </div>
      )}
    </div>
  )
}
