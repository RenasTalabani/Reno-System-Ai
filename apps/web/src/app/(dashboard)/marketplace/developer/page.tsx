'use client'

import { useState, useEffect } from 'react'
import { Code2, Plus, DollarSign, Download, Star, ArrowRight, Package } from 'lucide-react'

export default function DeveloperPage() {
  const [account, setAccount] = useState<any>(null)
  const [earnings, setEarnings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', website: '', description: '' })
  const [tab, setTab] = useState<'plugins' | 'earnings'>('plugins')

  useEffect(() => {
    fetch('/api/v1/marketplace/developer/me')
      .then((r) => r.json())
      .then((d) => setAccount(d.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (account) {
      fetch('/api/v1/marketplace/developer/earnings')
        .then((r) => r.json())
        .then((d) => setEarnings(d.data))
    }
  }, [account])

  const register = async () => {
    if (!form.name || !form.email) return
    setRegistering(true)
    const r = await fetch('/api/v1/marketplace/developer/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const d = await r.json()
    if (d.success) setAccount(d.data)
    setRegistering(false)
  }

  if (loading) return <div className="flex items-center justify-center py-40"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /></div>

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 mx-auto mb-4">
            <Code2 className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Become a Reno Developer</h1>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">Build and sell plugins, themes, and AI agents. Earn 70% revenue share on every purchase.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4">
          {[
            { icon: Code2, label: 'Build', desc: 'Create plugins with our SDK' },
            { icon: DollarSign, label: '70% Revenue', desc: 'Earn on every install' },
            { icon: Download, label: 'Distribution', desc: 'Reach all Reno tenants' },
          ].map((b) => (
            <div key={b.label} className="text-center rounded-xl border border-gray-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 mx-auto mb-2"><b.icon className="h-5 w-5 text-violet-600" /></div>
              <p className="font-semibold text-sm text-gray-900">{b.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Register Developer Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Display Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" placeholder="Acme Inc." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email *</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" placeholder="dev@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" placeholder="What do you build?" />
            </div>
          </div>
          <button onClick={register} disabled={registering || !form.name || !form.email} className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {registering ? 'Registering...' : 'Register Developer Account'}
          </button>
          <p className="text-xs text-gray-400 text-center">Accounts require approval before publishing. You'll be notified within 1-2 business days.</p>
        </div>
      </div>
    )
  }

  const plugins: any[] = account.plugins ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600">{account.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${account.status === 'approved' ? 'bg-green-50 text-green-700' : account.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'}`}>{account.status}</span>
          </div>
        </div>
        {account.status === 'approved' && (
          <button className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            <Plus className="h-4 w-4" /> New Plugin
          </button>
        )}
      </div>

      {account.status === 'pending' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your developer account is pending review. You can browse the portal but cannot publish plugins yet.
        </div>
      )}

      {/* Earnings summary */}
      {earnings && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Earnings', value: `$${earnings.totalEarnings.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
            { label: 'Total Installs', value: earnings.totalInstalls.toLocaleString(), icon: Download, color: 'bg-violet-50 text-violet-600' },
            { label: 'Revenue Share', value: `${earnings.revenueSharePct}%`, icon: ArrowRight, color: 'bg-blue-50 text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color.split(' ')[0]}`}>
                <s.icon className={`h-5 w-5 ${s.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plugins list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">My Plugins</h2>
        {plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12 gap-3">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500 text-sm">No plugins yet. Create your first plugin to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {plugins.map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${p.status === 'approved' ? 'bg-green-50 text-green-700' : p.status === 'pending_review' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{p.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.slug}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{p.installCount}</div>
                  <div className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-current" />{p.rating.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SDK docs teaser */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-violet-900 text-sm">Developer SDK Documentation</p>
          <p className="text-xs text-violet-600 mt-0.5">Learn how to build plugins, themes, and AI agents for Reno Marketplace.</p>
        </div>
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 flex items-center gap-2">
          View Docs <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
