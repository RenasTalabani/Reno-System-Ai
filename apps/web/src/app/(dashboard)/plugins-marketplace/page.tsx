'use client'
import { useState, useEffect, useCallback } from 'react'
import { Puzzle, Plus, Trash2, RefreshCw, Star, Download, ShieldCheck } from 'lucide-react'

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

const TABS = ['Marketplace', 'My Plugins', 'Installed', 'Permissions', 'Stats']

export default function PluginsMarketplacePage() {
  const api = useApi()
  const [tab, setTab] = useState('Marketplace')
  const [plugins, setPlugins] = useState<any[]>([])
  const [installations, setInstallations] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [permissions, setPermissions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Marketplace') { const d = await api.get('/plugins-marketplace/plugins?status=published'); setPlugins(d.plugins ?? []) }
    if (tab === 'My Plugins') { const d = await api.get('/plugins-marketplace/plugins'); setPlugins(d.plugins ?? []) }
    if (tab === 'Installed') { const d = await api.get('/plugins-marketplace/installations'); setInstallations(d.installations ?? []) }
    if (tab === 'Permissions' && selected) { const d = await api.get('/plugins-marketplace/plugins/' + selected.id + '/permissions'); setPermissions(d.permissions ?? []) }
    if (tab === 'Stats') { const d = await api.get('/plugins-marketplace/stats'); setStats(d) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { published: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-600', 'in-review': 'bg-yellow-100 text-yellow-700', suspended: 'bg-red-100 text-red-700', active: 'bg-green-100 text-green-700', disabled: 'bg-gray-100 text-gray-500' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plugin Marketplace</h1>
            <p className="text-sm text-gray-500">Browse, install, review, and manage plugins with scoped permissions</p>
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

      {selected && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.name} v{selected.latestVersion}</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-violet-500">Clear</button>
        </div>
      )}

      {(tab === 'Marketplace' || tab === 'My Plugins') && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{tab === 'Marketplace' ? 'Published Plugins' : 'All Plugins'} ({plugins.length})</h2>
            {tab === 'My Plugins' && (
              <button type="button" onClick={() => api.post('/plugins-marketplace/plugins', { name: 'Plugin ' + Date.now(), slug: 'plugin-' + Date.now(), description: 'Created from UI', category: 'integration', author: 'demo' }).then(() => { notify('Plugin created (draft)'); load() })} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Plugin</button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {plugins.map((p: any) => (
              <div key={p.id} onClick={() => setSelected(p)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === p.id ? 'border-violet-400 bg-violet-50' : 'hover:border-violet-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Puzzle className="w-4 h-4 text-violet-500" />
                      <span className="font-semibold">{p.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.category}</span>
                  </div>
                  {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {p.avgRating?.toFixed(1) ?? '0.0'}</span>
                    <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {p.installCount}</span>
                    <span>v{p.latestVersion}</span>
                    <span>{p._count?.reviews ?? 0} reviews</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {p.status === 'draft' && <button type="button" onClick={e => { e.stopPropagation(); api.post('/plugins-marketplace/plugins/' + p.id + '/submit', {}).then(() => { notify('Submitted for review'); load() }) }} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Submit</button>}
                    {p.status === 'in-review' && <button type="button" onClick={e => { e.stopPropagation(); api.post('/plugins-marketplace/plugins/' + p.id + '/publish', {}).then(() => { notify('Published'); load() }) }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approve & Publish</button>}
                    {p.status === 'published' && <button type="button" onClick={e => { e.stopPropagation(); api.post('/plugins-marketplace/plugins/' + p.id + '/install', {}).then((r: any) => { notify(r.id ? 'Installed!' : (r.error ?? 'Error') + (r.ungranted ? ' (' + r.ungranted + ' pending)' : '')); load() }) }} className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded">Install</button>}
                    {p.status === 'published' && <button type="button" onClick={e => { e.stopPropagation(); api.post('/plugins-marketplace/plugins/' + p.id + '/reviews', { rating: 5, comment: 'Great plugin!' }).then(() => { notify('Review added'); load() }) }} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded"><Star className="w-3 h-3 inline" /> Review</button>}
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/plugins-marketplace/plugins/' + p.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {plugins.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">No plugins</div>}
          </div>
        </div>
      )}

      {tab === 'Installed' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Installed Plugins ({installations.length})</h2>
          <div className="grid gap-2">
            {installations.map((inst: any) => (
              <div key={inst.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inst.plugin?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inst.status)}`}>{inst.status}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{inst.version}</span>
                    {inst.plugin?.latestVersion !== inst.version && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">update available: v{inst.plugin?.latestVersion}</span>}
                  </div>
                  <p className="text-xs text-gray-400">Installed {new Date(inst.installedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/plugins-marketplace/installations/' + inst.id + '/toggle', {}).then((r: any) => { notify('Now ' + r.status); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{inst.status === 'active' ? 'Disable' : 'Enable'}</button>
                  <button type="button" onClick={() => api.remove('/plugins-marketplace/installations/' + inst.id).then(() => { notify('Uninstalled'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Uninstall</button>
                </div>
              </div>
            ))}
            {installations.length === 0 && <div className="text-center py-8 text-gray-400">No plugins installed</div>}
          </div>
        </div>
      )}

      {tab === 'Permissions' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a plugin first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Permissions for {selected.name}</h2>
                <button type="button" onClick={() => api.post('/plugins-marketplace/plugins/' + selected.id + '/permissions', { scope: 'read:crm', reason: 'Sync contact data' }).then(() => { notify('Permission requested'); load() })} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm">Request Scope</button>
              </div>
              <div className="grid gap-2">
                {permissions.map((perm: any) => (
                  <div key={perm.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{perm.scope}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${perm.isGranted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{perm.isGranted ? 'granted' : 'pending'}</span>
                      </div>
                      {perm.reason && <p className="text-xs text-gray-500">{perm.reason}</p>}
                    </div>
                    {perm.isGranted
                      ? <button type="button" onClick={() => api.post('/plugins-marketplace/permissions/' + perm.id + '/revoke', {}).then(() => { notify('Revoked'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Revoke</button>
                      : <button type="button" onClick={() => api.post('/plugins-marketplace/permissions/' + perm.id + '/grant', {}).then(() => { notify('Granted (audited)'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Grant</button>}
                  </div>
                ))}
                {permissions.length === 0 && <div className="text-center py-8 text-gray-400">No permission requests</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Marketplace Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Plugins', stats.plugins], ['Versions', stats.versions], ['Installs', stats.installations], ['Reviews', stats.reviews], ['Permissions', stats.permissions], ['Events', stats.webhookEvents]] as [string, number][]).map(([l, v]) => (
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
