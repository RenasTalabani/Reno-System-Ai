'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, CheckCircle, Circle, Loader2, Eye, EyeOff } from 'lucide-react'

interface Provider {
  id: string
  name: string
  provider: string
  model: string
  isDefault: boolean
  isActive: boolean
  isConfigured: boolean
  rpmLimit: number | null
  tpmLimit: number | null
  createdAt: string
}

const PROVIDER_LOGOS: Record<string, { label: string; color: string }> = {
  anthropic: { label: 'Anthropic Claude', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  openai: { label: 'OpenAI', color: 'bg-green-50 border-green-200 text-green-700' },
  google: { label: 'Google Gemini', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  azure: { label: 'Azure OpenAI', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  mock: { label: 'Demo / Mock', color: 'bg-gray-50 border-gray-200 text-gray-600' },
}

const DEFAULT_MODELS: Record<string, string[]> = {
  anthropic: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  azure: ['gpt-4o'],
  mock: ['demo'],
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const [form, setForm] = useState({ name: '', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: '', baseUrl: '', isDefault: false })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [])

  async function loadProviders() {
    const r = await fetch('/api/v1/brain/providers')
    const d = await r.json()
    setProviders(d.data ?? [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const r = await fetch('/api/v1/brain/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) {
      setShowAdd(false)
      setForm({ name: '', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: '', baseUrl: '', isDefault: false })
      loadProviders()
    }
    setSaving(false)
  }

  async function testConnection(id: string) {
    setTesting(id)
    const r = await fetch(`/api/v1/brain/providers/${id}/test`, { method: 'POST' })
    const d = await r.json()
    setTestResult(prev => ({ ...prev, [id]: { ok: d.success, msg: d.data?.message ?? d.error ?? 'Unknown' } }))
    setTesting(null)
  }

  async function setDefault(id: string) {
    await fetch(`/api/v1/brain/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    loadProviders()
  }

  async function deleteProvider(id: string) {
    await fetch(`/api/v1/brain/providers/${id}`, { method: 'DELETE' })
    loadProviders()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
          <p className="text-gray-500 text-sm">Configure API keys for Anthropic, OpenAI, Google, and more</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={14} />
          Add Provider
        </button>
      </div>

      {/* Add Provider Form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Configure AI Provider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Display Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Anthropic Account"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Provider</label>
              <select value={form.provider} onChange={e => {
                const prov = e.target.value
                setForm(f => ({ ...f, provider: prov, model: DEFAULT_MODELS[prov]?.[0] ?? '' }))
              }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white">
                {Object.entries(PROVIDER_LOGOS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Model</label>
              <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white">
                {(DEFAULT_MODELS[form.provider] ?? []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">API Key</label>
              <div className="relative">
                <input type={showKey ? 'text' : 'password'} value={form.apiKey}
                  onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-9 focus:outline-none focus:border-indigo-400" />
                <button onClick={() => setShowKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            {(form.provider === 'google' || form.provider === 'azure') && (
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Base URL (optional)</label>
                <input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={form.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
              <label htmlFor="isDefault" className="text-sm text-gray-600">Set as default provider</label>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onClick={save} disabled={saving || !form.name || !form.model}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save Provider
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-600 text-sm hover:text-gray-900">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading providers...</div>
      ) : providers.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-yellow-800 mb-1">No AI providers configured</p>
          <p className="text-xs text-yellow-600">Reno Brain is running in demo mode. Add an API key to enable real AI responses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map(p => {
            const meta = PROVIDER_LOGOS[p.provider] ?? PROVIDER_LOGOS.mock
            const result = testResult[p.id]
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1.5 border rounded-lg text-xs font-medium ${meta.color}`}>
                    {meta.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.isDefault && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Default</span>
                      )}
                      {p.isActive
                        ? <CheckCircle size={12} className="text-green-500" />
                        : <Circle size={12} className="text-gray-300" />}
                    </div>
                    <p className="text-xs text-gray-400">{p.model} · {p.isConfigured ? 'API key configured' : 'No key'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result && (
                      <span className={`text-xs ${result.ok ? 'text-green-600' : 'text-red-500'}`}>
                        {result.ok ? '✓ Connected' : `✗ ${result.msg}`}
                      </span>
                    )}
                    <button onClick={() => testConnection(p.id)} disabled={testing === p.id}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-100 flex items-center gap-1">
                      {testing === p.id && <Loader2 size={10} className="animate-spin" />}
                      Test
                    </button>
                    {!p.isDefault && (
                      <button onClick={() => setDefault(p.id)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-lg hover:bg-indigo-100">
                        Set Default
                      </button>
                    )}
                    <button onClick={() => deleteProvider(p.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
