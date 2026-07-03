'use client'
import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, Plus, Trash2, RefreshCw, FileCheck, AlertCircle, ListTodo } from 'lucide-react'

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

const TABS = ['Overview', 'Frameworks', 'Controls', 'Findings', 'Tasks']

export default function ComplianceAutoPage() {
  const api = useApi()
  const [tab, setTab] = useState('Overview')
  const [overview, setOverview] = useState<any>(null)
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [controls, setControls] = useState<any[]>([])
  const [findings, setFindings] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Overview') { const d = await api.get('/compliance-auto/overview'); setOverview(d) }
    if (tab === 'Frameworks') { const d = await api.get('/compliance-auto/frameworks'); setFrameworks(d.frameworks ?? []) }
    if (tab === 'Controls' && selected) { const d = await api.get('/compliance-auto/frameworks/' + selected.id + '/controls'); setControls(d.controls ?? []) }
    if (tab === 'Findings') { const d = await api.get('/compliance-auto/findings'); setFindings(d.findings ?? []) }
    if (tab === 'Tasks') { const d = await api.get('/compliance-auto/tasks'); setTasks(d.tasks ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { implemented: 'bg-green-100 text-green-700', partial: 'bg-yellow-100 text-yellow-700', 'not-implemented': 'bg-red-100 text-red-700', 'not-applicable': 'bg-gray-100 text-gray-500', open: 'bg-red-100 text-red-700', resolved: 'bg-green-100 text-green-700', todo: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700', 'in-progress': 'bg-yellow-100 text-yellow-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }
  const sevColor = (s: string) => {
    const m: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-blue-100 text-blue-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Automation</h1>
            <p className="text-sm text-gray-500">Frameworks, controls, evidence, findings, and remediation tasks</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.name} ({selected.code})</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-teal-500">Clear</button>
        </div>
      )}

      {tab === 'Overview' && overview && (
        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-5xl font-bold text-teal-600">{overview.readinessPct}%</p>
            <p className="text-lg mt-2">Audit Readiness</p>
            <p className="text-sm text-gray-500 mt-1">{overview.implementedControls}/{overview.totalControls} controls implemented</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Frameworks', overview.frameworks], ['Controls', overview.totalControls], ['Open Findings', overview.openFindings], ['Open Tasks', overview.openTasks]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Frameworks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Frameworks ({frameworks.length})</h2>
            <button type="button" onClick={() => api.post('/compliance-auto/frameworks/seed-soc2', {}).then((r: any) => { notify('SOC2 seeded with ' + r.controlsCreated + ' controls'); load() })} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Seed SOC 2</button>
          </div>
          <div className="grid gap-3">
            {frameworks.map((fw: any) => (
              <div key={fw.id} onClick={() => setSelected(fw)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === fw.id ? 'border-teal-400 bg-teal-50' : 'hover:border-teal-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fw.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{fw.code}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{fw.version}</span>
                    </div>
                    <p className="text-xs text-gray-400">{fw._count?.controls ?? 0} controls · {fw._count?.assessments ?? 0} assessments</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/compliance-auto/frameworks/' + fw.id + '/run-checks', {}).then((r: any) => { notify('Checked ' + r.checked + ' automated controls'); load() }) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Run Checks</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/compliance-auto/frameworks/' + fw.id + '/assess', {}).then((r: any) => { notify('Assessment: ' + r.score + '% (' + r.passedControls + '/' + r.totalControls + ')'); load() }) }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Assess</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/compliance-auto/frameworks/' + fw.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {frameworks.length === 0 && <div className="text-center py-12 text-gray-400">No frameworks — seed SOC 2 to start</div>}
          </div>
        </div>
      )}

      {tab === 'Controls' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select a framework first</div> : (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileCheck className="w-5 h-5" /> Controls ({controls.length})</h2>
              <div className="grid gap-2">
                {controls.map((c: any) => (
                  <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{c.code}</span>
                        <span className="text-sm">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.category}</span>
                        {c.automated && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">automated</span>}
                        <span className="text-xs text-gray-400">{c._count?.evidences ?? 0} evidence · {c._count?.findings ?? 0} findings</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.patch('/compliance-auto/controls/' + c.id, { status: 'implemented' }).then(() => { notify('Marked implemented'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Implement</button>
                      <button type="button" onClick={() => api.post('/compliance-auto/controls/' + c.id + '/evidence', { title: 'Evidence for ' + c.code, evidenceType: 'attestation', content: 'Verified ' + new Date().toISOString() }).then(() => { notify('Evidence attached'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+ Evidence</button>
                    </div>
                  </div>
                ))}
                {controls.length === 0 && <div className="text-center py-8 text-gray-400">No controls</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Findings' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertCircle className="w-5 h-5 text-orange-500" /> Findings ({findings.length})</h2>
          <div className="grid gap-2">
            {findings.map((f: any) => (
              <div key={f.id} className={`border rounded-xl p-3 ${f.status === 'open' ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(f.severity)}`}>{f.severity}</span>
                      <span className="text-sm font-medium">{f.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(f.status)}`}>{f.status}</span>
                      {f.control && <span className="text-xs font-mono text-gray-400">{f.control.code}</span>}
                    </div>
                    {f.remediation && <p className="text-xs text-gray-600">Fix: {f.remediation}</p>}
                  </div>
                  {f.status === 'open' && <button type="button" onClick={() => api.post('/compliance-auto/findings/' + f.id + '/resolve', {}).then(() => { notify('Resolved'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolve</button>}
                </div>
              </div>
            ))}
            {findings.length === 0 && <div className="text-center py-8 text-gray-400">No findings</div>}
          </div>
        </div>
      )}

      {tab === 'Tasks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><ListTodo className="w-5 h-5" /> Tasks ({tasks.length})</h2>
            <button type="button" onClick={() => api.post('/compliance-auto/tasks', { title: 'Review access controls', taskType: 'review', priority: 'high' }).then(() => { notify('Task created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Task</button>
          </div>
          <div className="grid gap-2">
            {tasks.map((t: any) => (
              <div key={t.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(t.priority)}`}>{t.priority}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t.taskType}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {t.status !== 'done' && <button type="button" onClick={() => api.patch('/compliance-auto/tasks/' + t.id, { status: 'done' }).then(() => { notify('Done'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Complete</button>}
                  <button type="button" onClick={() => api.remove('/compliance-auto/tasks/' + t.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="text-center py-8 text-gray-400">No tasks</div>}
          </div>
        </div>
      )}
    </div>
  )
}
