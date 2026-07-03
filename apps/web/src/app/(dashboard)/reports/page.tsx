'use client'

import { useState, useCallback, useEffect } from 'react'
import { FileText, Play, Download, Clock, Brain, BarChart3, Table2, AlignLeft, PlusCircle, Trash2, RefreshCw, Bell } from 'lucide-react'

const proxy = (path: string) => `/api/proxy?path=${encodeURIComponent(path)}`

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const fetch_ = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch(proxy(path)); setData(await r.json()) }
    catch { /* noop */ } finally { setLoading(false) }
  }, [path])
  useEffect(() => { fetch_() }, [fetch_])
  return { data, loading, refetch: fetch_ }
}

const TABS = ['My Reports', 'Builder', 'Data Sources', 'Templates', 'Analytics'] as const
type Tab = typeof TABS[number]

const SECTION_TYPES = [
  { key: 'kpi', label: 'KPI Cards', icon: BarChart3, color: 'bg-indigo-500' },
  { key: 'chart', label: 'Chart', icon: BarChart3, color: 'bg-blue-500' },
  { key: 'table', label: 'Data Table', icon: Table2, color: 'bg-green-500' },
  { key: 'text', label: 'Text Block', icon: AlignLeft, color: 'bg-gray-500' },
  { key: 'narrative', label: 'AI Narrative', icon: Brain, color: 'bg-purple-500' },
]

