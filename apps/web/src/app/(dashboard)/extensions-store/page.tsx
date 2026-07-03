'use client'
import { useState, useEffect, useCallback } from 'react'
import { Blocks, Plus, Trash2, RefreshCw, Palette, LayoutGrid, Star } from 'lucide-react'

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

const TABS = ['Store', 'Installed', 'Themes', 'Widgets', 'Stats']

export default function ExtensionsStorePage() {
  const api = useApi()
  const [tab, setTab] = useState('Store')
  const [extensions, setExtensions] = useState<any[]>([])
  const [installs, setInstalls] = useState<any[]>([])
  const [themes, setThemes] = useState<any[]>([])
  const [widgets, setWidgets] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Store') { const d = await api.get('/extensions-store/extensions'); setExtensions(d.extensions ?? []) }
    if (tab === 'Installed') { const d = await api.get('/extensions-store/installs'); setInstalls(d.installs ?? []) }
    if (tab === 'Themes') { const d = await api.get('/extensions-store/themes'); setThemes(d.themes ?? []) }
    if (tab === 'Widgets') { const d = await api.get('/extensions-store/widgets'); setWidgets(d.widgets ?? []) }
    if (tab === 'Stats') { const d = await api.get('/extensions-store/stats'); setStats(d) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { published: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-600', deprecated: 'bg-red-100 text-red-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center">
            <Blocks className="w-5 h-5 text-fuchsia-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Extension Store</h1>
            <p className="text-sm text-gray-500">UI extensions, themes, and dashboard widgets</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-fuchsia-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Store' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Extensions ({extensions.length})</h2>
            <button type="button" onClick={() => api.post('/extensions-store/extensions', { name: 'Extension ' + Date.now(), slug: 'ext-' + Date.now(), extType: 'widget', description: 'Created from UI', author: 'demo' }).then(() => { notify('Extension created (draft)'); load() })} className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Extension</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {extensions.map((e: any) => (
              <div key={e.id} className="bg-white border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Blocks className="w-4 h-4 text-fuchsia-500" />
                    <span className="font-semibold">{e.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{e.extType}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {e.avgRating?.toFixed(1)}</span>
                  <span>{e.installCount} installs</span>
                  <span>v{e.latestVersion}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {e.status === 'draft' && <button type="button" onClick={() => api.post('/extensions-store/extensions/' + e.id + '/publish', {}).then(() => { notify('Published'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish</button>}
                  {e.status === 'published' && <>
                    <button type="button" onClick={() => api.post('/extensions-store/extensions/' + e.id + '/install', { placement: 'dashboard' }).then((r: any) => { notify(r.id ? 'Installed to dashboard' : r.error ?? 'Error'); load() })} className="text-xs bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded">Install</button>
                    <button type="button" onClick={() => api.post('/extensions-store/extensions/' + e.id + '/ratings', { rating: 5, comment: 'Nice!' }).then(() => { notify('Rated'); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Rate 5★</button>
                  </>}
                  <button type="button" onClick={() => api.remove('/extensions-store/extensions/' + e.id).then(() => { notify('Deleted'); load() })} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {extensions.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">No extensions</div>}
          </div>
        </div>
      )}

      {tab === 'Installed' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Installed ({installs.length})</h2>
          <div className="grid gap-2">
            {installs.map((i: any) => (
              <div key={i.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{i.extension?.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{i.version}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{i.placement}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${i.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{i.isEnabled ? 'enabled' : 'disabled'}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/extensions-store/installs/' + i.id + '/toggle', {}).then(() => { notify('Toggled'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{i.isEnabled ? 'Disable' : 'Enable'}</button>
                  <button type="button" onClick={() => api.remove('/extensions-store/installs/' + i.id).then(() => { notify('Uninstalled'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Uninstall</button>
                </div>
              </div>
            ))}
            {installs.length === 0 && <div className="text-center py-8 text-gray-400">Nothing installed</div>}
          </div>
        </div>
      )}

      {tab === 'Themes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5" /> Themes ({themes.length})</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => api.post('/extensions-store/themes', { name: 'Ocean ' + Date.now(), colors: { primary: '#0ea5e9', accent: '#38bdf8', bg: '#f0f9ff' }, isDark: false }).then(() => { notify('Light theme created'); load() })} className="px-3 py-2 bg-sky-500 text-white rounded-lg text-sm">+ Light</button>
              <button type="button" onClick={() => api.post('/extensions-store/themes', { name: 'Midnight ' + Date.now(), colors: { primary: '#8b5cf6', accent: '#a78bfa', bg: '#0f172a' }, isDark: true }).then(() => { notify('Dark theme created'); load() })} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm">+ Dark</button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {themes.map((t: any) => (
              <div key={t.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {Object.values(t.colors ?? {}).slice(0, 3).map((c: any, i: number) => (
                      <div key={i} className="w-6 h-6 rounded-full border" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      {t.isDark && <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded">dark</span>}
                      {t.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!t.isActive && <button type="button" onClick={() => api.post('/extensions-store/themes/' + t.id + '/activate', {}).then(() => { notify('Theme activated'); load() })} className="text-xs bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded">Activate</button>}
                  <button type="button" onClick={() => api.remove('/extensions-store/themes/' + t.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {themes.length === 0 && <div className="col-span-2 text-center py-8 text-gray-400">No themes</div>}
          </div>
        </div>
      )}

      {tab === 'Widgets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> Widgets ({widgets.length})</h2>
            <button type="button" onClick={() => api.post('/extensions-store/widgets', { name: 'Widget ' + Date.now(), widgetType: 'kpi', dataSource: '/v1/analytics/kpis', placement: 'dashboard' }).then(() => { notify('Widget added'); load() })} className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Widget</button>
          </div>
          <div className="grid gap-2">
            {widgets.map((w: any) => (
              <div key={w.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-200 w-6 h-6 rounded flex items-center justify-center font-mono">{w.position}</span>
                  <span className="text-sm font-medium">{w.name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{w.widgetType}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{w.placement}</span>
                  {!w.isVisible && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">hidden</span>}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/extensions-store/widgets/' + w.id + '/toggle', {}).then(() => { notify('Toggled'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{w.isVisible ? 'Hide' : 'Show'}</button>
                  <button type="button" onClick={() => api.remove('/extensions-store/widgets/' + w.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {widgets.length === 0 && <div className="text-center py-8 text-gray-400">No widgets</div>}
          </div>
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Extension Store Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {([['Extensions', stats.extensions], ['Versions', stats.versions], ['Installs', stats.installs], ['Themes', stats.themes], ['Widgets', stats.widgets], ['Ratings', stats.ratings]] as [string, number][]).map(([l, v]) => (
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
