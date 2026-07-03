'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { Download, FileText, FileSpreadsheet, FileCode, Send, Clock, CheckCircle2, AlertCircle, Plus, Trash2, RefreshCw, BarChart3, Calendar, Shield } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface ExportJob { id: string; format: string; status: string; fileSizeKb?: number; completedAt?: string; fileName?: string; reportId?: string; retryCount: number; createdAt: string }
interface Schedule { id: string; name: string; frequency: string; format: string; isActive: boolean; nextRunAt?: string; runCount: number }
interface Delivery { id: string; recipient: string; subject: string; status: string; sentAt?: string }
interface Stats { totalJobs: number; byFormat: Record<string, number>; byStatus: Record<string, number>; activeSchedules: number; totalDeliveries: number }

const FORMAT_ICONS: Record<string, typeof FileText> = { pdf: FileText, excel: FileSpreadsheet, csv: FileCode }
const FORMAT_COLORS: Record<string, string> = { pdf: 'text-red-500', excel: 'text-green-500', csv: 'text-blue-500' }
const STATUS_COLORS: Record<string, string> = { done: 'text-green-600 bg-green-50', failed: 'text-red-600 bg-red-50', processing: 'text-blue-600 bg-blue-50', pending: 'text-yellow-600 bg-yellow-50', retrying: 'text-orange-600 bg-orange-50' }

