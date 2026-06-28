'use client'

import { useState, useEffect } from 'react'
import { BarChart2, Plus, Play, Download, Calendar, Pin, Trash2, FileText } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const MODULES = [
  { value: 'hr_employees', label: 'HR — Employees' },
  { value: 'crm_contacts', label: 'CRM — Contacts' },
  { value: 'sales_invoices', label: 'Sales — Invoices' },
  { value: 'pm_projects', label: 'Projects' },
  { value: 'helpdesk_tickets', label: 'Helpdesk Tickets' },
  { value: 'audit_logs', label: 'Audit Logs' },
]

interface Report {
  id: string
  name: string
  description: string | null
  module: string
  chartType: string | null
  isPublic: boolean
  isPinned: boolean
  createdAt: string
}

export default function ReportsPage() {
  const { token } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<{ reportId: string; data: unknown[]; total: number } | null>(null)
  const [form, setForm] = useState({ name: '', description: '', module: 'hr_employees', chartType: '' })

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch(`${API}/v1/reports`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setReports(d.data ?? [])).finally(() => setLoading(false))
  }, [token])

  const create = async () => {
    const res = await fetch(`${API}/v1/reports`, { method: 'POST', headers, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.data) { setReports(r => [data.data, ...r]); setShowAdd(false); setForm({ name: '', description: '', module: 'hr_employees', chartType: '' }) }
  }

  const run = async (id: string) => {
    setRunning(id)
    try {
      const res = await fetch(`${API}/v1/reports/${id}/run`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setResults({ reportId: id, data: Array.isArray(data.data) ? data.data.slice(0, 100) : [], total: data.meta?.total ?? 0 })
    } finally { setRunning(null) }
  }

  const exportReport = async (id: string) => {
    await fetch(`${API}/v1/reports/${id}/export`, { method: 'POST', headers, body: JSON.stringify({ format: 'csv' }) })
    alert('Export started — check the exports queue.')
  }

  const del = async (id: string) => {
    await fetch(`${API}/v1/reports/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setReports(r => r.filter(x => x.id !== id))
    if (results?.reportId === id) setResults(null)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* Left: report list */}
      <div className="w-80 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" /> Reports
          </h1>
          <button onClick={() => setShowAdd(true)} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {reports.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No reports yet</p>
              </div>
            )}
            {reports.map(r => (
              <div key={r.id} className={`bg-card border rounded-xl p-3 cursor-pointer transition-colors ${results?.reportId === r.id ? 'border-indigo-500' : 'border-border hover:border-indigo-500/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0" onClick={() => run(r.id)}>
                    <p className="font-medium text-foreground text-sm truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">{MODULES.find(m => m.value === r.module)?.label ?? r.module}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {r.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                    <button onClick={() => run(r.id)} disabled={running === r.id} className="p-1 hover:text-green-500 text-muted-foreground/60 transition-colors">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => exportReport(r.id)} className="p-1 hover:text-indigo-500 text-muted-foreground/60 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => del(r.id)} className="p-1 hover:text-red-500 text-muted-foreground/60 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: results */}
      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        {!results ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
            <Play className="w-10 h-10 opacity-20" />
            <p className="text-sm">Select a report and click Run</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">{results.total.toLocaleString()} rows</span>
              <span className="text-xs text-muted-foreground">Showing first {Math.min(100, results.total)}</span>
            </div>
            <div className="flex-1 overflow-auto">
              {results.data.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No data</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card/90 backdrop-blur border-b border-border">
                    <tr>
                      {Object.keys(results.data[0] as object).slice(0, 12).map(col => (
                        <th key={col} className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(results.data as Record<string, unknown>[]).map((row, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                        {Object.keys(row).slice(0, 12).map(col => (
                          <td key={col} className="px-3 py-1.5 text-foreground/80 max-w-[200px] truncate">
                            {row[col] === null || row[col] === undefined ? '—' : typeof row[col] === 'object' ? JSON.stringify(row[col]).slice(0, 50) : String(row[col]).slice(0, 80)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">New Report</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Report name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Monthly Employee Report" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Data source</label>
                <select value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                  {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={create} disabled={!form.name} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
