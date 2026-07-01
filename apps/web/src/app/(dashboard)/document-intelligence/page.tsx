'use client'

import { useState, useEffect, useCallback } from 'react'

async function apiGet(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`)
  return r.json()
}
async function apiPost(path: string, body?: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return r.json()
}
async function apiDelete(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return r.json()
}

interface AdiDocument { id: string; name: string; mimeType: string; fileSize: number; status: string; confidence: number; pageCount: number; wordCount: number; createdAt: string; _count?: { extractions: number; classifications: number } }
interface Extraction { id: string; fieldName: string; fieldValue: string; extractionType: string; confidence: number; pageNumber?: number; isVerified: boolean }
interface Pipeline { id: string; name: string; slug: string; description?: string; isActive: boolean; totalRuns: number; _count?: { runs: number } }
interface PipelineTemplate { name: string; slug: string; description: string; inputTypes: string[] }
interface DashboardData { summary: string; stats: { totalDocuments: number; processedDocuments: number; activePipelines: number }; recentDocuments: AdiDocument[] }

const TABS = ['Dashboard', 'Documents', 'Pipelines', 'Templates'] as const
type Tab = typeof TABS[number]

const STATUS_COLORS: Record<string, string> = {
  uploaded: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700',
  processed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700', running: 'bg-blue-100 text-blue-700',
}

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄', 'image/jpeg': '🖼️', 'image/png': '🖼️',
  'application/msword': '📝', 'text/plain': '📋',
}

export default function DocumentIntelligencePage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [documents, setDocuments] = useState<AdiDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<AdiDocument & { extractions?: Extraction[] } | null>(null)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [templates, setTemplates] = useState<PipelineTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showPipelineForm, setShowPipelineForm] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: '', mimeType: 'application/pdf', fileSize: '102400' })
  const [pipelineForm, setPipelineForm] = useState({ name: '', slug: '' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/adi/dashboard'); setDashboard(d) }, [])
  const loadDocuments = useCallback(async () => { const d = await apiGet('/v1/adi/documents'); setDocuments(d.documents ?? []) }, [])
  const loadPipelines = useCallback(async () => { const d = await apiGet('/v1/adi/pipelines'); setPipelines(d.pipelines ?? []) }, [])
  const loadTemplates = useCallback(async () => { const d = await apiGet('/v1/adi/pipeline-templates'); setTemplates(d.templates ?? []) }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard,
      Documents: loadDocuments,
      Pipelines: async () => { await Promise.all([loadPipelines(), loadDocuments()]) },
      Templates: loadTemplates,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadDocuments, loadPipelines, loadTemplates])

  const uploadDocument = async () => {
    const r = await apiPost('/v1/adi/documents/upload', { ...uploadForm, fileSize: parseInt(uploadForm.fileSize) })
    if (r.error) flash(r.error); else { flash(`Document uploaded: ${r.name}`); setShowUploadForm(false); await loadDocuments() }
  }

  const processDocument = async (id: string) => {
    flash('Processing document...')
    const r = await apiPost(`/v1/adi/documents/${id}/process`)
    if (r.error) flash(r.error)
    else flash(`Processed — ${r.classification?.category} (${(r.confidence * 100).toFixed(0)}% confidence, ${r.extractedFields} fields)`)
    await loadDocuments()
    if (selectedDoc?.id === id) {
      const detail = await apiGet(`/v1/adi/documents/${id}`)
      setSelectedDoc(detail)
    }
  }

  const selectDocument = async (doc: AdiDocument) => {
    const detail = await apiGet(`/v1/adi/documents/${doc.id}`)
    setSelectedDoc(detail)
  }

  const deleteDocument = async (id: string) => {
    await apiDelete(`/v1/adi/documents/${id}`)
    await loadDocuments()
    if (selectedDoc?.id === id) setSelectedDoc(null)
  }

  const createPipeline = async () => {
    const r = await apiPost('/v1/adi/pipelines', { ...pipelineForm, steps: [], inputTypes: ['application/pdf'] })
    if (r.error) flash(r.error); else { flash('Pipeline created'); setShowPipelineForm(false); await loadPipelines() }
  }

  const installTemplate = async (slug: string) => {
    const r = await apiPost('/v1/adi/pipeline-templates/install', { slug })
    if (r.error) flash(r.error); else { flash(`Installed: ${r.name}`); await loadPipelines(); setTab('Pipelines') }
  }

  const runPipeline = async (pipelineId: string, documentId?: string) => {
    flash('Running pipeline...')
    const r = await apiPost(`/v1/adi/pipelines/${pipelineId}/run`, documentId ? { documentId } : {})
    if (r.error) flash(r.error); else flash(`Pipeline complete — ${r.steps} steps, ${r.durationMs}ms`)
    await loadPipelines()
  }

  const deletePipeline = async (id: string) => {
    await apiDelete(`/v1/adi/pipelines/${id}`); await loadPipelines()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Document Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">OCR · Classification · Field Extraction · Processing Pipelines</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* Dashboard */}
      {!loading && tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-xl p-5 text-white">
            <p className="text-lg font-medium">{dashboard.summary}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Documents', value: dashboard.stats.totalDocuments, color: 'text-violet-600' },
              { label: 'Processed', value: dashboard.stats.processedDocuments, color: 'text-green-600' },
              { label: 'Pipelines', value: dashboard.stats.activePipelines, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Recent Documents</h3>
            <div className="space-y-2">
              {dashboard.recentDocuments.map(doc => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span>{MIME_ICONS[doc.mimeType] ?? '📎'}</span>
                    <div><div className="text-sm font-medium">{doc.name}</div><div className="text-xs text-gray-400">{(doc.confidence * 100).toFixed(0)}% confidence</div></div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>{doc.status}</span>
                </div>
              ))}
              {dashboard.recentDocuments.length === 0 && <p className="text-sm text-gray-400">No documents yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Documents */}
      {!loading && tab === 'Documents' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{documents.length} documents</p>
            <button onClick={() => setShowUploadForm(true)} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-700">+ Upload Document</button>
          </div>
          {showUploadForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Upload Document</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Document name" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={uploadForm.mimeType} onChange={e => setUploadForm(f => ({ ...f, mimeType: e.target.value }))}>
                  {['application/pdf','image/jpeg','image/png','application/msword','text/plain'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="File size (bytes)" value={uploadForm.fileSize} onChange={e => setUploadForm(f => ({ ...f, fileSize: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={uploadDocument} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm">Upload</button>
                <button onClick={() => setShowUploadForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className={`bg-white rounded-xl border p-4 cursor-pointer hover:border-violet-300 transition-colors ${selectedDoc?.id === doc.id ? 'border-violet-400 ring-1 ring-violet-200' : ''}`}
                  onClick={() => selectDocument(doc)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{MIME_ICONS[doc.mimeType] ?? '📎'}</span>
                      <div><div className="font-medium">{doc.name}</div><div className="text-xs text-gray-400">{(doc.fileSize / 1024).toFixed(0)} KB · {doc._count?.extractions ?? 0} extractions</div></div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>{doc.status}</span>
                  </div>
                  {doc.status === 'processed' && <div className="mt-2 text-xs text-gray-500">{doc.pageCount}p · {doc.wordCount} words · {(doc.confidence * 100).toFixed(0)}% confidence</div>}
                  <div className="flex gap-2 mt-3">
                    {doc.status === 'uploaded' && <button onClick={e => { e.stopPropagation(); processDocument(doc.id) }} className="flex-1 bg-violet-600 text-white py-1.5 rounded text-xs hover:bg-violet-700">Process</button>}
                    <button onClick={e => { e.stopPropagation(); deleteDocument(doc.id) }} className="px-3 py-1.5 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                  <p className="text-2xl mb-2">📄</p>
                  <p>No documents yet. Upload one to start AI processing.</p>
                </div>
              )}
            </div>
            {selectedDoc && (
              <div className="bg-white rounded-xl border p-4 space-y-4">
                <h3 className="font-semibold text-gray-700">Extracted Fields</h3>
                {(selectedDoc.extractions ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">{selectedDoc.status === 'uploaded' ? 'Process this document to extract fields.' : 'No fields extracted.'}</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedDoc.extractions ?? []).map(e => (
                      <div key={e.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                        <div>
                          <div className="text-xs text-gray-500 uppercase">{e.fieldName}</div>
                          <div className="text-sm font-medium">{e.fieldValue}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">{e.extractionType}</div>
                          <div className="text-xs">{(e.confidence * 100).toFixed(0)}%</div>
                          {e.isVerified && <span className="text-xs text-green-600">✓ Verified</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pipelines */}
      {!loading && tab === 'Pipelines' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{pipelines.length} pipelines</p>
            <button onClick={() => setShowPipelineForm(true)} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-700">+ New Pipeline</button>
          </div>
          {showPipelineForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Create Pipeline</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Pipeline name" value={pipelineForm.name} onChange={e => setPipelineForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug" value={pipelineForm.slug} onChange={e => setPipelineForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createPipeline} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm">Create</button>
                <button onClick={() => setShowPipelineForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {pipelines.map(p => (
              <div key={p.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div><div className="font-semibold">{p.name}</div><div className="text-xs text-gray-400">{p.description}</div></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'active' : 'inactive'}</span>
                </div>
                <div className="text-xs text-gray-400">{p.totalRuns} total runs</div>
                <div className="flex gap-2">
                  <select className="flex-1 border rounded text-sm px-2 py-1.5" defaultValue="" onChange={async e => { if (e.target.value) { await runPipeline(p.id, e.target.value); e.target.value = '' } }}>
                    <option value="">Run on document...</option>
                    {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <button onClick={() => runPipeline(p.id)} className="bg-violet-600 text-white px-3 py-1.5 rounded text-sm hover:bg-violet-700">▶ Test Run</button>
                  <button onClick={() => deletePipeline(p.id)} className="text-red-500 hover:text-red-700 px-2 py-1.5 rounded border text-sm">Del</button>
                </div>
              </div>
            ))}
            {pipelines.length === 0 && <div className="md:col-span-2 bg-white rounded-xl border p-8 text-center text-gray-400"><p className="text-2xl mb-2">🔄</p><p>No pipelines. Install from Templates tab.</p></div>}
          </div>
        </div>
      )}

      {/* Templates */}
      {!loading && tab === 'Templates' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{templates.length} built-in pipeline templates</p>
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map(t => (
              <div key={t.slug} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="font-semibold">{t.name}</div>
                <p className="text-sm text-gray-500">{t.description}</p>
                <div className="flex flex-wrap gap-1">
                  {t.inputTypes.map(it => <span key={it} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{it.split('/')[1] ?? it}</span>)}
                </div>
                <button onClick={() => installTemplate(t.slug)} className="w-full bg-violet-600 text-white py-2 rounded-lg text-sm hover:bg-violet-700">Install Pipeline</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
