'use client'
import { useState, useEffect, useCallback } from 'react'
import { Gavel, Plus, Trash2, RefreshCw, FileCheck2, Database, UserCheck } from 'lucide-react'

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

const TABS = ['Dashboard', 'Regulations', 'Assessments', 'Data Processing', 'Consents']

export default function AiCompliancePage() {
  const api = useApi()
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [regulations, setRegulations] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [processing, setProcessing] = useState<any[]>([])
  const [consents, setConsents] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Dashboard') { const d = await api.get('/ai-compliance/dashboard'); setDashboard(d) }
    if (tab === 'Regulations') {
      const d = await api.get('/ai-compliance/regulations'); setRegulations(d.regulations ?? [])
      if (selected) { const rq = await api.get('/ai-compliance/regulations/' + selected.id + '/requirements'); setRequirements(rq.requirements ?? []) }
    }
    if (tab === 'Assessments') { const d = await api.get('/ai-compliance/assessments'); setAssessments(d.assessments ?? []) }
    if (tab === 'Data Processing') { const d = await api.get('/ai-compliance/data-processing'); setProcessing(d.activities ?? []) }
    if (tab === 'Consents') { const d = await api.get('/ai-compliance/subjects/customer-001/consents'); setConsents(d.consents ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { compliant: 'bg-green-100 text-green-700', partial: 'bg-yellow-100 text-yellow-700', 'non-compliant': 'bg-red-100 text-red-700', 'not-assessed': 'bg-gray-100 text-gray-500', completed: 'bg-green-100 text-green-700', 'in-progress': 'bg-blue-100 text-blue-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }
  const riskColor = (r: string) => {
    const m: Record<string, string> = { minimal: 'bg-green-100 text-green-700', limited: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', unacceptable: 'bg-red-100 text-red-700' }
    return m[r] ?? 'bg-gray-100'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Gavel className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Compliance</h1>
            <p className="text-sm text-gray-500">EU AI Act, requirements, conformity assessments, RoPA, and consent</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-5xl font-bold text-emerald-600">{dashboard.overallCompliancePct}%</p>
            <p className="text-lg mt-2">Overall Compliance</p>
            <p className={`text-sm mt-1 ${dashboard.complianceStatus === 'on-track' ? 'text-green-600' : 'text-orange-600'}`}>{dashboard.complianceStatus.replace('-', ' ')}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Regulations', dashboard.regulations], ['Requirements', dashboard.totalRequirements], ['Compliant', dashboard.compliantRequirements], ['Assessments', dashboard.assessments], ['DPIA Gaps', dashboard.dpiaGaps], ['Active Consents', dashboard.activeConsents], ['High-Risk Processing', dashboard.highRiskProcessing]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Regulations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Regulations ({regulations.length})</h2>
            <button type="button" onClick={() => api.post('/ai-compliance/regulations/seed-eu-ai-act', {}).then((r: any) => { notify('EU AI Act seeded (' + r.requirementsCreated + ' articles)'); load() })} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Seed EU AI Act</button>
          </div>
          <div className="grid gap-3">
            {regulations.map((reg: any) => (
              <div key={reg.id} onClick={() => setSelected(reg)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === reg.id ? 'border-emerald-400 bg-emerald-50' : 'hover:border-emerald-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{reg.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{reg.jurisdiction}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${riskColor(reg.riskCategory)}`}>{reg.riskCategory} risk</span>
                    </div>
                    <p className="text-xs text-gray-400">{reg._count?.requirements ?? 0} requirements</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); api.remove('/ai-compliance/regulations/' + reg.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {regulations.length === 0 && <div className="text-center py-8 text-gray-400">No regulations — seed EU AI Act</div>}
          </div>
          {selected && requirements.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Requirements — {selected.name}</h3>
              {requirements.map((q: any) => (
                <div key={q.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{q.code}</span>
                    <span className="text-sm">{q.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(q.complianceStatus)}`}>{q.complianceStatus}</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => api.patch('/ai-compliance/requirements/' + q.id, { complianceStatus: 'compliant' }).then(() => { notify('Marked compliant'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Compliant</button>
                    <button type="button" onClick={() => api.patch('/ai-compliance/requirements/' + q.id, { complianceStatus: 'partial' }).then(() => { notify('Marked partial'); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Partial</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Assessments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><FileCheck2 className="w-5 h-5" /> Assessments ({assessments.length})</h2>
            <button type="button" onClick={() => api.post('/ai-compliance/assessments', { systemName: 'Reno Brain', assessmentType: 'conformity', riskLevel: 'high' }).then((r: any) => { api.post('/ai-compliance/assessments/' + r.id + '/complete', {}).then((c: any) => { notify('Assessment scored: ' + c.score); load() }) })} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Run Assessment</button>
          </div>
          <div className="grid gap-2">
            {assessments.map((a: any) => (
              <div key={a.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.systemName}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a.assessmentType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${riskColor(a.riskLevel)}`}>{a.riskLevel}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
                  </div>
                  {a.score != null && <p className="text-xs text-gray-400">Score: {a.score}%</p>}
                </div>
                <button type="button" onClick={() => api.remove('/ai-compliance/assessments/' + a.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {assessments.length === 0 && <div className="text-center py-8 text-gray-400">No assessments</div>}
          </div>
        </div>
      )}

      {tab === 'Data Processing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Database className="w-5 h-5" /> Records of Processing ({processing.length})</h2>
            <button type="button" onClick={() => api.post('/ai-compliance/data-processing', { activityName: 'AI training data', purpose: 'Improve model quality', legalBasis: 'legitimate-interest', dataCategories: ['usage-logs'], isHighRisk: true }).then(() => { notify('Activity registered'); load() })} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Activity</button>
          </div>
          <div className="grid gap-2">
            {processing.map((a: any) => (
              <div key={a.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.activityName}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a.legalBasis}</span>
                    {a.isHighRisk && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">high risk</span>}
                    {a.isHighRisk && (a.dpiaCompleted ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">DPIA ✓</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">DPIA needed</span>)}
                  </div>
                  <p className="text-xs text-gray-400">{a.purpose} · retain {a.retentionDays}d</p>
                </div>
                <div className="flex gap-1">
                  {a.isHighRisk && !a.dpiaCompleted && <button type="button" onClick={() => api.post('/ai-compliance/data-processing/' + a.id + '/dpia', {}).then(() => { notify('DPIA completed'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Complete DPIA</button>}
                  <button type="button" onClick={() => api.remove('/ai-compliance/data-processing/' + a.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {processing.length === 0 && <div className="text-center py-8 text-gray-400">No processing activities</div>}
          </div>
        </div>
      )}

      {tab === 'Consents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><UserCheck className="w-5 h-5" /> Consents — customer-001 ({consents.length})</h2>
            <button type="button" onClick={() => api.post('/ai-compliance/consents', { subjectRef: 'customer-001', purpose: 'AI personalization' }).then(() => { notify('Consent recorded'); load() })} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Record Consent</button>
          </div>
          <div className="grid gap-2">
            {consents.map((c: any) => (
              <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.purpose}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.granted ? 'granted' : 'revoked'}</span>
                  </div>
                  <p className="text-xs text-gray-400">Granted {new Date(c.grantedAt).toLocaleDateString()}{c.revokedAt && ' · revoked ' + new Date(c.revokedAt).toLocaleDateString()}</p>
                </div>
                {c.granted && <button type="button" onClick={() => api.post('/ai-compliance/consents/' + c.id + '/revoke', {}).then(() => { notify('Consent revoked'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Revoke</button>}
              </div>
            ))}
            {consents.length === 0 && <div className="text-center py-8 text-gray-400">No consents for this subject</div>}
          </div>
        </div>
      )}
    </div>
  )
}
