'use client'
import { useState, useEffect, useCallback } from 'react'
import { Award, Plus, Trash2, RefreshCw, ShieldCheck, Medal, ScrollText } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as HeadersInit }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as HeadersInit }).then(r => r.json())
  return { get, post, remove }
}

const TABS = ['Dashboard', 'Programs', 'Certificates', 'Badges', 'Audit Trail']
const LEVEL_COLOR: Record<string, string> = { bronze: 'bg-orange-100 text-orange-700', silver: 'bg-gray-200 text-gray-700', gold: 'bg-yellow-100 text-yellow-700', platinum: 'bg-purple-100 text-purple-700' }

export default function CertificationPage() {
  const api = useApi()
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [assessments, setAssessments] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [trail, setTrail] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  const load = useCallback(async () => {
    if (tab === 'Dashboard') { const d = await api.get('/certification/dashboard'); setDashboard(d) }
    if (tab === 'Programs') {
      const d = await api.get('/certification/programs'); setPrograms(d.programs ?? [])
      if (selected) { const a = await api.get('/certification/programs/' + selected.id + '/assessments'); setAssessments(a.assessments ?? []) }
    }
    if (tab === 'Certificates') { const d = await api.get('/certification/certificates'); setCertificates(d.certificates ?? []) }
    if (tab === 'Badges') { const d = await api.get('/certification/badges'); setBadges(d.badges ?? []) }
    if (tab === 'Audit Trail') { const d = await api.get('/certification/audit-trail'); setTrail(d.trail ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Certification</h1>
            <p className="text-sm text-gray-500">Enterprise readiness scoring across security, compliance, AI governance, licensing, and release quality</p>
          </div>
        </div>
        <button type="button" title="Refresh" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className={`rounded-2xl p-8 text-center border ${dashboard.overallStatus === 'certified' ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
            <ShieldCheck className="w-10 h-10 mx-auto mb-2" />
            <p className="text-3xl font-bold uppercase">{dashboard.overallStatus.replace('-', ' ')}</p>
            {dashboard.latestScore != null && <p className="text-sm text-gray-500 mt-2">Latest assessment score: {dashboard.latestScore}%</p>}
            {dashboard.highestLevel && <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full ${LEVEL_COLOR[dashboard.highestLevel]}`}>{dashboard.highestLevel} certified</span>}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Programs', dashboard.programs], ['Assessments Run', dashboard.totalAssessments], ['Active Certificates', dashboard.activeCertificates], ['Badges Earned', dashboard.badges]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Programs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Programs ({programs.length})</h2>
            <button type="button" onClick={() => api.post('/certification/programs/seed-enterprise', {}).then((r: any) => { notify('Enterprise program seeded with ' + r.criteriaCreated + ' criteria'); load() })} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Seed Enterprise Program</button>
          </div>
          <div className="grid gap-2">
            {programs.map((p: any) => (
              <div key={p.id} onClick={() => setSelected(p)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === p.id ? 'border-purple-400 bg-purple-50' : 'hover:border-purple-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_COLOR[p.level]}`}>{p.level}</span>
                    </div>
                    <p className="text-xs text-gray-400">{p._count?.criteria ?? 0} criteria · {p._count?.assessments ?? 0} assessments</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/certification/programs/' + p.id + '/assess', {}).then((r: any) => { notify('Assessed: ' + r.overallScore + '% — ' + (r.passed ? 'PASSED' : 'not passed')); load() }) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Run Assessment</button>
                    <button type="button" title="Delete" onClick={e => { e.stopPropagation(); api.remove('/certification/programs/' + p.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {programs.length === 0 && <div className="text-center py-12 text-gray-400">No programs — seed the enterprise program</div>}
          </div>

          {selected && (
            <div className="space-y-2">
              <h3 className="font-semibold">Assessments for {selected.name}</h3>
              {assessments.map((a: any) => (
                <div key={a.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.passed ? 'PASSED' : 'FAILED'}</span>
                      <span className="text-sm font-medium">{a.overallScore}%</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(a.domainScores ?? {}).map(([d, s]: any) => (
                        <span key={d} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d}: {s}%</span>
                      ))}
                    </div>
                  </div>
                  {a.passed && a.status === 'completed' && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => api.post('/certification/assessments/' + a.id + '/issue-certificate', { issuedTo: 'Reno System Ai' }).then((r: any) => { notify(r.error ?? 'Issued ' + r.certNumber + ' (' + r.level + ')'); load() })} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Issue Cert</button>
                      <button type="button" onClick={() => api.post('/certification/assessments/' + a.id + '/auto-award-badges', {}).then((r: any) => { notify('Awarded ' + r.awarded + ' badges'); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Auto-Badges</button>
                    </div>
                  )}
                </div>
              ))}
              {assessments.length === 0 && <p className="text-sm text-gray-400">No assessments run yet</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'Certificates' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Certificates ({certificates.length})</h2>
          <div className="grid gap-2">
            {certificates.map((c: any) => (
              <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{c.certNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_COLOR[c.level]}`}>{c.level}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{c.issuedTo} · expires {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'never'}</p>
                </div>
                <div className="flex gap-1">
                  {c.status === 'active' && <>
                    <button type="button" onClick={() => api.post('/certification/certificates/' + c.id + '/renew', { extendDays: 365 }).then(() => { notify('Renewed'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Renew</button>
                    <button type="button" onClick={() => api.post('/certification/certificates/' + c.id + '/revoke', {}).then(() => { notify('Revoked (audited)'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Revoke</button>
                  </>}
                  <button type="button" title="Delete" onClick={() => api.remove('/certification/certificates/' + c.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {certificates.length === 0 && <div className="text-center py-8 text-gray-400">No certificates issued</div>}
          </div>
        </div>
      )}

      {tab === 'Badges' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Medal className="w-5 h-5 text-yellow-500" /> Badges ({badges.length})</h2>
          <div className="grid gap-2 md:grid-cols-3">
            {badges.map((b: any) => (
              <div key={b.id} className="bg-white border rounded-xl p-4 text-center space-y-2">
                <Medal className="w-8 h-8 mx-auto text-yellow-500" />
                <p className="font-medium text-sm">{b.name}</p>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{b.domain}</span>
              </div>
            ))}
            {badges.length === 0 && <div className="col-span-3 text-center py-8 text-gray-400">No badges yet</div>}
          </div>
        </div>
      )}

      {tab === 'Audit Trail' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><ScrollText className="w-5 h-5" /> Audit Trail ({trail.length})</h2>
          <div className="bg-white border rounded-xl divide-y">
            {trail.map((t: any) => (
              <div key={t.id} className="p-3 flex items-center justify-between text-sm">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{t.action}</span>
                <span className="text-gray-500">{t.detail}</span>
                <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {trail.length === 0 && <div className="text-center py-8 text-gray-400">No audit events</div>}
          </div>
        </div>
      )}
    </div>
  )
}
