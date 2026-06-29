'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Plus, AlertTriangle, CheckCircle, XCircle, List, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
}
const RISK_LABEL = (score: number) => score >= 20 ? 'Critical' : score >= 12 ? 'High' : score >= 6 ? 'Medium' : 'Low'
const RISK_COLOR = (score: number) => score >= 20 ? 'text-red-400' : score >= 12 ? 'text-orange-400' : score >= 6 ? 'text-amber-400' : 'text-green-400'

interface Framework { id: string; name: string; type: string; status: string; _count?: { controls: number } }
interface Risk { id: string; title: string; category: string | null; likelihood: number; impact: number; riskScore: number; status: string; mitigation: string | null }
interface Finding { id: string; title: string; severity: string; status: string; dueDate: string | null; controlId: string | null }
interface Dashboard { frameworks: number; totalControls: number; complianceRate: number; openFindings: number; criticalRisks: number }

type Tab = 'frameworks' | 'risks' | 'findings'

export default function CompliancePage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<Tab>('frameworks')
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    fetch(`${API}/v1/compliance/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setDashboard(d.data))
    if (tab === 'frameworks') fetch(`${API}/v1/compliance/frameworks`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setFrameworks(d.data ?? []))
    if (tab === 'risks') fetch(`${API}/v1/compliance/risks`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setRisks(d.data ?? []))
    if (tab === 'findings') fetch(`${API}/v1/compliance/findings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setFindings(d.data ?? []))
  }

  useEffect(() => { load() }, [tab, token])

  const createFramework = async () => {
    const res = await fetch(`${API}/v1/compliance/frameworks`, { method: 'POST', headers: h, body: JSON.stringify(form) }).then(r => r.json())
    if (res.data) { setFrameworks(f => [res.data, ...f]); setShowCreate(false); setForm({}) }
  }

  const createRisk = async () => {
    const res = await fetch(`${API}/v1/compliance/risks`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, likelihood: parseInt(form.likelihood ?? '3'), impact: parseInt(form.impact ?? '3') }) }).then(r => r.json())
    if (res.data) { setRisks(r => [res.data, ...r]); setShowCreate(false); setForm({}) }
  }

  const createFinding = async () => {
    const res = await fetch(`${API}/v1/compliance/findings`, { method: 'POST', headers: h, body: JSON.stringify(form) }).then(r => r.json())
    if (res.data) { setFindings(f => [res.data, ...f]); setShowCreate(false); setForm({}) }
  }

  const closeFinding = async (id: string) => {
    await fetch(`${API}/v1/compliance/findings/${id}/close`, { method: 'PATCH', headers: h, body: JSON.stringify({ remediation: 'Resolved' }) })
    setFindings(f => f.map(x => x.id === id ? { ...x, status: 'closed' } : x))
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-500" /> Compliance & Audit
        </h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add {tab === 'frameworks' ? 'Framework' : tab === 'risks' ? 'Risk' : 'Finding'}
        </button>
      </div>

      {dashboard && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Frameworks', value: dashboard.frameworks },
            { label: 'Total Controls', value: dashboard.totalControls },
            { label: 'Compliance Rate', value: `${dashboard.complianceRate}%` },
            { label: 'Open Findings', value: dashboard.openFindings, warn: dashboard.openFindings > 0 },
            { label: 'Critical Risks', value: dashboard.criticalRisks, warn: dashboard.criticalRisks > 0 },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <p className={`text-2xl font-bold ${s.warn ? 'text-red-400' : 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {(['frameworks', 'risks', 'findings'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {tab === 'frameworks' && frameworks.map(fw => (
          <div key={fw.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{fw.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{fw.type} · {fw._count?.controls ?? 0} controls</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${fw.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>{fw.status}</span>
          </div>
        ))}

        {tab === 'risks' && risks.map(r => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={`text-lg font-bold w-12 text-center ${RISK_COLOR(r.riskScore)}`}>{r.riskScore}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-medium text-foreground text-sm truncate">{r.title}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${RISK_COLOR(r.riskScore)} bg-current/10`}>{RISK_LABEL(r.riskScore)}</span>
              </div>
              <p className="text-xs text-muted-foreground">L:{r.likelihood} × I:{r.impact}{r.category ? ` · ${r.category}` : ''}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${r.status === 'mitigated' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.status}</span>
          </div>
        ))}

        {tab === 'findings' && findings.map(f => (
          <div key={f.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            {f.status === 'closed' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-medium text-foreground text-sm truncate">{f.title}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${SEVERITY_COLORS[f.severity] ?? 'bg-muted text-muted-foreground'}`}>{f.severity}</span>
              </div>
              {f.dueDate && <p className="text-xs text-muted-foreground">Due: {new Date(f.dueDate).toLocaleDateString()}</p>}
            </div>
            {f.status === 'open' && (
              <button onClick={() => closeFinding(f.id)} className="text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 px-3 py-1.5 rounded-lg transition-colors">
                Close
              </button>
            )}
          </div>
        ))}

        {((tab === 'frameworks' && !frameworks.length) || (tab === 'risks' && !risks.length) || (tab === 'findings' && !findings.length)) && (
          <p className="text-center py-12 text-muted-foreground text-sm">No {tab} yet</p>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Add {tab === 'frameworks' ? 'Framework' : tab === 'risks' ? 'Risk' : 'Finding'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Title / Name</label>
                <input value={form.name ?? form.title ?? ''} onChange={e => setForm(f => ({ ...f, [tab === 'frameworks' ? 'name' : 'title']: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Description</label>
                <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
              </div>
              {tab === 'frameworks' && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Type</label>
                  <select value={form.type ?? 'custom'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['ISO27001','SOC2','GDPR','HIPAA','PCI-DSS','NIST','custom'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              {tab === 'risks' && (
                <div className="grid grid-cols-2 gap-3">
                  {[{ field: 'likelihood', label: 'Likelihood (1-5)' }, { field: 'impact', label: 'Impact (1-5)' }].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                      <input type="number" min="1" max="5" value={form[field] ?? '3'} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                  ))}
                </div>
              )}
              {tab === 'findings' && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Severity</label>
                  <select value={form.severity ?? 'medium'} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCreate(false); setForm({}) }} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={tab === 'frameworks' ? createFramework : tab === 'risks' ? createRisk : createFinding}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
