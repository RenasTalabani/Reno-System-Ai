'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'
const p = (path: string) => `${API}?path=${encodeURIComponent(path)}`

async function apiGet(path: string) { const r = await fetch(p(path)); return r.json() }
async function apiPost(path: string, body: any) { const r = await fetch(p(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json() }
async function apiPatch(path: string, body: any) { const r = await fetch(p(path), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json() }
async function apiDelete(path: string) { await fetch(p(path), { method: 'DELETE' }) }

const RISK_C: Record<string, string> = { low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' }
const STAT_C: Record<string, string> = { compliant: 'bg-green-100 text-green-800', non_compliant: 'bg-red-100 text-red-800', pending: 'bg-yellow-100 text-yellow-800', na: 'bg-gray-100 text-gray-600' }

export default function LegalAIPage() {
  const [tab, setTab] = useState<'dashboard' | 'contracts' | 'clauses' | 'compliance' | 'insights'>('dashboard')
  const [dash, setDash] = useState<any>(null)
  const [contracts, setContracts] = useState<any[]>([])
  const [clauses, setClauses] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [contractForm, setContractForm] = useState<any>({})
  const [clauseForm, setClauseForm] = useState<any>({})
  const [complianceForm, setComplianceForm] = useState<any>({})

  const loadDash = useCallback(async () => { const d = await apiGet('/lci/dashboard'); setDash(d) }, [])
  const loadContracts = useCallback(async () => { const d = await apiGet('/lci/contracts'); setContracts(Array.isArray(d) ? d : []) }, [])
  const loadClauses = useCallback(async () => { const d = await apiGet('/lci/clauses'); setClauses(Array.isArray(d) ? d : []) }, [])
  const loadCompliance = useCallback(async () => { const d = await apiGet('/lci/compliance'); setCompliance(Array.isArray(d) ? d : []) }, [])
  const loadInsights = useCallback(async () => { const d = await apiGet('/lci/insights'); setInsights(Array.isArray(d) ? d : []) }, [])

  useEffect(() => { loadDash() }, [loadDash])
  useEffect(() => {
    if (tab === 'contracts') loadContracts()
    else if (tab === 'clauses') { loadClauses(); loadContracts() }
    else if (tab === 'compliance') loadCompliance()
    else if (tab === 'insights') loadInsights()
  }, [tab, loadContracts, loadClauses, loadCompliance, loadInsights])

  const addContract = async () => {
    if (!contractForm.title) return
    setLoading(true)
    await apiPost('/lci/contracts', contractForm)
    setContractForm({})
    await loadContracts()
    setLoading(false)
  }

  const addClause = async () => {
    if (!clauseForm.title || !clauseForm.contractId) return
    setLoading(true)
    await apiPost('/lci/clauses', clauseForm)
    setClauseForm({})
    await loadClauses()
    setLoading(false)
  }

  const addCompliance = async () => {
    if (!complianceForm.framework || !complianceForm.requirement) return
    setLoading(true)
    await apiPost('/lci/compliance', complianceForm)
    setComplianceForm({})
    await loadCompliance()
    setLoading(false)
  }

  const markCompliant = async (id: string) => {
    await apiPatch(`/lci/compliance/${id}`, { status: 'compliant' })
    await loadCompliance()
  }

  const deleteContract = async (id: string) => {
    await apiDelete(`/lci/contracts/${id}`)
    await loadContracts()
  }

  const generateInsights = async () => {
    setLoading(true)
    await apiPost('/lci/insights/generate', {})
    await loadInsights()
    setLoading(false)
  }

  const tabs = ['dashboard', 'contracts', 'clauses', 'compliance', 'insights'] as const

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">AI Legal & Contract Intelligence</h1>
      <p className="text-sm text-gray-500 mb-6">Contract risk analysis, clause review & compliance tracking</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && dash && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Contracts', value: dash.kpis?.totalContracts ?? 0 },
              { label: 'High Risk', value: dash.kpis?.highRisk ?? 0, red: true },
              { label: 'Expiring < 90d', value: dash.kpis?.expiring ?? 0, yellow: true },
              { label: 'Total Value', value: `$${(dash.kpis?.totalValue ?? 0).toLocaleString()}` },
              { label: 'Non-Compliant', value: dash.kpis?.nonCompliant ?? 0, red: true },
              { label: 'Compliance Rate', value: `${dash.kpis?.complianceRate ?? 100}%`, green: true },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.red ? 'text-red-600' : k.yellow ? 'text-yellow-600' : k.green ? 'text-green-600' : 'text-indigo-600'}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Top Risk Contracts</h3>
              {dash.topRiskContracts?.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center mb-2 p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.contractType} · {c.counterparty ?? 'Unknown'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_C[c.aiRiskLevel] ?? ''}`}>{c.aiRiskLevel}</span>
                </div>
              ))}
              {!dash.topRiskContracts?.length && <p className="text-sm text-gray-400">No contracts yet</p>}
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">AI Legal Insights</h3>
              {dash.insights?.map((i: any) => (
                <div key={i.id} className="mb-2 p-3 rounded-lg bg-indigo-50">
                  <div className="flex gap-2 mb-1">
                    <span className="text-sm font-medium">{i.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${i.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{i.severity}</span>
                  </div>
                  <p className="text-xs text-gray-600">{i.summary}</p>
                </div>
              ))}
              {!dash.insights?.length && <p className="text-sm text-gray-400">Generate insights to see them</p>}
            </div>
          </div>
        </div>
      )}

      {/* Contracts */}
      {tab === 'contracts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Contract</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Contract Title" value={contractForm.title ?? ''} onChange={e => setContractForm((p: any) => ({ ...p, title: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
              <input placeholder="Counterparty" value={contractForm.counterparty ?? ''} onChange={e => setContractForm((p: any) => ({ ...p, counterparty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <select value={contractForm.contractType ?? 'nda'} onChange={e => setContractForm((p: any) => ({ ...p, contractType: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['nda', 'msa', 'sow', 'lease', 'employment', 'vendor', 'other'].map(t => <option key={t}>{t.toUpperCase()}</option>)}
              </select>
              <select value={contractForm.status ?? 'draft'} onChange={e => setContractForm((p: any) => ({ ...p, status: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['draft', 'review', 'active', 'expired', 'terminated'].map(s => <option key={s}>{s}</option>)}
              </select>
              <input type="number" placeholder="Value ($)" value={contractForm.value ?? ''} onChange={e => setContractForm((p: any) => ({ ...p, value: parseFloat(e.target.value) }))} className="border rounded-lg px-3 py-2 text-sm" />
              <div><label className="text-xs text-gray-500">Start Date</label><input type="date" value={contractForm.startDate ?? ''} onChange={e => setContractForm((p: any) => ({ ...p, startDate: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mt-1" /></div>
              <div><label className="text-xs text-gray-500">End Date</label><input type="date" value={contractForm.endDate ?? ''} onChange={e => setContractForm((p: any) => ({ ...p, endDate: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mt-1" /></div>
            </div>
            <button onClick={addContract} disabled={loading} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Add Contract</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Title', 'Type', 'Counterparty', 'Status', 'Value', 'Risk', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 uppercase text-xs">{c.contractType}</td>
                    <td className="px-4 py-3">{c.counterparty ?? '—'}</td>
                    <td className="px-4 py-3 capitalize">{c.status}</td>
                    <td className="px-4 py-3">{c.value ? `$${c.value.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${RISK_C[c.aiRiskLevel] ?? ''}`}>{c.aiRiskLevel} ({c.aiRiskScore})</span></td>
                    <td className="px-4 py-3"><button onClick={() => deleteContract(c.id)} className="text-xs text-red-500 hover:underline">Del</button></td>
                  </tr>
                ))}
                {contracts.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No contracts</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clauses */}
      {tab === 'clauses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Clause for Review</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={clauseForm.contractId ?? ''} onChange={e => setClauseForm((p: any) => ({ ...p, contractId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Select Contract</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <input placeholder="Clause Title" value={clauseForm.title ?? ''} onChange={e => setClauseForm((p: any) => ({ ...p, title: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <select value={clauseForm.clauseType ?? 'liability'} onChange={e => setClauseForm((p: any) => ({ ...p, clauseType: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['liability', 'indemnity', 'ip', 'termination', 'payment', 'confidentiality', 'dispute', 'other'].map(t => <option key={t}>{t}</option>)}
              </select>
              <textarea placeholder="Clause content (optional)" value={clauseForm.content ?? ''} onChange={e => setClauseForm((p: any) => ({ ...p, content: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-3 h-20" />
            </div>
            <button onClick={addClause} disabled={loading} className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">Analyze Clause</button>
          </div>
          <div className="space-y-3">
            {clauses.map(c => (
              <div key={c.id} className={`bg-white rounded-xl border p-4 ${c.flagged ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      {c.flagged && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">⚠ Flagged</span>}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">{c.clauseType} · {c.contract?.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full h-fit ${RISK_C[c.aiRiskLevel] ?? ''}`}>{c.aiRiskLevel} ({c.aiRiskScore})</span>
                </div>
                {c.aiAnnotation && <p className="text-sm text-indigo-700">AI: {c.aiAnnotation}</p>}
              </div>
            ))}
            {clauses.length === 0 && <div className="text-center py-12 text-gray-400">Add clauses to see AI analysis</div>}
          </div>
        </div>
      )}

      {/* Compliance */}
      {tab === 'compliance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Compliance Requirement</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={complianceForm.framework ?? 'gdpr'} onChange={e => setComplianceForm((p: any) => ({ ...p, framework: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['gdpr', 'hipaa', 'sox', 'iso27001', 'pci_dss', 'ccpa', 'other'].map(f => <option key={f}>{f.toUpperCase()}</option>)}
              </select>
              <input placeholder="Requirement" value={complianceForm.requirement ?? ''} onChange={e => setComplianceForm((p: any) => ({ ...p, requirement: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
              <select value={complianceForm.status ?? 'pending'} onChange={e => setComplianceForm((p: any) => ({ ...p, status: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['pending', 'compliant', 'non_compliant', 'na'].map(s => <option key={s}>{s}</option>)}
              </select>
              <div><label className="text-xs text-gray-500">Due Date</label><input type="date" value={complianceForm.dueDate ?? ''} onChange={e => setComplianceForm((p: any) => ({ ...p, dueDate: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mt-1" /></div>
            </div>
            <button onClick={addCompliance} disabled={loading} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Add Item</button>
          </div>
          <div className="space-y-2">
            {compliance.map(c => (
              <div key={c.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">{c.framework.toUpperCase()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STAT_C[c.status] ?? ''}`}>{c.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_C[c.aiRiskScore >= 70 ? 'critical' : c.aiRiskScore >= 40 ? 'high' : c.aiRiskScore >= 20 ? 'medium' : 'low'] ?? ''}`}>Risk: {c.aiRiskScore}</span>
                  </div>
                  <p className="text-sm font-medium">{c.requirement}</p>
                  {c.aiGuidance && <p className="text-xs text-indigo-700 mt-1">AI: {c.aiGuidance}</p>}
                </div>
                {c.status !== 'compliant' && (
                  <button onClick={() => markCompliant(c.id)} className="ml-4 text-xs text-green-600 hover:underline shrink-0">Mark Compliant</button>
                )}
              </div>
            ))}
            {compliance.length === 0 && <div className="text-center py-12 text-gray-400">No compliance items tracked</div>}
          </div>
        </div>
      )}

      {/* Insights */}
      {tab === 'insights' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">AI Legal Insights</h3>
            <button onClick={generateInsights} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Insights'}
            </button>
          </div>
          <div className="space-y-3">
            {insights.map(i => (
              <div key={i.id} className={`rounded-xl border p-4 ${i.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">{i.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${i.severity === 'critical' ? 'bg-red-100 text-red-800' : i.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>{i.severity}</span>
                </div>
                {i.summary && <p className="text-sm text-gray-600 mb-2">{i.summary}</p>}
                {Array.isArray(i.actionItems) && i.actionItems.map((a: string, idx: number) => <p key={idx} className="text-xs text-indigo-700">• {a}</p>)}
              </div>
            ))}
            {insights.length === 0 && <div className="text-center py-12 text-gray-400">Add contracts and compliance items, then generate insights</div>}
          </div>
        </div>
      )}
    </div>
  )
}
