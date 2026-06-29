'use client'

import { useState, useEffect } from 'react'
import { Key, Webhook, Plus, Copy, Trash2, Check, AlertCircle, BarChart3, Power } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface ApiKey { id: string; name: string; keyPrefix: string; status: string; scopes: string[]; rateLimit: number; rateWindow: string; totalCalls: number; lastUsedAt: string | null; expiresAt: string | null; rawKey?: string }
interface Webhook { id: string; name: string; url: string; events: string[]; status: string; lastFired: string | null; lastStatus: number | null }
interface Dashboard { activeKeys: number; activeWebhooks: number; totalCalls: number }

type Tab = 'keys' | 'webhooks' | 'usage'

export default function ApiGatewayPage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<Tab>('keys')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = () => {
    fetch(`${API}/v1/api-gateway/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setDashboard(d.data))
    if (tab === 'keys') fetch(`${API}/v1/api-gateway/keys`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setKeys(d.data ?? []))
    if (tab === 'webhooks') fetch(`${API}/v1/api-gateway/webhooks`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setWebhooks(d.data ?? []))
  }

  useEffect(() => { load() }, [tab, token])

  const createKey = async () => {
    const res = await fetch(`${API}/v1/api-gateway/keys`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, rateLimit: parseInt(form.rateLimit ?? '1000') }) }).then(r => r.json())
    if (res.data) { setNewKey(res.data); setKeys(k => [res.data, ...k]); setShowCreate(false); setForm({}) }
  }

  const revokeKey = async (id: string) => {
    await fetch(`${API}/v1/api-gateway/keys/${id}/revoke`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setKeys(k => k.map(x => x.id === id ? { ...x, status: 'revoked' } : x))
  }

  const createWebhook = async () => {
    const res = await fetch(`${API}/v1/api-gateway/webhooks`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, events: form.events ? form.events.split(',').map(e => e.trim()) : [] }) }).then(r => r.json())
    if (res.data) { setWebhooks(w => [res.data, ...w]); setShowCreate(false); setForm({}) }
  }

  const deleteWebhook = async (id: string) => {
    await fetch(`${API}/v1/api-gateway/webhooks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setWebhooks(w => w.filter(x => x.id !== id))
  }

  const testWebhook = async (id: string) => {
    await fetch(`${API}/v1/api-gateway/webhooks/${id}/test`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-500" /> API Gateway
        </h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> {tab === 'keys' ? 'New API Key' : 'New Webhook'}
        </button>
      </div>

      {dashboard && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active API Keys', value: dashboard.activeKeys },
            { label: 'Active Webhooks', value: dashboard.activeWebhooks },
            { label: 'Total API Calls', value: dashboard.totalCalls.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {newKey?.rawKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-400 mb-2">Save this key — it will only be shown once</p>
          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 font-mono text-xs text-foreground">
            <span className="flex-1 truncate">{newKey.rawKey}</span>
            <button onClick={() => copyKey(newKey.rawKey!)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-muted-foreground hover:text-foreground mt-2">Dismiss</button>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {(['keys', 'webhooks'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t === 'keys' ? 'API Keys' : 'Webhooks'}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {tab === 'keys' && keys.map(k => (
          <div key={k.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${k.status === 'revoked' ? 'opacity-50' : 'border-border'}`}>
            <Key className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-medium text-foreground text-sm">{k.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${k.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{k.status}</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}... · {Number(k.totalCalls).toLocaleString()} calls · {k.rateLimit}/{k.rateWindow}</p>
            </div>
            {k.status === 'active' && (
              <button onClick={() => revokeKey(k.id)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors">Revoke</button>
            )}
          </div>
        ))}

        {tab === 'webhooks' && webhooks.map(w => (
          <div key={w.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <Webhook className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-medium text-foreground text-sm">{w.name}</p>
                {w.lastStatus && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${w.lastStatus < 300 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{w.lastStatus}</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{w.url}</p>
              <p className="text-xs text-muted-foreground">{(w.events as string[]).join(', ') || 'No events'}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => testWebhook(w.id)} className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg transition-colors">Test</button>
              <button onClick={() => deleteWebhook(w.id)} className="p-1.5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {((tab === 'keys' && !keys.length) || (tab === 'webhooks' && !webhooks.length)) && (
          <p className="text-center py-12 text-muted-foreground text-sm">No {tab === 'keys' ? 'API keys' : 'webhooks'} yet</p>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">{tab === 'keys' ? 'Create API Key' : 'Add Webhook'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Name</label>
                <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
              {tab === 'keys' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Rate Limit</label>
                    <input type="number" value={form.rateLimit ?? '1000'} onChange={e => setForm(f => ({ ...f, rateLimit: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Window</label>
                    <select value={form.rateWindow ?? '1h'} onChange={e => setForm(f => ({ ...f, rateWindow: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                      {['1m','15m','1h','24h'].map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">URL</label>
                    <input value={form.url ?? ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..."
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Events (comma-separated)</label>
                    <input value={form.events ?? ''} onChange={e => setForm(f => ({ ...f, events: e.target.value }))} placeholder="invoice.created, payment.received"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCreate(false); setForm({}) }} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={tab === 'keys' ? createKey : createWebhook} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
