'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Puzzle, Palette, Check, X, AlertTriangle, RefreshCw, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function InstalledPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'plugins' | 'themes' | 'audit'>('plugins')
  const [audit, setAudit] = useState<any[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/v1/marketplace/installed')
      .then((r) => r.json())
      .then((d) => setData(d.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (tab === 'audit') {
      fetch('/api/v1/marketplace/installed/audit?limit=50')
        .then((r) => r.json())
        .then((d) => setAudit(d.data ?? []))
    }
  }, [tab])

  const toggle = async (pluginId: string) => {
    setProcessing(pluginId)
    await fetch(`/api/v1/marketplace/plugins/${pluginId}/toggle`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    load()
    setProcessing(null)
  }

  const upgrade = async (pluginId: string) => {
    setProcessing(pluginId)
    await fetch(`/api/v1/marketplace/plugins/${pluginId}/upgrade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    load()
    setProcessing(null)
  }

  const uninstallPlugin = async (pluginId: string) => {
    if (!confirm('Uninstall this plugin?')) return
    setProcessing(pluginId)
    await fetch(`/api/v1/marketplace/plugins/${pluginId}/install`, { method: 'DELETE' })
    load()
    setProcessing(null)
  }

  if (loading) return <div className="flex items-center justify-center py-40"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /></div>

  const summary = data?.summary ?? {}
  const plugins: any[] = data?.plugins ?? []
  const themes: any[] = data?.themes ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Installed</h1>
        <Link href="/marketplace" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Browse Marketplace</Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Plugins', value: summary.totalPlugins ?? 0, icon: Puzzle, color: 'text-violet-600 bg-violet-50' },
          { label: 'Active Plugins', value: summary.activePlugins ?? 0, icon: Check, color: 'text-green-600 bg-green-50' },
          { label: 'Disabled', value: summary.disabledPlugins ?? 0, icon: X, color: 'text-gray-600 bg-gray-50' },
          { label: 'Updates Available', value: summary.upgradablePlugins ?? 0, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color.split(' ')[1]}`}>
              <s.icon className={`h-5 w-5 ${s.color.split(' ')[0]}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active theme banner */}
      {summary.activeTheme && (
        <div className="flex items-center gap-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="h-10 w-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${summary.activeTheme.primaryColor}, ${summary.activeTheme.secondaryColor})` }} />
          <div>
            <p className="text-sm font-semibold text-violet-900">Active Theme: {summary.activeTheme.name}</p>
            <p className="text-xs text-violet-600">Change in Themes tab</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['plugins', 'themes', 'audit'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'plugins' && (
        plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No plugins installed yet</p>
            <Link href="/marketplace/plugins" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Browse Plugins</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {plugins.map((inst) => {
              const p = inst.plugin
              const canUpgrade = inst.installedVersion !== p.currentVersion
              const isProcessing = processing === inst.pluginId
              return (
                <div key={inst.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 flex-shrink-0">
                    <Puzzle className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/marketplace/plugins/${inst.pluginId}`} className="font-semibold text-sm text-gray-900 hover:text-violet-700 truncate">{p.name}</Link>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inst.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{inst.status}</span>
                      {canUpgrade && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Update available</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">v{inst.installedVersion} · {p.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canUpgrade && (
                      <button onClick={() => upgrade(inst.pluginId)} disabled={isProcessing} className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50">
                        <RefreshCw className="h-3 w-3" /> Update
                      </button>
                    )}
                    <button onClick={() => toggle(inst.pluginId)} disabled={isProcessing} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      {inst.status === 'active' ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button onClick={() => uninstallPlugin(inst.pluginId)} disabled={isProcessing} className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'themes' && (
        themes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Palette className="h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No themes installed</p>
            <Link href="/marketplace/themes" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Browse Themes</Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {themes.map((inst) => (
              <div key={inst.id} className={`rounded-xl border bg-white overflow-hidden ${inst.isActive ? 'border-violet-400 ring-2 ring-violet-100' : 'border-gray-200'}`}>
                <div className="h-16 w-full" style={{ background: `linear-gradient(135deg, ${inst.theme.primaryColor}, ${inst.theme.secondaryColor})` }} />
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{inst.theme.name}</p>
                    {inst.isActive && <span className="text-xs text-violet-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Active</span>}
                  </div>
                  {!inst.isActive && (
                    <button onClick={() => fetch(`/api/v1/marketplace/themes/${inst.themeId}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(load)} className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">Apply</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'audit' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Action', 'Item', 'Type', 'Version', 'Date'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {audit.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${log.action === 'install' ? 'bg-green-50 text-green-700' : log.action === 'uninstall' ? 'bg-red-50 text-red-700' : log.action === 'upgrade' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>{log.action}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.listingName}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{log.listingType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.fromVersion && log.toVersion ? `${log.fromVersion} → ${log.toVersion}` : log.toVersion ?? log.fromVersion ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {audit.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No audit logs yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
