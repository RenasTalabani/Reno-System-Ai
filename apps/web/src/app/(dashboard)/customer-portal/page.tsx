'use client'
import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Trash2, RefreshCw, Megaphone, LifeBuoy, Receipt } from 'lucide-react'

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

const TABS = ['Dashboard', 'Accounts', 'Invoices', 'Support', 'Announcements']

export default function CustomerPortalPage() {
  const api = useApi()
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [support, setSupport] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const load = useCallback(async () => {
    if (tab === 'Dashboard') { const d = await api.get('/customer-portal/dashboard'); setDashboard(d) }
    if (tab === 'Accounts') { const d = await api.get('/customer-portal/accounts'); setAccounts(d.accounts ?? []) }
    if (tab === 'Invoices' && selected) { const d = await api.get('/customer-portal/accounts/' + selected.id + '/invoices'); setInvoices(d.invoices ?? []) }
    if (tab === 'Support') { const d = await api.get('/customer-portal/support'); setSupport(d.requests ?? []) }
    if (tab === 'Announcements') { const d = await api.get('/customer-portal/announcements'); setAnnouncements(d.announcements ?? []) }
  }, [tab, selected])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { active: 'bg-green-100 text-green-700', trial: 'bg-blue-100 text-blue-700', 'past-due': 'bg-red-100 text-red-700', churned: 'bg-gray-100 text-gray-500', paid: 'bg-green-100 text-green-700', open: 'bg-yellow-100 text-yellow-700', overdue: 'bg-red-100 text-red-700', resolved: 'bg-green-100 text-green-700', 'in-progress': 'bg-blue-100 text-blue-700' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
            <p className="text-sm text-gray-500">Commercial accounts, subscriptions, invoices, support, and announcements</p>
          </div>
        </div>
        <button type="button" title="Refresh" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.companyName} · MRR ${selected.mrr}</span>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-blue-500">Clear</button>
        </div>
      )}

      {tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold text-blue-600">${dashboard.totalMrr?.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">MRR</p>
            </div>
            <div className="bg-white border rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold text-green-600">${dashboard.arr?.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">ARR</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Accounts', dashboard.accounts], ['Active', dashboard.activeAccounts], ['Trial', dashboard.trialAccounts], ['Past Due', dashboard.pastDue], ['Outstanding $', dashboard.outstandingAmount], ['Open Invoices', dashboard.outstandingInvoices], ['Open Support', dashboard.openSupport]] as [string, any][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{typeof v === 'number' ? v.toLocaleString() : v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Accounts ({accounts.length})</h2>
            <button type="button" onClick={() => api.post('/customer-portal/accounts', { companyName: 'Company ' + Date.now(), slug: 'co-' + Date.now(), industry: 'SaaS' }).then(() => { notify('Account created (trial)'); load() })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Account</button>
          </div>
          <div className="grid gap-2">
            {accounts.map((a: any) => (
              <div key={a.id} onClick={() => setSelected(a)} className={`bg-white border rounded-xl p-4 cursor-pointer ${selected?.id === a.id ? 'border-blue-400 bg-blue-50' : 'hover:border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.companyName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
                      <span className="text-xs text-gray-400">health {a.healthScore?.toFixed(0)}</span>
                    </div>
                    <p className="text-xs text-gray-400">MRR ${a.mrr} · {a._count?.contacts ?? 0} contacts · {a._count?.subscriptions ?? 0} subs · {a._count?.supportRequests ?? 0} tickets</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/customer-portal/accounts/' + a.id + '/subscriptions', { planRef: 'professional', billingCycle: 'monthly', amount: 99 }).then(() => { notify('Subscription started — account active'); load() }) }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Subscribe</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/customer-portal/accounts/' + a.id + '/invoices', { amount: 99, lineItems: [{ desc: 'Professional plan', qty: 1, price: 99 }] }).then((r: any) => { notify('Invoice ' + r.invoiceNo); load() }) }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Invoice</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.post('/customer-portal/accounts/' + a.id + '/health', {}).then((r: any) => { notify('Health: ' + r.healthScore); load() }) }} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Score</button>
                    <button type="button" title="Delete" onClick={e => { e.stopPropagation(); api.remove('/customer-portal/accounts/' + a.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {accounts.length === 0 && <div className="text-center py-12 text-gray-400">No accounts</div>}
          </div>
        </div>
      )}

      {tab === 'Invoices' && (
        <div className="space-y-4">
          {!selected ? <div className="text-center py-12 text-gray-400">Select an account first</div> : (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Receipt className="w-5 h-5" /> Invoices — {selected.companyName} ({invoices.length})</h2>
              <div className="grid gap-2">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{inv.invoiceNo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>{inv.status}</span>
                      </div>
                      <p className="text-xs text-gray-400">${inv.amount} {inv.currency} · due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</p>
                    </div>
                    {inv.status !== 'paid' && <button type="button" onClick={() => api.post('/customer-portal/invoices/' + inv.id + '/pay', {}).then(() => { notify('Paid'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Mark Paid</button>}
                  </div>
                ))}
                {invoices.length === 0 && <div className="text-center py-8 text-gray-400">No invoices</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Support' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><LifeBuoy className="w-5 h-5" /> Support ({support.length})</h2>
            {selected && <button type="button" onClick={() => api.post('/customer-portal/accounts/' + selected.id + '/support', { subject: 'Need onboarding help', body: 'How do we import data?', priority: 'high' }).then(() => { notify('Ticket opened'); load() })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Open Ticket</button>}
          </div>
          <div className="grid gap-2">
            {support.map((sr: any) => (
              <div key={sr.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sr.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(sr.status)}`}>{sr.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{sr.priority}</span>
                      <span className="text-xs text-gray-400">{sr.account?.companyName}</span>
                    </div>
                    <p className="text-xs text-gray-400">{(sr.replies ?? []).length} replies</p>
                  </div>
                  <div className="flex gap-1">
                    {sr.status !== 'resolved' && <>
                      <button type="button" onClick={() => api.post('/customer-portal/support/' + sr.id + '/reply', { message: 'We are looking into this.', from: 'support' }).then(() => { notify('Replied'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Reply</button>
                      <button type="button" onClick={() => api.post('/customer-portal/support/' + sr.id + '/resolve', {}).then(() => { notify('Resolved'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolve</button>
                    </>}
                    <button type="button" title="Delete" onClick={() => api.remove('/customer-portal/support/' + sr.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {support.length === 0 && <div className="text-center py-8 text-gray-400">No support requests</div>}
          </div>
        </div>
      )}

      {tab === 'Announcements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Megaphone className="w-5 h-5" /> Announcements ({announcements.length})</h2>
            <button type="button" onClick={() => api.post('/customer-portal/announcements', { title: 'New release ' + new Date().toLocaleDateString(), body: 'Reno v1.0 is here with 100 modules.', audience: 'all' }).then(() => { notify('Created (draft)'); load() })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New</button>
          </div>
          <div className="grid gap-2">
            {announcements.map((an: any) => (
              <div key={an.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{an.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${an.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{an.isPublished ? 'published' : 'draft'}</span>
                  </div>
                  <p className="text-xs text-gray-500">{an.body}</p>
                </div>
                <div className="flex gap-1">
                  {!an.isPublished && <button type="button" onClick={() => api.post('/customer-portal/announcements/' + an.id + '/publish', {}).then(() => { notify('Published'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Publish</button>}
                  <button type="button" title="Delete" onClick={() => api.remove('/customer-portal/announcements/' + an.id).then(() => { notify('Deleted'); load() })} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {announcements.length === 0 && <div className="text-center py-8 text-gray-400">No announcements</div>}
          </div>
        </div>
      )}
    </div>
  )
}
