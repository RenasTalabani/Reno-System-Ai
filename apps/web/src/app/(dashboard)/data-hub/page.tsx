'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Download, FileText, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-amber-400" />,
  processing: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
  completed: <CheckCircle className="w-4 h-4 text-green-400" />,
  partial: <AlertCircle className="w-4 h-4 text-amber-400" />,
  failed: <AlertCircle className="w-4 h-4 text-red-400" />,
}

interface ImportJob { id: string; entity: string; filename: string; status: string; totalRows: number; successRows: number; errorRows: number; createdAt: string }
interface ExportJob { id: string; entity: string; format: string; status: string; rowCount: number; fileUrl: string | null; createdAt: string }

export default function DataHubPage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<'import' | 'export'>('import')
  const [imports, setImports] = useState<ImportJob[]>([])
  const [exports, setExports] = useState<ExportJob[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [exportForm, setExportForm] = useState({ entity: '', format: 'csv' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedEntity, setSelectedEntity] = useState('cdp_customers')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/v1/data-hub/imports`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/data-hub/exports`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/data-hub/entities`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([i, e, ent]) => {
      setImports(i.data ?? [])
      setExports(e.data ?? [])
      setEntities(ent.data ?? [])
    })
  }, [token])

  const handleFileImport = async (file: File) => {
    setImporting(true)
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers_csv = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      return Object.fromEntries(headers_csv.map((h, i) => [h, vals[i] ?? '']))
    })
    // Auto-map CSV columns to model fields (same name)
    const mapping: Record<string, string> = Object.fromEntries(headers_csv.map(h => [h, h]))
    const res = await fetch(`${API}/v1/data-hub/imports`, {
      method: 'POST', headers,
      body: JSON.stringify({ entity: selectedEntity, filename: file.name, rows, mapping }),
    })
    const data = await res.json()
    if (data.data?.jobId) {
      const job = await fetch(`${API}/v1/data-hub/imports/${data.data.jobId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      setImports(prev => [job.data, ...prev])
    }
    setImporting(false)
  }

  const startExport = async () => {
    const res = await fetch(`${API}/v1/data-hub/exports`, { method: 'POST', headers, body: JSON.stringify({ entity: exportForm.entity || 'cdp_customers', format: exportForm.format }) })
    const data = await res.json()
    if (data.data?.jobId) {
      const job: ExportJob = { id: data.data.jobId, entity: exportForm.entity || 'cdp_customers', format: exportForm.format, status: 'processing', rowCount: 0, fileUrl: null, createdAt: new Date().toISOString() }
      setExports(prev => [job, ...prev])
      // Poll for completion
      setTimeout(async () => {
        const updated = await fetch(`${API}/v1/data-hub/exports/${data.data.jobId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        setExports(prev => prev.map(e => e.id === data.data.jobId ? updated.data : e))
      }, 2000)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-indigo-500" /> Data Import/Export Hub
      </h1>

      <div className="flex gap-1 mb-6 bg-muted/40 rounded-xl p-1 w-fit">
        {(['import', 'export'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-lg capitalize transition-colors ${tab === t ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'import' ? <><Upload className="w-3.5 h-3.5 inline mr-1.5" />Import</> : <><Download className="w-3.5 h-3.5 inline mr-1.5" />Export</>}
          </button>
        ))}
      </div>

      {tab === 'import' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Import CSV Data</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Target Entity</label>
                <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground">
                  {entities.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload CSV file</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Column names should match field names</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFileImport(e.target.files[0])} />
              </div>
              {importing && <p className="text-sm text-indigo-400 text-center">Processing import...</p>}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Import History</h3>
            {imports.map(job => (
              <div key={job.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                {STATUS_ICON[job.status] ?? <Clock className="w-4 h-4 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{job.filename}</p>
                  <p className="text-xs text-muted-foreground">{job.entity} · {job.successRows}/{job.totalRows} rows</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {imports.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No import history</p>}
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Export Data</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Entity</label>
                <select value={exportForm.entity} onChange={e => setExportForm(f => ({ ...f, entity: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground">
                  <option value="">Select entity...</option>
                  {entities.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Format</label>
                <select value={exportForm.format} onChange={e => setExportForm(f => ({ ...f, format: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground">
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>
            <button onClick={startExport} disabled={!exportForm.entity}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
              <Download className="w-4 h-4" /> Start Export
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Export History</h3>
            {exports.map(job => (
              <div key={job.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                {STATUS_ICON[job.status] ?? <Clock className="w-4 h-4 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{job.entity} · {job.format.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{job.rowCount} rows</p>
                </div>
                {job.fileUrl && (
                  <a href={job.fileUrl} download={`${job.entity}.${job.format}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 border border-indigo-500/30 rounded-lg transition-colors">
                    Download
                  </a>
                )}
                <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {exports.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No export history</p>}
          </div>
        </div>
      )}
    </div>
  )
}
