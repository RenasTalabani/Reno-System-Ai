'use client'
import { useState, useEffect, useCallback } from 'react'
import { BookMarked, Plus, Trash2, RefreshCw, Search, BookA, ThumbsUp, ThumbsDown } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as HeadersInit }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const patch = (url: string, body: unknown) => fetch(API + url, { method: 'PATCH', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as HeadersInit }).then(r => r.json())
  return { get, post, patch, remove }
}

const TABS = ['Dashboard', 'Spaces', 'Articles', 'Search', 'Glossary']

export default function DocsHubPage() {
  const api = useApi()
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [spaces, setSpaces] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [articles, setArticles] = useState<any[]>([])
  const [glossary, setGlossary] = useState<any[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Dashboard') { const d = await api.get('/docs-hub/dashboard'); setDashboard(d) }
    if (tab === 'Spaces') { const d = await api.get('/docs-hub/spaces'); setSpaces(d.spaces ?? []) }
    if (tab === 'Articles' && selected) { const d = await api.get('/docs-hub/spaces/' + selected.id + '/articles'); setArticles(d.articles ?? []) }
    if (tab === 'Glossary') { const d = await api.get('/docs-hub/glossary'); setGlossary(d.terms ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  const search = async () => {
    const d = await api.get('/docs-hub/search?q=' + encodeURIComponent(searchQ))
    setSearchResults(d.results ?? [])
    notify('Found ' + d.total + ' results')
  }

  const statusColor = (s: string) => {
    const m: Record<string, string> = { published: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-600', review: 'bg-yellow-100 text-yellow-700', archived: 'bg-red-100 text-red-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documentation Hub</h1>
            <p className="text-sm text-gray-500">Knowledge spaces, versioned articles, search, and glossary</p>
          </div>
        </div>
        <button type="button" title="Refresh" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.name}</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-indigo-600">Clear</button>
        </div>
      )}

      {tab === 'Dashboard' && dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {([['Spaces', dashboard.spaces], ['Articles', dashboard.articles], ['Published', dashboard.published], ['Drafts', dashboard.drafts], ['Total Views', dashboard.totalViews]] as [string, number][]).map(([l, v]) => (
            <div key={l} className="bg-white border rounded-xl p-5 text-center">
              <p className="text-2xl font-bold">{v.toLocaleString()}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Spaces' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Spaces ({spaces.length})</h2>
            <button type="button" onClick={() => api.post('/docs-hub/spaces', { name: 'Getting Started', slug: 'getting-started-' + Date.now(), description: 'Onboarding guides', audience: 'all' }).then(() => { notify('Space created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Space</button>
          </div>
          <div className="grid gap-2">
            {spaces.map((s: any) => (
              <div key={s.id} onClick={() => setSelected(s)} className={`bg-white border rounded-xl p-4 cursor-pointer flex items-center justify-between ${selected?.id === s.id ? 'border-indigo-400 bg-indigo-50' : 'hover:border-indigo-200'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.audience}</span>
                  </div>
                  <p className="text-xs text-gray-400">{s.description} · {s._count?.articles ?? 0} articles</p>
                </div>
                <button type="button" title="Delete" onClick={e => { e.stopPropagation(); api.remove('/docs-hub/spaces/' + s.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {spaces.length === 0 && <div className="text-center py-12 text-gray-400">No spaces</div>}
          </div>
        </div>
      )}

      {tab === 'Articles' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a space first</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Articles — {selected.name} ({articles.length})</h2>
                <button type="button" onClick={() => api.post('/docs-hub/spaces/' + selected.id + '/articles', { title: 'New Article ' + Date.now(), slug: 'article-' + Date.now(), content: '# Draft\n\nContent here.', tags: ['draft'] }).then(() => { notify('Article created (v1)'); load() })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Article</button>
              </div>
              <div className="grid gap-2">
                {articles.map((a: any) => (
                  <div key={a.id} className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">v{a.currentVersion}</span>
                        </div>
                        <p className="text-xs text-gray-400">{a.viewCount} views · <ThumbsUp className="w-3 h-3 inline" /> {a.helpfulYes} <ThumbsDown className="w-3 h-3 inline ml-1" /> {a.helpfulNo}</p>
                      </div>
                      <div className="flex gap-1">
                        {a.status === 'draft' && <button type="button" onClick={() => api.post('/docs-hub/articles/' + a.id + '/submit-review', {}).then(() => { notify('Submitted'); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Submit</button>}
                        {a.status === 'review' && <button type="button" onClick={() => api.post('/docs-hub/articles/' + a.id + '/publish', {}).then(() => { notify('Published (audited)'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish</button>}
                        <button type="button" onClick={() => api.patch('/docs-hub/articles/' + a.id, { content: 'Updated content ' + Date.now() }).then(() => { notify('New version created'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Edit</button>
                        <button type="button" onClick={() => api.post('/docs-hub/articles/' + a.id + '/feedback', { helpful: true }).then(() => { notify('Thanks!'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded"><ThumbsUp className="w-3 h-3" /></button>
                        <button type="button" title="Delete" onClick={() => api.remove('/docs-hub/articles/' + a.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {articles.length === 0 && <div className="text-center py-8 text-gray-400">No articles</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Search' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4 flex gap-2">
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search published articles..." className="border rounded-lg px-3 py-2 text-sm flex-1" />
            <button type="button" onClick={search} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Search className="w-4 h-4" /> Search</button>
          </div>
          <div className="grid gap-2">
            {searchResults.map((res: any) => (
              <div key={res.id} className="bg-white border rounded-xl p-3">
                <span className="text-sm font-medium">{res.title}</span>
              </div>
            ))}
            {searchResults.length === 0 && <div className="text-center py-8 text-gray-400">No results — try a search</div>}
          </div>
        </div>
      )}

      {tab === 'Glossary' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><BookA className="w-5 h-5" /> Glossary ({glossary.length})</h2>
            <button type="button" onClick={() => api.post('/docs-hub/glossary', { term: 'MRR', definition: 'Monthly Recurring Revenue', category: 'billing' }).then(() => { notify('Term added'); load() })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Term</button>
          </div>
          <div className="grid gap-2">
            {glossary.map((g: any) => (
              <div key={g.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{g.term}</span>
                    {g.category && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{g.category}</span>}
                  </div>
                  <p className="text-xs text-gray-500">{g.definition}</p>
                </div>
                <button type="button" title="Delete" onClick={() => api.remove('/docs-hub/glossary/' + g.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {glossary.length === 0 && <div className="text-center py-8 text-gray-400">No terms</div>}
          </div>
        </div>
      )}
    </div>
  )
}