function SectionPreview({ section }: { section: Record<string, unknown> }) {
  const type = section['sectionType'] as string
  const data = section['cachedData'] as Record<string, unknown> | null
  if (!data) return (
    <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center text-gray-400 text-xs">
      No data yet — run the report to populate
    </div>
  )
  if (type === 'kpi' && data['kpis']) {
    const kpis = data['kpis'] as Array<{ label: string; value: string; change: number }>
    return (
      <div className="grid grid-cols-3 gap-2">
        {kpis.slice(0, 6).map((k, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">{k.label}</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{k.value}</p>
            <p className={`text-[10px] mt-0.5 ${k.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {k.change >= 0 ? '▲' : '▼'} {Math.abs(k.change)}%
            </p>
          </div>
        ))}
      </div>
    )
  }
  if (type === 'chart' && data['chart']) {
    const chart = data['chart'] as { labels: string[]; datasets: Array<{ label: string; data: number[]; color: string }> }
    const maxVal = Math.max(...chart.datasets.flatMap(d => d.data), 1)
    return (
      <div>
        <div className="flex gap-2 mb-1">
          {chart.datasets.map((ds, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: ds.color }} />{ds.label}
            </span>
          ))}
        </div>
        <div className="flex items-end gap-0.5 h-16">
          {chart.labels.slice(0, 9).map((l, li) => (
            <div key={li} className="flex-1 flex flex-col items-center gap-0">
              <div className="w-full flex flex-col-reverse gap-px">
                {chart.datasets.map((ds, di) => (
                  <div key={di} className="w-full rounded-sm opacity-80" style={{ height: `${Math.round((ds.data[li] / maxVal) * 48)}px`, backgroundColor: ds.color }} />
                ))}
              </div>
              <p className="text-[7px] text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (type === 'table' && data['table']) {
    const table = data['table'] as { headers: string[]; rows: Record<string, string>[] }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead><tr className="bg-gray-50">{table.headers.map((h, i) => <th key={i} className="px-2 py-1 text-left text-gray-600 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {table.rows.slice(0, 4).map((row, ri) => (
              <tr key={ri} className="border-t border-gray-100">
                {Object.values(row).map((v, vi) => <td key={vi} className="px-2 py-1 text-gray-700">{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (type === 'narrative' && data['narrative']) {
    return <div className="bg-purple-50 border border-purple-200 rounded-lg p-3"><p className="text-xs text-purple-700 leading-relaxed">{data['narrative'] as string}</p></div>
  }
  return <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">{JSON.stringify(data).slice(0, 100)}...</div>
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('My Reports')
  const [selectedReport, setSelectedReport] = useState<Record<string, unknown> | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: listData, loading: listLoading, refetch: refetchList } = useApi<{ mine: unknown[]; shared: unknown[] }>('/reports')
  const { data: sourcesData } = useApi<{ dataSources: unknown[] }>('/reports/registry')
  const { data: templatesData, refetch: refetchTemplates } = useApi<{ templates: unknown[] }>('/reports/templates')

  const mine = (listData?.mine ?? []) as Array<Record<string, unknown>>
  const sources = (sourcesData?.dataSources ?? []) as Array<Record<string, unknown>>
  const templates = (templatesData?.templates ?? []) as Array<Record<string, unknown>>

  async function createReport() {
    if (!newName.trim()) return
    const r = await fetch(proxy('/reports'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) })
    if (r.ok) { setNewName(''); setCreating(false); refetchList() }
  }

  async function loadReport(id: string) {
    const r = await fetch(proxy(`/reports/${id}`))
    if (r.ok) { setSelectedReport(await r.json()); setTab('Builder') }
  }

  async function runReport() {
    if (!selectedReport) return
    setRunning(true); setMsg('')
    const r = await fetch(proxy(`/reports/${selectedReport['id']}/run`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const d = await r.json()
    setMsg(`✓ ${d['sectionsPopulated']} sections populated in ${d['runMs']}ms`)
    const upd = await fetch(proxy(`/reports/${selectedReport['id']}`))
    if (upd.ok) setSelectedReport(await upd.json())
    setRunning(false)
  }

  async function addSection(sectionType: string) {
    if (!selectedReport) return
    const dsList = ['finance', 'hr', 'sales', 'platform', 'operations', 'marketing']
    const ds = dsList[Math.floor(Math.random() * dsList.length)]
    await fetch(proxy(`/reports/${selectedReport['id']}/sections`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionType, title: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Section`, dataSource: ds }),
    })
    const upd = await fetch(proxy(`/reports/${selectedReport['id']}`))
    if (upd.ok) setSelectedReport(await upd.json())
  }

  async function deleteSection(sid: string) {
    if (!selectedReport) return
    await fetch(proxy(`/reports/${selectedReport['id']}/sections/${sid}`), { method: 'DELETE' })
    const upd = await fetch(proxy(`/reports/${selectedReport['id']}`))
    if (upd.ok) setSelectedReport(await upd.json())
  }

  async function exportReport(format: string) {
    if (!selectedReport) return
    const r = await fetch(proxy(`/reports/${selectedReport['id']}/export`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format }),
    })
    const d = await r.json()
    setMsg(`✓ ${format.toUpperCase()} export queued — ${d['fileSizeKb']}KB (${d['status']})`)
  }

  async function generateNarrative() {
    if (!selectedReport) return
    setRunning(true)
    await fetch(proxy(`/reports/${selectedReport['id']}/ai-narrative`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setMsg('✓ AI narrative generated!')
    const upd = await fetch(proxy(`/reports/${selectedReport['id']}`))
    if (upd.ok) setSelectedReport(await upd.json())
    setRunning(false)
  }

  async function subscribeReport() {
    if (!selectedReport) return
    await fetch(proxy(`/reports/${selectedReport['id']}/subscribe`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frequency: 'weekly' }) })
    setMsg('✓ Subscribed to weekly delivery')
  }

  async function createFromTemplate(tid: string, tname: string) {
    const r = await fetch(proxy(`/reports/from-template/${tid}`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: tname }),
    })
    if (r.ok) { refetchList(); refetchTemplates(); setTab('My Reports') }
  }

  const sections = (selectedReport?.['sections'] ?? []) as Array<Record<string, unknown>>
  const metrics = selectedReport?.['metrics'] as Record<string, unknown> | null

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reports & BI Engine</h1>
              <p className="text-sm text-gray-500">Enterprise reporting · AI narratives · Scheduled delivery · PDF/Excel export</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { label: `${mine.length} Reports`, color: 'bg-emerald-50 text-emerald-700' },
              { label: `${sources.length} Data Sources`, color: 'bg-blue-50 text-blue-700' },
              { label: `${templates.length} Templates`, color: 'bg-purple-50 text-purple-700' },
            ].map(b => (
              <span key={b.label} className={`text-xs font-medium px-3 py-1 rounded-full ${b.color}`}>{b.label}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-1 mt-4">
          {TABS.map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">

        {/* My Reports */}
        {tab === 'My Reports' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">My Reports ({mine.length})</h2>
              <button type="button" onClick={() => setCreating(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                <PlusCircle className="w-4 h-4" /> New Report
              </button>
            </div>
            {creating && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-2">
                <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Report name..."
                  value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createReport()} autoFocus />
                <button type="button" onClick={createReport} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Create</button>
                <button type="button" onClick={() => setCreating(false)} className="text-gray-500 px-3 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            )}
            {listLoading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : mine.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No reports yet. Create one or use a template.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mine.map((rpt, i) => {
                  const m = rpt['metrics'] as Record<string, unknown> | null
                  return (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => loadReport(rpt['id'] as string)}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{rpt['name'] as string}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{(rpt['description'] as string) || 'No description'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${rpt['status'] === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {rpt['status'] as string}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 mt-3">
                        <span>{(rpt['_count'] as Record<string, unknown>)?.['sections'] as number ?? 0} sections</span>
                        {m && <><span>{m['runCount'] as number ?? 0} runs</span><span>{m['totalExports'] as number ?? 0} exports</span></>}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{rpt['reportType'] as string}</span>
                        {rpt['isPublic'] && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Public</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Builder */}
        {tab === 'Builder' && (
          <div>
            {!selectedReport ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Select a report from "My Reports" to start building.</p>
              </div>
            ) : (
              <div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedReport['name'] as string}</h2>
                      <p className="text-xs text-gray-500">
                        {sections.length} sections · {selectedReport['reportType'] as string}
                        {selectedReport['lastRunAt'] && ` · Last run: ${new Date(selectedReport['lastRunAt'] as string).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button type="button" onClick={runReport} disabled={running}
                        className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                        {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {running ? 'Running...' : 'Run'}
                      </button>
                      <button type="button" onClick={() => exportReport('pdf')} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button type="button" onClick={() => exportReport('excel')} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                        <Download className="w-3.5 h-3.5" /> Excel
                      </button>
                      <button type="button" onClick={() => exportReport('csv')} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                        <Download className="w-3.5 h-3.5" /> CSV
                      </button>
                      <button type="button" onClick={generateNarrative} disabled={running}
                        className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-60">
                        <Brain className="w-3.5 h-3.5" /> AI Narrative
                      </button>
                      <button type="button" onClick={subscribeReport} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                        <Bell className="w-3.5 h-3.5" /> Subscribe
                      </button>
                    </div>
                  </div>
                  {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded px-3 py-2 mt-2">{msg}</p>}
                  {metrics && (
                    <div className="flex gap-4 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      <span>Runs: {metrics['runCount'] as number ?? 0}</span>
                      <span>Avg: {metrics['avgRunMs'] as number ?? 0}ms</span>
                      <span>Exports: {metrics['totalExports'] as number ?? 0}</span>
                      <span>Views: {metrics['viewCount'] as number ?? 0}</span>
                    </div>
                  )}
                </div>

                {/* Add Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Add Section</p>
                  <div className="flex gap-2 flex-wrap">
                    {SECTION_TYPES.map(st => (
                      <button key={st.key} type="button" onClick={() => addSection(st.key)}
                        className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <span className={`w-3.5 h-3.5 rounded ${st.color} flex items-center justify-center`}>
                          <st.icon className="w-2 h-2 text-white" />
                        </span>
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sections */}
                {sections.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 text-sm">
                    No sections yet. Add sections above to build your report.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sections.map((s, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              s['sectionType'] === 'kpi' ? 'bg-indigo-100 text-indigo-700' :
                              s['sectionType'] === 'chart' ? 'bg-blue-100 text-blue-700' :
                              s['sectionType'] === 'table' ? 'bg-green-100 text-green-700' :
                              s['sectionType'] === 'narrative' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                            }`}>{s['sectionType'] as string}</span>
                            <span className="text-sm font-medium text-gray-800">{(s['title'] as string) || 'Untitled'}</span>
                            {s['dataSource'] && <span className="text-xs text-gray-400">· {s['dataSource'] as string}</span>}
                          </div>
                          <button type="button" aria-label="Delete section" onClick={() => deleteSection(s['id'] as string)} className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <SectionPreview section={s} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Data Sources */}
        {tab === 'Data Sources' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Data Sources ({sources.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map((ds, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{ds['icon'] as string}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{ds['name'] as string}</h3>
                      <p className="text-xs text-gray-500">{ds['module'] as string} module</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{ds['description'] as string}</p>
                  <div className="flex flex-wrap gap-1">
                    {((ds['fields'] as string[]) ?? []).map((f, fi) => (
                      <span key={fi} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        {tab === 'Templates' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Report Templates ({templates.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t, i) => {
                const secs = (t['sections'] as unknown[]) ?? []
                return (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{t['name'] as string}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{t['description'] as string}</p>
                      </div>
                      {t['isBuiltIn'] && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">Built-in</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 my-3">
                      <span className="bg-gray-100 rounded px-2 py-0.5">{t['category'] as string}</span>
                      <span>{secs.length} sections</span>
                    </div>
                    <div className="flex flex-col gap-1 mb-4">
                      {secs.slice(0, 4).map((s, si) => {
                        const sec = s as Record<string, unknown>
                        return (
                          <div key={si} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className={`w-2 h-2 rounded-full ${
                              sec['sectionType'] === 'kpi' ? 'bg-indigo-400' :
                              sec['sectionType'] === 'chart' ? 'bg-blue-400' :
                              sec['sectionType'] === 'table' ? 'bg-green-400' :
                              sec['sectionType'] === 'narrative' ? 'bg-purple-400' : 'bg-gray-400'
                            }`} />
                            {sec['title'] as string}
                          </div>
                        )
                      })}
                      {secs.length > 4 && <p className="text-xs text-gray-400">+{secs.length - 4} more</p>}
                    </div>
                    <button type="button" onClick={() => createFromTemplate(t['id'] as string, t['name'] as string)}
                      className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                      Use Template
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Analytics */}
        {tab === 'Analytics' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Reporting Analytics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Reports', value: mine.length, icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Data Sources', value: sources.length, icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
                { label: 'Templates', value: templates.length, icon: Table2, color: 'text-purple-600 bg-purple-50' },
                { label: 'Total Sections', value: mine.reduce((a, r) => a + ((r['_count'] as Record<string, unknown>)?.['sections'] as number ?? 0), 0), icon: AlignLeft, color: 'text-orange-600 bg-orange-50' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Report Activity</h3>
              {mine.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No reports yet.</p>
              ) : (
                <div className="space-y-2">
                  {mine.map((rpt, i) => {
                    const m = rpt['metrics'] as Record<string, unknown> | null
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{rpt['name'] as string}</p>
                          <p className="text-xs text-gray-500">{rpt['reportType'] as string} · {(rpt['_count'] as Record<string, unknown>)?.['sections'] as number ?? 0} sections</p>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>{m ? `${m['runCount'] as number} runs` : '0 runs'}</span>
                          <span>{m ? `${m['totalExports'] as number} exports` : '0 exports'}</span>
                          <span className={`px-2 py-0.5 rounded-full ${rpt['status'] === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {rpt['status'] as string}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Scheduled delivery info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Delivery Frequencies</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Daily', desc: 'Every day at 08:00', icon: '📅' },
                  { label: 'Weekly', desc: 'Every Monday at 08:00', icon: '📆' },
                  { label: 'Monthly', desc: 'First of month at 08:00', icon: '🗓️' },
                ].map((f, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xl">{f.icon}</p>
                    <p className="text-sm font-medium text-gray-800 mt-1">{f.label}</p>
                    <p className="text-xs text-gray-500">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
