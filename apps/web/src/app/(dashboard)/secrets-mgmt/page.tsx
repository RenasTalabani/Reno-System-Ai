'use client'
import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Plus, Trash2, RefreshCw, Lock, Unlock, Eye, RotateCw, History } from 'lucide-react'

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

const TABS = ['Overview', 'Vaults', 'Secrets', 'Rotation', 'Access Logs']

export default function SecretsMgmtPage() {
  const api = useApi()
  const [tab, setTab] = useState('Overview')
  const [overview, setOverview] = useState<any>(null)
  const [vaults, setVaults] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [secrets, setSecrets] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [secretForm, setSecretForm] = useState({ key: '', value: '', secretType: 'api-key' })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Overview') { const d = await api.get('/secrets-mgmt/overview'); setOverview(d) }
    if (tab === 'Vaults') { const d = await api.get('/secrets-mgmt/vaults'); setVaults(d.vaults ?? []) }
    if (tab === 'Secrets' && selected) { const d = await api.get('/secrets-mgmt/vaults/' + selected.id + '/secrets'); setSecrets(d.secrets ?? []) }
    if (tab === 'Rotation') { const d = await api.get('/secrets-mgmt/rotation-policies'); setPolicies(d.policies ?? []) }
    if (tab === 'Access Logs') { const d = await api.get('/secrets-mgmt/access-logs'); setLogs(d.logs ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  async function createSecret() {
    if (!selected) return
    const res = await api.post('/secrets-mgmt/vaults/' + selected.id + '/secrets', secretForm)
    if (res.id) { notify('Secret stored (' + res.valuePreview + ')'); setShowSecret(false); setSecretForm({ key: '', value: '', secretType: 'api-key' }); load() }
    else notify(res.error ?? 'Error')
  }

  async function reveal(sid: string) {
    const res = await api.post('/secrets-mgmt/secrets/' + sid + '/reveal', {})
    if (res.value) notify('REVEALED (audited): ' + res.key + ' v' + res.version + ' = ' + res.value)
    else notify(res.error ?? 'Error')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Secrets Management</h1>
            <p className="text-sm text-gray-500">Vaults, versioned secrets, rotation policies, and access audit</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm font-mono break-all">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            {selected.status === 'unlocked' ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-600" />}
            {selected.name} ({selected.status})
          </span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-amber-500">Clear</button>
        </div>
      )}

      {tab === 'Overview' && overview && (
        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-5xl font-bold text-amber-600">{overview.hygieneScore}%</p>
            <p className="text-lg mt-2">Secret Hygiene Score</p>
            <p className="text-sm text-gray-500 mt-1">{overview.neverRotated} never rotated · {overview.staleSecrets} stale (&gt;90d)</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Vaults', overview.vaults], ['Secrets', overview.secrets], ['Active Grants', overview.activeGrants], ['Never Rotated', overview.neverRotated]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Vaults' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Vaults ({vaults.length})</h2>
            <button type="button" onClick={() => api.post('/secrets-mgmt/vaults', { name: 'vault-' + Date.now(), description: 'Created from UI' }).then(() => { notify('Vault created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Vault</button>
          </div>
          <div className="grid gap-3">
            {vaults.map((v: any) => (
              <div key={v.id} onClick={() => setSelected(v)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === v.id ? 'border-amber-400 bg-amber-50' : 'hover:border-amber-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {v.status === 'unlocked' ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-600" />}
                      <span className="font-semibold">{v.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${v.status === 'unlocked' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.status}</span>
                    </div>
                    <p className="text-xs text-gray-400">{v._count?.secrets ?? 0} secrets</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/secrets-mgmt/vaults/' + v.id + '/toggle-lock', {}).then((r: any) => { notify('Vault ' + r.status); load() }) }} className="text-xs bg-gray-100 px-2 py-1 rounded">{v.status === 'unlocked' ? 'Lock' : 'Unlock'}</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/secrets-mgmt/vaults/' + v.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {vaults.length === 0 && <div className="text-center py-12 text-gray-400">No vaults</div>}
          </div>
        </div>
      )}

      {tab === 'Secrets' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a vault first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Secrets in {selected.name} ({secrets.length})</h2>
                <button type="button" onClick={() => setShowSecret(!showSecret)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Store Secret</button>
              </div>
              {showSecret && (
                <div className="bg-white border rounded-xl p-5 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input placeholder="Key (e.g. STRIPE_API_KEY)" value={secretForm.key} onChange={e => setSecretForm(f => ({...f, key: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm font-mono" />
                    <input placeholder="Value" type="password" value={secretForm.value} onChange={e => setSecretForm(f => ({...f, value: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm" />
                    <select value={secretForm.secretType} onChange={e => setSecretForm(f => ({...f, secretType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                      {['api-key', 'generic', 'database', 'certificate', 'ssh-key', 'oauth-token'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={createSecret} disabled={!secretForm.key || !secretForm.value} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm disabled:opacity-50">Store</button>
                    <button type="button" onClick={() => setShowSecret(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                {secrets.map((s: any) => (
                  <div key={s.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-500" />
                        <span className="font-mono text-sm font-semibold">{s.key}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.secretType}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{s.currentVersion}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {s._count?.versions ?? 0} versions · {s._count?.grants ?? 0} grants
                        {s.lastRotatedAt ? ' · rotated ' + new Date(s.lastRotatedAt).toLocaleDateString() : ' · never rotated'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => reveal(s.id)} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded"><Eye className="w-3 h-3 inline" /> Reveal</button>
                      <button type="button" onClick={() => api.post('/secrets-mgmt/secrets/' + s.id + '/rotate', {}).then((r: any) => { notify('Rotated to v' + r.currentVersion + ' (' + r.valuePreview + ')'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"><RotateCw className="w-3 h-3 inline" /> Rotate</button>
                      <button type="button" onClick={() => api.remove('/secrets-mgmt/secrets/' + s.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {secrets.length === 0 && <div className="text-center py-8 text-gray-400">No secrets in this vault</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Rotation' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><RotateCw className="w-5 h-5" /> Rotation Policies ({policies.length})</h2>
            <button type="button" onClick={() => api.post('/secrets-mgmt/rotation-policies', { name: 'rotate-api-keys-' + Date.now(), secretType: 'api-key', intervalDays: 90 }).then(() => { notify('Policy created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Policy</button>
          </div>
          <div className="grid gap-2">
            {policies.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.secretType}</span>
                    {p.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                  </div>
                  <p className="text-xs text-gray-400">Every {p.intervalDays} days {p.lastRunAt && '· last run ' + new Date(p.lastRunAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/secrets-mgmt/rotation-policies/' + p.id + '/run', {}).then((r: any) => { notify('Rotated ' + r.rotated + ' secrets'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Run Now</button>
                  <button type="button" onClick={() => api.remove('/secrets-mgmt/rotation-policies/' + p.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {policies.length === 0 && <div className="text-center py-8 text-gray-400">No rotation policies</div>}
          </div>
        </div>
      )}

      {tab === 'Access Logs' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><History className="w-5 h-5" /> Access Logs ({logs.length})</h2>
          <div className="grid gap-1">
            {logs.map((l: any) => (
              <div key={l.id} className="bg-white border rounded-lg p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${l.outcome === 'allowed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.outcome}</span>
                  <span className="font-mono text-xs">{l.secretRef}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{l.action}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-center py-8 text-gray-400">No access logs</div>}
          </div>
        </div>
      )}
    </div>
  )
}
