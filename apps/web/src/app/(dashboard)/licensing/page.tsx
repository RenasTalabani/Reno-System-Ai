'use client'
import { useState, useEffect, useCallback } from 'react'
import { KeySquare, Plus, Trash2, RefreshCw, MonitorSmartphone, BadgeCheck } from 'lucide-react'

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

const TABS = ['Dashboard', 'Plans', 'License Keys', 'Entitlements', 'Usage']

export default function LicensingPage() {
  const api = useApi()
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [entitlements, setEntitlements] = useState<any[]>([])
  const [meters, setMeters] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 6000) }

  const load = useCallback(async () => {
    if (tab === 'Dashboard') { const d = await api.get('/licensing/dashboard'); setDashboard(d) }
    if (tab === 'Plans') { const d = await api.get('/licensing/plans'); setPlans(d.plans ?? []) }
    if (tab === 'License Keys') { const d = await api.get('/licensing/keys'); setKeys(d.keys ?? []) }
    if (tab === 'Entitlements') { const d = await api.get('/licensing/customers/acme-corp/entitlements'); setEntitlements(d.entitlements ?? []) }
    if (tab === 'Usage') { const d = await api.get('/licensing/customers/acme-corp/usage'); setMeters(d.meters ?? []) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { active: 'bg-green-100 text-green-700', issued: 'bg-blue-100 text-blue-700', suspended: 'bg-yellow-100 text-yellow-700', revoked: 'bg-red-100 text-red-700', expired: 'bg-gray-100 text-gray-500' }
    return m[s] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <KeySquare className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Licensing</h1>
            <p className="text-sm text-gray-500">Plans, license keys, seat activations, entitlements, and metered usage</p>
          </div>
        </div>
        <button type="button" title="Refresh" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm font-mono break-all">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-yellow-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Dashboard' && dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {([['Plans', dashboard.plans], ['Total Keys', dashboard.totalKeys], ['Active Keys', dashboard.activeKeys], ['Revoked', dashboard.revoked], ['Active Machines', dashboard.activeActivations], ['Total Seats', dashboard.totalSeats], ['Expiring 30d', dashboard.expiringSoon]] as [string, number][]).map(([l, v]) => (
            <div key={l} className="bg-white border rounded-xl p-5 text-center">
              <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Plans ({plans.length})</h2>
            <button type="button" onClick={() => api.post('/licensing/plans', { name: 'Professional', code: 'pro-' + Date.now(), tier: 'professional', priceMonthly: 99, priceYearly: 990, maxUsers: 50, features: ['ai-brain', 'reports', 'api-access'] }).then(() => { notify('Plan created'); load() })} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New Plan</button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {plans.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.tier}</span>
                    </div>
                    <p className="text-xs text-gray-400">${p.priceMonthly}/mo · ${p.priceYearly}/yr · {p.maxUsers} users · {p._count?.keys ?? 0} keys</p>
                    <p className="text-xs text-gray-400">{(p.features ?? []).join(', ')}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => api.post('/licensing/keys', { planId: p.id, customerRef: 'acme-corp', seats: 5, validDays: 365 }).then((r: any) => { notify('LICENSE (shown once): ' + r.licenseKey); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Issue Key</button>
                    <button type="button" onClick={() => api.remove('/licensing/plans/' + p.id).then(() => { notify('Deleted'); load() })} title="Delete" className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {plans.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">No plans</div>}
          </div>
        </div>
      )}

      {tab === 'License Keys' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">License Keys ({keys.length})</h2>
          <div className="grid gap-2">
            {keys.map((k: any) => (
              <div key={k.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{k.keyPrefix}…</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(k.status)}`}>{k.status}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{k.plan?.tier}</span>
                  </div>
                  <p className="text-xs text-gray-400">{k.customerRef} · {k._count?.activations ?? 0}/{k.seats} seats · expires {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'never'}</p>
                </div>
                <div className="flex gap-1">
                  {k.status === 'active' && <button type="button" onClick={() => api.post('/licensing/keys/' + k.id + '/suspend', {}).then(() => { notify('Suspended'); load() })} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Suspend</button>}
                  {k.status === 'suspended' && <button type="button" onClick={() => api.post('/licensing/keys/' + k.id + '/reinstate', {}).then(() => { notify('Reinstated'); load() })} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Reinstate</button>}
                  <button type="button" onClick={() => api.post('/licensing/keys/' + k.id + '/renew', { extendDays: 365, amount: 990 }).then((r: any) => { notify('Renewed to ' + new Date(r.newExpiry).toLocaleDateString()); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Renew</button>
                  {k.status !== 'revoked' && <button type="button" onClick={() => api.post('/licensing/keys/' + k.id + '/revoke', {}).then(() => { notify('Revoked'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Revoke</button>}
                  <button type="button" onClick={() => api.remove('/licensing/keys/' + k.id).then(() => { notify('Deleted'); load() })} title="Delete" className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {keys.length === 0 && <div className="text-center py-8 text-gray-400">No keys — issue one from a plan</div>}
          </div>
        </div>
      )}

      {tab === 'Entitlements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><BadgeCheck className="w-5 h-5" /> Entitlements — acme-corp ({entitlements.length})</h2>
            <button type="button" onClick={() => api.post('/licensing/entitlements', { customerRef: 'acme-corp', feature: 'advanced-analytics', enabled: true, source: 'addon' }).then(() => { notify('Entitlement granted'); load() })} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Grant Add-on</button>
          </div>
          <div className="grid gap-2">
            {entitlements.map((e: any) => (
              <div key={e.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{e.feature}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.enabled ? 'enabled' : 'disabled'}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{e.source}</span>
                </div>
                <button type="button" onClick={() => api.remove('/licensing/entitlements/' + e.id).then(() => { notify('Removed'); load() })} title="Delete" className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {entitlements.length === 0 && <div className="text-center py-8 text-gray-400">No entitlements — issue a key or grant an add-on</div>}
          </div>
        </div>
      )}

      {tab === 'Usage' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><MonitorSmartphone className="w-5 h-5" /> Metered Usage — acme-corp ({meters.length})</h2>
            <button type="button" onClick={() => api.post('/licensing/meters/record', { customerRef: 'acme-corp', meterType: 'ai-tokens', amount: 5000 }).then(() => { notify('Usage recorded'); load() })} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm">Record 5k Tokens</button>
          </div>
          <div className="grid gap-2">
            {meters.map((m: any) => (
              <div key={m.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{m.meterType}</span>
                  <p className="text-xs text-gray-400">{m.usedValue.toLocaleString()} used this period</p>
                </div>
                <button type="button" onClick={() => api.post('/licensing/meters/' + m.id + '/reset', {}).then(() => { notify('Reset'); load() })} className="text-xs bg-gray-100 px-2 py-1 rounded">Reset Period</button>
              </div>
            ))}
            {meters.length === 0 && <div className="text-center py-8 text-gray-400">No usage recorded</div>}
          </div>
        </div>
      )}
    </div>
  )
}
