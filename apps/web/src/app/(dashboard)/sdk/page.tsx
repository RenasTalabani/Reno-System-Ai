'use client'
import { useState, useEffect, useCallback } from 'react'
import { Code2, Plus, Trash2, RefreshCw, Package, Hammer, FileCode } from 'lucide-react'

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

const TABS = ['Specs', 'Targets', 'Builds', 'Snippets', 'Changelog']

export default function SdkPage() {
  const api = useApi()
  const [tab, setTab] = useState('Specs')
  const [specs, setSpecs] = useState<any[]>([])
  const [targets, setTargets] = useState<any[]>([])
  const [builds, setBuilds] = useState<any[]>([])
  const [snippets, setSnippets] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [snippetLang, setSnippetLang] = useState('typescript')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Specs') { const d = await api.get('/sdk/specs'); setSpecs(d.specs ?? []) }
    if (tab === 'Targets') { const d = await api.get('/sdk/targets'); setTargets(d.targets ?? []) }
    if (tab === 'Builds') { const d = await api.get('/sdk/builds'); setBuilds(d.builds ?? []) }
    if (tab === 'Snippets') { const d = await api.get('/sdk/snippets'); setSnippets(d.snippets ?? []) }
    if (tab === 'Changelog') { const d = await api.get('/sdk/changelog'); setEntries(d.entries ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { succeeded: 'bg-green-100 text-green-700', published: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-600', queued: 'bg-yellow-100 text-yellow-700', building: 'bg-blue-100 text-blue-700', failed: 'bg-red-100 text-red-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
            <Code2 className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SDK Generator</h1>
            <p className="text-sm text-gray-500">API specs, language targets, builds, snippets, and changelog</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Specs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">API Specs ({specs.length})</h2>
            <button type="button" onClick={() => api.post('/sdk/specs/import-platform', {}).then(() => { notify('Platform API imported'); load() })} className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Import Platform API</button>
          </div>
          <div className="grid gap-2">
            {specs.map((s: any) => (
              <div key={s.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-sky-500" />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{s.version}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{s.specFormat} · {s.endpointCount} endpoints · {s._count?.builds ?? 0} builds</p>
                </div>
                <div className="flex gap-1">
                  {s.status === 'draft' && <button type="button" onClick={() => api.post('/sdk/specs/' + s.id + '/publish', {}).then(() => { notify('Published'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish</button>}
                  <button type="button" onClick={() => api.post('/sdk/specs/' + s.id + '/build-all', {}).then((r: any) => { notify('Built ' + r.built + ' SDKs'); load() })} className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded"><Hammer className="w-3 h-3 inline" /> Build All</button>
                  <button type="button" onClick={() => api.remove('/sdk/specs/' + s.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {specs.length === 0 && <div className="text-center py-12 text-gray-400">No specs — import platform API</div>}
          </div>
        </div>
      )}

      {tab === 'Targets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="w-5 h-5" /> Language Targets ({targets.length})</h2>
            <div className="flex gap-1">
              {['typescript', 'python', 'go'].map(lang => (
                <button type="button" key={lang} onClick={() => api.post('/sdk/targets', { language: lang, packageName: lang === 'typescript' ? '@reno/sdk' : 'reno-sdk-' + lang }).then((r: any) => { notify(r.id ? lang + ' target added' : (r.error?.message ?? 'Already exists')); load() })} className="px-3 py-2 bg-sky-600 text-white rounded-lg text-sm">+ {lang}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            {targets.map((t: any) => (
              <div key={t.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{t.language}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{t.packageName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.isEnabled ? 'enabled' : 'disabled'}</span>
                  </div>
                  <p className="text-xs text-gray-400">{t._count?.builds ?? 0} builds</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => api.post('/sdk/targets/' + t.id + '/toggle', {}).then(() => { notify('Toggled'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">{t.isEnabled ? 'Disable' : 'Enable'}</button>
                  <button type="button" onClick={() => api.remove('/sdk/targets/' + t.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {targets.length === 0 && <div className="text-center py-8 text-gray-400">No targets</div>}
          </div>
        </div>
      )}

      {tab === 'Builds' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Hammer className="w-5 h-5" /> Builds ({builds.length})</h2>
          <div className="grid gap-2">
            {builds.map((b: any) => (
              <div key={b.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.target?.packageName}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{b.version}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(b.status)}`}>{b.status}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{b.target?.language}</span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{b.artifactRef} · {b.sizeKb} KB</p>
                </div>
                <button type="button" onClick={() => api.post('/sdk/builds/' + b.id + '/download', {}).then(() => notify('Download recorded'))} className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">Download</button>
              </div>
            ))}
            {builds.length === 0 && <div className="text-center py-8 text-gray-400">No builds — build from a spec</div>}
          </div>
        </div>
      )}

      {tab === 'Snippets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Code Snippets ({snippets.length})</h2>
            <div className="flex gap-2">
              <select value={snippetLang} onChange={e => setSnippetLang(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                {['typescript', 'python', 'go', 'java'].map(l => <option key={l}>{l}</option>)}
              </select>
              <button type="button" onClick={() => api.post('/sdk/snippets/generate', { language: snippetLang, endpoint: '/v1/crm/contacts' }).then(() => { notify('Snippet generated'); load() })} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm">Generate</button>
            </div>
          </div>
          <div className="grid gap-3">
            {snippets.map((sn: any) => (
              <div key={sn.id} className="bg-white border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{sn.title}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{sn.language}</span>
                  </div>
                  <button type="button" onClick={() => api.remove('/sdk/snippets/' + sn.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto"><code>{sn.code}</code></pre>
              </div>
            ))}
            {snippets.length === 0 && <div className="text-center py-8 text-gray-400">No snippets</div>}
          </div>
        </div>
      )}

      {tab === 'Changelog' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Changelog ({entries.length})</h2>
            <button type="button" onClick={() => api.post('/sdk/changelog', { version: '1.0.' + (entries.length + 1), changeType: 'added', summary: 'New endpoint support' }).then(() => { notify('Entry added'); load() })} className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Entry</button>
          </div>
          <div className="grid gap-2">
            {entries.map((e: any) => (
              <div key={e.id} className={`border rounded-xl p-3 ${e.isBreaking ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{e.version}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{e.changeType}</span>
                    {e.isBreaking && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">BREAKING</span>}
                    <span className="text-sm">{e.summary}</span>
                  </div>
                  <button type="button" onClick={() => api.remove('/sdk/changelog/' + e.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {entries.length === 0 && <div className="text-center py-8 text-gray-400">No changelog entries</div>}
          </div>
        </div>
      )}
    </div>
  )
}
