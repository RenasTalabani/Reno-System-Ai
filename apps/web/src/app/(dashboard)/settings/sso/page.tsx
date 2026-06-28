'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const PROVIDER_TYPES = [
  { value: 'saml', label: 'SAML 2.0', description: 'Generic SAML identity provider' },
  { value: 'oidc', label: 'OIDC', description: 'OpenID Connect (generic)' },
  { value: 'azure_ad', label: 'Azure AD / Entra ID', description: 'Microsoft Azure Active Directory' },
  { value: 'google', label: 'Google Workspace', description: 'Google Workspace SSO' },
]

interface SsoProvider {
  id: string
  name: string
  type: string
  isEnabled: boolean
  isDefault: boolean
  domainHint: string | null
  autoProvision: boolean
  createdAt: string
}

export default function SsoSettingsPage() {
  const { token } = useAuthStore()
  const [providers, setProviders] = useState<SsoProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'saml', domainHint: '' })

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch(`${API}/v1/sso/providers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setProviders(d.data ?? [])).finally(() => setLoading(false))
  }, [token])

  const toggle = async (id: string, current: boolean) => {
    await fetch(`${API}/v1/sso/providers/${id}/enable`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ enabled: !current }),
    })
    setProviders(p => p.map(x => x.id === id ? { ...x, isEnabled: !current } : x))
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this SSO provider?')) return
    await fetch(`${API}/v1/sso/providers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setProviders(p => p.filter(x => x.id !== id))
  }

  const add = async () => {
    const res = await fetch(`${API}/v1/sso/providers`, { method: 'POST', headers, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.data) { setProviders(p => [...p, data.data]); setShowAdd(false); setForm({ name: '', type: 'saml', domainHint: '' }) }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" /> Single Sign-On
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure SAML, OIDC, Azure AD, or Google Workspace SSO</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 mb-6">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200">
          <p className="font-medium mb-0.5">Production configuration required</p>
          <p className="text-amber-200/70">SAML and OIDC require configuring the entity ID, certificates, and callback URLs in your identity provider before enabling.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No SSO providers configured</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Add a provider to enable enterprise SSO for your users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm">{p.name}</p>
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wide">{p.type}</span>
                  {p.isDefault && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">default</span>}
                </div>
                {p.domainHint && <p className="text-xs text-muted-foreground mt-0.5">Domain: {p.domainHint}</p>}
                <p className="text-xs text-muted-foreground/60 mt-0.5">Auto-provision: {p.autoProvision ? 'Yes' : 'No'}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`${API}/v1/sso/providers/${p.id}/metadata`} target="_blank" rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded transition-colors" title="Download SAML metadata">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => toggle(p.id, p.isEnabled)} className={`p-1.5 rounded transition-colors ${p.isEnabled ? 'text-green-500' : 'text-muted-foreground/40'}`}>
                  {p.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => remove(p.id)} className="text-muted-foreground/40 hover:text-red-500 p-1.5 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add SSO Provider</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Display name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Company Azure AD" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Provider type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                  {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Domain hint (optional)</label>
                <input value={form.domainHint} onChange={e => setForm(f => ({ ...f, domainHint: e.target.value }))}
                  placeholder="company.com" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={add} disabled={!form.name} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors">Add Provider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