export default function ExportEnginePage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<'jobs' | 'create' | 'schedules' | 'audit' | 'stats'>('jobs')
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [formats, setFormats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Create form
  const [cFormat, setCFormat] = useState('pdf')
  const [cName, setCName] = useState('')
  const [cBulk, setCBulk] = useState(false)
  const [bulkFormats, setBulkFormats] = useState<string[]>(['pdf'])

  // Schedule form
  const [sName, setSName] = useState('')
  const [sReportId, setSReportId] = useState('')
  const [sFrequency, setSFrequency] = useState('weekly')
  const [sFormat, setSFormat] = useState('pdf')
  const [sRecipients, setSRecipients] = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchJobs = useCallback(async () => {
    const r = await fetch(`${API}/v1/export-engine/jobs`, { headers })
    const d = await r.json()
    setJobs(d.jobs ?? [])
  }, [token])

  const fetchSchedules = useCallback(async () => {
    const r = await fetch(`${API}/v1/export-engine/schedules`, { headers })
    const d = await r.json()
    setSchedules(d.schedules ?? [])
  }, [token])

  const fetchStats = useCallback(async () => {
    const [sR, fR, aR] = await Promise.all([
      fetch(`${API}/v1/export-engine/stats`, { headers }),
      fetch(`${API}/v1/export-engine/formats`, { headers }),
      fetch(`${API}/v1/export-engine/audit`, { headers }),
    ])
    setStats(await sR.json())
    setFormats((await fR.json()).formats ?? [])
    setAuditLogs((await aR.json()).logs ?? [])
  }, [token])

  useEffect(() => {
    fetchJobs()
    fetchStats()
    fetchSchedules()
  }, [fetchJobs, fetchStats, fetchSchedules])

  async function createExport() {
    setLoading(true); setMsg('')
    try {
      if (cBulk) {
        const r = await fetch(`${API}/v1/export-engine/bulk`, {
          method: 'POST', headers,
          body: JSON.stringify({ formats: bulkFormats, reportName: cName || 'Reno Export' }),
        })
        const d = await r.json()
        setMsg(`Bulk export: ${d.total} files generated`)
      } else {
        const r = await fetch(`${API}/v1/export-engine/jobs`, {
          method: 'POST', headers,
          body: JSON.stringify({ format: cFormat, reportName: cName || 'Reno Export' }),
        })
        const d = await r.json()
        setMsg(`Job created: ${d.id?.substring(0, 8)}... status=${d.status}`)
      }
      await fetchJobs(); await fetchStats()
    } catch (e) { setMsg('Error: ' + String(e)) } finally { setLoading(false) }
  }

  async function downloadJob(job: ExportJob) {
    const r = await fetch(`${API}/v1/export-engine/jobs/${job.id}/token`, { method: 'POST', headers, body: '{}' })
    const d = await r.json()
    if (d.downloadUrl) window.open(`${API}${d.downloadUrl}`, '_blank')
  }

  async function retryJob(jobId: string) {
    await fetch(`${API}/v1/export-engine/jobs/${jobId}/retry`, { method: 'POST', headers, body: '{}' })
    await fetchJobs()
  }

  async function deleteJob(jobId: string) {
    await fetch(`${API}/v1/export-engine/jobs/${jobId}`, { method: 'DELETE', headers })
    await fetchJobs(); await fetchStats()
  }

  async function createSchedule() {
    setLoading(true); setMsg('')
    try {
      const r = await fetch(`${API}/v1/export-engine/schedules`, {
        method: 'POST', headers,
        body: JSON.stringify({ reportId: sReportId || '00000000-0000-0000-0000-000000000001', name: sName, frequency: sFrequency, format: sFormat, recipients: sRecipients.split(',').map(s => s.trim()).filter(Boolean) }),
      })
      const d = await r.json()
      setMsg(`Schedule created: ${d.name}`)
      setSName(''); setSReportId(''); setSRecipients('')
      await fetchSchedules()
    } catch (e) { setMsg('Error: ' + String(e)) } finally { setLoading(false) }
  }

  async function deleteSchedule(id: string) {
    await fetch(`${API}/v1/export-engine/schedules/${id}`, { method: 'DELETE', headers })
    await fetchSchedules()
  }

  async function toggleSchedule(s: Schedule) {
    await fetch(`${API}/v1/export-engine/schedules/${s.id}`, { method: 'PATCH', headers, body: JSON.stringify({ isActive: !s.isActive }) })
    await fetchSchedules()
  }

  const tabs = [
    { key: 'jobs', label: 'Export Jobs', icon: Download },
    { key: 'create', label: 'Create Export', icon: Plus },
    { key: 'schedules', label: 'Schedules', icon: Calendar },
    { key: 'audit', label: 'Audit Trail', icon: Shield },
    { key: 'stats', label: 'Statistics', icon: BarChart3 },
  ] as const

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export & Document Delivery</h1>
        <p className="text-muted-foreground mt-1">Real PDF, Excel & CSV generation with signed download URLs, email delivery, and scheduled exports</p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Exports', value: stats.totalJobs, color: 'text-indigo-600' },
            { label: 'PDF', value: stats.byFormat.pdf ?? 0, color: 'text-red-500' },
            { label: 'Excel', value: stats.byFormat.excel ?? 0, color: 'text-green-500' },
            { label: 'CSV', value: stats.byFormat.csv ?? 0, color: 'text-blue-500' },
            { label: 'Deliveries', value: stats.totalDeliveries, color: 'text-purple-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border flex gap-0 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); if (t.key === 'audit') fetchStats() }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 text-sm">{msg}</div>
      )}

      {/* Jobs tab */}
      {tab === 'jobs' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Export Jobs ({jobs.length})</h2>
            <button type="button" onClick={fetchJobs} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          {jobs.length === 0 && <p className="text-muted-foreground">No export jobs yet. Create one in the "Create Export" tab.</p>}
          <div className="space-y-2">
            {jobs.map(job => {
              const Icon = FORMAT_ICONS[job.format] ?? FileText
              return (
                <div key={job.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${FORMAT_COLORS[job.format] ?? 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-sm">{job.fileName ?? `${job.id.substring(0, 8)}.${job.format}`}</p>
                      <p className="text-xs text-muted-foreground">{job.format.toUpperCase()} · {job.fileSizeKb ?? 0}KB · {new Date(job.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-600'}`}>{job.status}</span>
                    {job.status === 'done' && (
                      <button type="button" onClick={() => downloadJob(job)} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    )}
                    {(job.status === 'failed') && (
                      <button type="button" onClick={() => retryJob(job.id)} className="flex items-center gap-1 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 px-2 py-1 rounded">
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    <button type="button" onClick={() => deleteJob(job.id)} aria-label="Delete job" className="text-muted-foreground hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create tab */}
      {tab === 'create' && (
        <div className="max-w-lg space-y-4">
          <h2 className="text-lg font-semibold">Create New Export</h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div>
              <label className="text-sm font-medium">Report Name</label>
              <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Reno Q3 Executive Report" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <input type="checkbox" checked={cBulk} onChange={e => setCBulk(e.target.checked)} />
                Bulk export (multiple formats at once)
              </label>
            </div>
            {!cBulk ? (
              <div>
                <label className="text-sm font-medium">Format</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {['pdf', 'excel', 'csv'].map(f => {
                    const Icon = FORMAT_ICONS[f]
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setCFormat(f)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${cFormat === f ? 'border-indigo-500 bg-indigo-50' : 'border-border hover:border-indigo-300'}`}
                      >
                        <Icon className={`w-6 h-6 ${FORMAT_COLORS[f]}`} />
                        <span className="text-xs font-medium uppercase">{f}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Select Formats</label>
                <div className="mt-2 flex gap-2">
                  {['pdf', 'excel', 'csv'].map(f => (
                    <label key={f} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={bulkFormats.includes(f)}
                        onChange={e => setBulkFormats(prev => e.target.checked ? [...prev, f] : prev.filter(x => x !== f))}
                      />
                      {f.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={createExport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {loading ? 'Generating...' : cBulk ? 'Generate Bulk Export' : `Generate ${cFormat.toUpperCase()}`}
            </button>
            <p className="text-xs text-muted-foreground text-center">Files are generated in real-time using pdfkit & xlsx</p>
          </div>

          {/* Format info */}
          <div className="space-y-2">
            {formats.map((f: any) => (
              <div key={f.key} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
                {(() => { const Icon = FORMAT_ICONS[f.key] ?? FileText; return <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${FORMAT_COLORS[f.key]}`} /> })()}
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                  {f.realGeneration && <span className="text-xs text-green-600 font-medium">✓ Real file generation</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedules tab */}
      {tab === 'schedules' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Scheduled Exports</h2>
          {/* Create schedule form */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">New Schedule</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={sName} onChange={e => setSName(e.target.value)} placeholder="Schedule name" className="border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              <input value={sRecipients} onChange={e => setSRecipients(e.target.value)} placeholder="Recipients (comma-separated)" className="border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              <select value={sFrequency} onChange={e => setSFrequency(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
              <select value={sFormat} onChange={e => setSFormat(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <button type="button" onClick={createSchedule} disabled={loading || !sName} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              <Calendar className="w-4 h-4" /> Create Schedule
            </button>
          </div>

          {/* Schedule list */}
          {schedules.length === 0 && <p className="text-muted-foreground">No schedules yet.</p>}
          <div className="space-y-2">
            {schedules.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.frequency} · {s.format.toUpperCase()} · Runs: {s.runCount}</p>
                  {s.nextRunAt && <p className="text-xs text-muted-foreground">Next: {new Date(s.nextRunAt).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => toggleSchedule(s)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Active' : 'Paused'}
                  </button>
                  <button type="button" onClick={() => deleteSchedule(s.id)} aria-label="Delete schedule" className="text-muted-foreground hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit tab */}
      {tab === 'audit' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Export Audit Trail ({auditLogs.length})</h2>
          {auditLogs.length === 0 && <p className="text-muted-foreground">No audit entries yet.</p>}
          <div className="space-y-1.5">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="bg-card border border-border rounded-lg p-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{log.action}</span>
                  <span className="text-sm text-muted-foreground">{log.entityType}</span>
                  <span className="text-xs text-muted-foreground font-mono">{log.entityId?.substring(0, 8)}...</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(log.occurredAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats tab */}
      {tab === 'stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Export Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-medium text-sm mb-3">Exports by Format</h3>
              <div className="space-y-2">
                {Object.entries(stats.byFormat).map(([format, count]) => (
                  <div key={format} className="flex items-center gap-3">
                    <span className={`text-sm font-medium w-12 ${FORMAT_COLORS[format]}`}>{format.toUpperCase()}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${stats.totalJobs ? (count / stats.totalJobs) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-medium text-sm mb-3">Exports by Status</h3>
              <div className="space-y-2">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-5 col-span-full">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-indigo-600">{stats.totalJobs}</p>
                  <p className="text-sm text-muted-foreground">Total Exports</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{stats.activeSchedules}</p>
                  <p className="text-sm text-muted-foreground">Active Schedules</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalDeliveries}</p>
                  <p className="text-sm text-muted-foreground">Email Deliveries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
