'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'
const p = (path: string) => `${API}?path=${encodeURIComponent(path)}`

async function apiGet(path: string) { const r = await fetch(p(path)); return r.json() }
async function apiPost(path: string, body: any) { const r = await fetch(p(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json() }
async function apiPatch(path: string, body: any) { const r = await fetch(p(path), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json() }
async function apiDelete(path: string) { await fetch(p(path), { method: 'DELETE' }) }

const PERF_COLORS: Record<string, string> = { excellent: 'bg-green-100 text-green-800', good: 'bg-blue-100 text-blue-800', average: 'bg-yellow-100 text-yellow-800', below_avg: 'bg-orange-100 text-orange-800', poor: 'bg-red-100 text-red-800', unknown: 'bg-gray-100 text-gray-600' }
const GRADE_COLORS: Record<string, string> = { 'A+': 'text-green-600', 'A': 'text-green-500', 'B': 'text-blue-600', 'C': 'text-yellow-600', 'D': 'text-orange-600', 'F': 'text-red-600' }

export default function MarketingAIPage() {
  const [tab, setTab] = useState<'dashboard' | 'campaigns' | 'audiences' | 'content' | 'insights'>('dashboard')
  const [dash, setDash] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [audiences, setAudiences] = useState<any[]>([])
  const [contentScores, setContentScores] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [campForm, setCampForm] = useState<any>({})
  const [audForm, setAudForm] = useState<any>({})
  const [contentForm, setContentForm] = useState<any>({})

  const loadDash = useCallback(async () => { const d = await apiGet('/mki/dashboard'); setDash(d) }, [])
  const loadCampaigns = useCallback(async () => { const d = await apiGet('/mki/campaigns'); setCampaigns(Array.isArray(d) ? d : []) }, [])
  const loadAudiences = useCallback(async () => { const d = await apiGet('/mki/audiences'); setAudiences(Array.isArray(d) ? d : []) }, [])
  const loadContent = useCallback(async () => { const d = await apiGet('/mki/content-scores'); setContentScores(Array.isArray(d) ? d : []) }, [])
  const loadInsights = useCallback(async () => { const d = await apiGet('/mki/insights'); setInsights(Array.isArray(d) ? d : []) }, [])

  useEffect(() => { loadDash() }, [loadDash])
  useEffect(() => {
    if (tab === 'campaigns') loadCampaigns()
    else if (tab === 'audiences') loadAudiences()
    else if (tab === 'content') loadContent()
    else if (tab === 'insights') loadInsights()
  }, [tab, loadCampaigns, loadAudiences, loadContent, loadInsights])

  const addCampaign = async () => {
    if (!campForm.name) return
    setLoading(true)
    await apiPost('/mki/campaigns', campForm)
    setCampForm({})
    await loadCampaigns()
    setLoading(false)
  }

  const analyzeCampaign = async (id: string) => {
    setLoading(true)
    await apiPost(`/mki/campaigns/${id}/analyze`, {})
    await loadCampaigns()
    setLoading(false)
  }

  const deleteCampaign = async (id: string) => {
    await apiDelete(`/mki/campaigns/${id}`)
    await loadCampaigns()
  }

  const addAudience = async () => {
    if (!audForm.name) return
    setLoading(true)
    await apiPost('/mki/audiences', audForm)
    setAudForm({})
    await loadAudiences()
    setLoading(false)
  }

  const scoreContent = async () => {
    if (!contentForm.title) return
    setLoading(true)
    await apiPost('/mki/content-scores', contentForm)
    setContentForm({})
    await loadContent()
    setLoading(false)
  }

  const generateInsights = async () => {
    setLoading(true)
    await apiPost('/mki/insights/generate', {})
    await loadInsights()
    setLoading(false)
  }

  const tabs = ['dashboard', 'campaigns', 'audiences', 'content', 'insights'] as const

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">AI Marketing Intelligence</h1>
      <p className="text-sm text-gray-500 mb-6">Campaign optimizer, audience scoring & content AI</p>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Campaigns', value: dash.kpis?.totalCampaigns ?? 0 },
              { label: 'Total Revenue', value: `$${(dash.kpis?.totalRevenue ?? 0).toLocaleString()}` },
              { label: 'Overall ROI', value: `${dash.kpis?.overallRoi ?? 0}%`, green: (dash.kpis?.overallRoi ?? 0) > 0 },
              { label: 'Avg AI Score', value: `${dash.kpis?.avgRoiScore ?? 0}/100` },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.green ? 'text-green-600' : 'text-indigo-600'}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Top Campaigns</h3>
              {dash.topCampaigns?.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center mb-2 p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.channel} · ${c.revenue.toLocaleString()} revenue</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PERF_COLORS[c.aiPerformance] ?? ''}`}>{c.aiPerformance}</span>
                </div>
              ))}
              {!dash.topCampaigns?.length && <p className="text-sm text-gray-400">No campaigns yet</p>}
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">AI Insights</h3>
              {dash.insights?.map((i: any) => (
                <div key={i.id} className="mb-2 p-3 rounded-lg bg-indigo-50">
                  <p className="text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{i.summary}</p>
                </div>
              ))}
              {!dash.insights?.length && <p className="text-sm text-gray-400">Generate insights to see them here</p>}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">New Campaign</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="Campaign Name" value={campForm.name ?? ''} onChange={e => setCampForm((p: any) => ({ ...p, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
              <select value={campForm.channel ?? 'email'} onChange={e => setCampForm((p: any) => ({ ...p, channel: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['email', 'social', 'paid', 'seo', 'content'].map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={campForm.status ?? 'draft'} onChange={e => setCampForm((p: any) => ({ ...p, status: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['draft', 'active', 'paused', 'completed'].map(s => <option key={s}>{s}</option>)}
              </select>
              {[['budget', 'Budget ($)'], ['spent', 'Spent ($)'], ['impressions', 'Impressions'], ['clicks', 'Clicks'], ['conversions', 'Conversions'], ['revenue', 'Revenue ($)']].map(([f, label]) => (
                <input key={f} type="number" placeholder={label} value={campForm[f] ?? ''} onChange={e => setCampForm((p: any) => ({ ...p, [f]: parseFloat(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
              ))}
            </div>
            <button onClick={addCampaign} disabled={loading} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Add Campaign</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Name', 'Channel', 'Budget', 'Revenue', 'ROI Score', 'AI Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 capitalize">{c.channel}</td>
                    <td className="px-4 py-3">${c.budget.toLocaleString()}</td>
                    <td className="px-4 py-3">${c.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">{c.aiRoiScore}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PERF_COLORS[c.aiPerformance] ?? ''}`}>{c.aiPerformance}</span></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => analyzeCampaign(c.id)} className="text-xs text-indigo-600 hover:underline">Analyze</button>
                      <button onClick={() => deleteCampaign(c.id)} className="text-xs text-red-500 hover:underline">Del</button>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No campaigns yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audiences */}
      {tab === 'audiences' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">New Audience Segment</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Segment Name" value={audForm.name ?? ''} onChange={e => setAudForm((p: any) => ({ ...p, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <select value={audForm.segmentType ?? 'behavioral'} onChange={e => setAudForm((p: any) => ({ ...p, segmentType: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['behavioral', 'demographic', 'lookalike', 'retargeting', 'interest'].map(s => <option key={s}>{s}</option>)}
              </select>
              <input type="number" placeholder="Audience Size" value={audForm.size ?? ''} onChange={e => setAudForm((p: any) => ({ ...p, size: parseInt(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Engagement Rate %" value={audForm.engagementRate ?? ''} onChange={e => setAudForm((p: any) => ({ ...p, engagementRate: parseFloat(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Conversion Rate %" value={audForm.conversionRate ?? ''} onChange={e => setAudForm((p: any) => ({ ...p, conversionRate: parseFloat(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={addAudience} disabled={loading} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Add Segment</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiences.map(a => (
              <div key={a.id} className="bg-white rounded-xl border p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">{a.name}</span>
                  <span className="text-2xl font-bold text-indigo-600">{a.aiScore}</span>
                </div>
                <p className="text-xs text-gray-500 capitalize mb-2">{a.segmentType} · {a.size.toLocaleString()} people</p>
                <p className="text-xs text-gray-500">Eng: {a.engagementRate}% · CVR: {a.conversionRate}%</p>
                {Array.isArray(a.aiInsights) && a.aiInsights.map((ins: string, i: number) => (
                  <p key={i} className="text-xs text-indigo-700 mt-1">• {ins}</p>
                ))}
              </div>
            ))}
            {audiences.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No audience segments yet</div>}
          </div>
        </div>
      )}

      {/* Content Scoring */}
      {tab === 'content' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Score Content</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Content Title" value={contentForm.title ?? ''} onChange={e => setContentForm((p: any) => ({ ...p, title: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
              <select value={contentForm.contentType ?? 'blog'} onChange={e => setContentForm((p: any) => ({ ...p, contentType: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['blog', 'email', 'social', 'video', 'ad'].map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={contentForm.channel ?? 'web'} onChange={e => setContentForm((p: any) => ({ ...p, channel: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['web', 'seo', 'social', 'email', 'paid'].map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Word Count" value={contentForm.wordCount ?? ''} onChange={e => setContentForm((p: any) => ({ ...p, wordCount: parseInt(e.target.value) || 0 }))} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={scoreContent} disabled={loading} className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
              {loading ? 'Scoring...' : 'Score Content'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentScores.map(cs => (
              <div key={cs.id} className="bg-white rounded-xl border p-4">
                <div className="flex justify-between mb-3">
                  <div>
                    <p className="font-medium text-sm">{cs.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{cs.contentType} · {cs.channel}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-bold ${GRADE_COLORS[cs.aiGrade] ?? 'text-gray-600'}`}>{cs.aiGrade}</span>
                    <p className="text-xs text-gray-400">{cs.aiOverallScore}/100</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['SEO', cs.seoScore], ['Readability', cs.readabilityScore], ['Engagement', cs.engagementScore]].map(([label, score]) => (
                    <div key={label as string} className="text-center bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-lg font-semibold">{score}</p>
                    </div>
                  ))}
                </div>
                {Array.isArray(cs.aiSuggestions) && cs.aiSuggestions.slice(0, 2).map((s: string, i: number) => (
                  <p key={i} className="text-xs text-indigo-700">• {s}</p>
                ))}
              </div>
            ))}
            {contentScores.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">Score content to see AI analysis</div>}
          </div>
        </div>
      )}

      {/* Insights */}
      {tab === 'insights' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">AI Marketing Insights</h3>
            <button onClick={generateInsights} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Insights'}
            </button>
          </div>
          <div className="space-y-3">
            {insights.map(i => (
              <div key={i.id} className="bg-white rounded-xl border p-4">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-sm">{i.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${i.impact === 'high' ? 'bg-red-100 text-red-800' : i.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{i.impact}</span>
                </div>
                {i.summary && <p className="text-sm text-gray-600 mb-2">{i.summary}</p>}
                {Array.isArray(i.actionItems) && i.actionItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Action Items:</p>
                    {i.actionItems.map((a: string, idx: number) => <p key={idx} className="text-xs text-indigo-700">• {a}</p>)}
                  </div>
                )}
              </div>
            ))}
            {insights.length === 0 && <div className="text-center py-12 text-gray-400">No insights yet — add campaigns and generate</div>}
          </div>
        </div>
      )}
    </div>
  )
}
