'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Puzzle, Star, Download, Check, X, Shield, Globe, Mail, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

export default function PluginDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [plugin, setPlugin] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [uninstalling, setUninstalling] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [showChangelog, setShowChangelog] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/marketplace/plugins/${id}`)
      .then((r) => r.json())
      .then((d) => setPlugin(d.data))
      .finally(() => setLoading(false))
  }, [id])

  const install = async () => {
    setInstalling(true); setError('')
    const r = await fetch(`/api/v1/marketplace/plugins/${id}/install`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grantedPermissions: plugin.permissions }) })
    const d = await r.json()
    if (!d.success) { setError(d.error); setInstalling(false); return }
    setPlugin((p: any) => ({ ...p, tenantInstall: d.data }))
    setInstalling(false)
  }

  const uninstall = async () => {
    if (!confirm('Uninstall this plugin? This may remove associated data.')) return
    setUninstalling(true)
    await fetch(`/api/v1/marketplace/plugins/${id}/install`, { method: 'DELETE' })
    setPlugin((p: any) => ({ ...p, tenantInstall: null }))
    setUninstalling(false)
  }

  const toggle = async () => {
    setToggling(true)
    const r = await fetch(`/api/v1/marketplace/plugins/${id}/toggle`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const d = await r.json()
    if (d.success) setPlugin((p: any) => ({ ...p, tenantInstall: d.data }))
    setToggling(false)
  }

  const upgrade = async () => {
    const r = await fetch(`/api/v1/marketplace/plugins/${id}/upgrade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const d = await r.json()
    if (d.success) setPlugin((p: any) => ({ ...p, tenantInstall: { ...p.tenantInstall, installedVersion: plugin.currentVersion } }))
  }

  if (loading) return <div className="flex items-center justify-center py-40"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /></div>
  if (!plugin) return <div className="py-20 text-center text-gray-500">Plugin not found</div>

  const install_ = plugin.tenantInstall
  const canUpgrade = install_ && install_.installedVersion !== plugin.currentVersion

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/marketplace/plugins" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Plugins
      </Link>

      {/* Header */}
      <div className="flex items-start gap-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-50">
          {plugin.iconUrl ? <img src={plugin.iconUrl} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <Puzzle className="h-10 w-10 text-violet-500" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{plugin.name}</h1>
            {plugin.isOfficial && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">Official</span>}
            {plugin.isFeatured && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">Featured</span>}
          </div>
          <p className="text-gray-600 mt-1">{plugin.shortDescription}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="capitalize">{plugin.category}</span>
            <span>·</span>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-medium">{plugin.rating.toFixed(1)}</span>
              <span className="text-gray-400">({plugin.ratingCount})</span>
            </div>
            <span>·</span>
            <span>{plugin.installCount.toLocaleString()} installs</span>
            <span>·</span>
            <span>v{plugin.currentVersion}</span>
          </div>
          {plugin.developer && <p className="text-xs text-gray-400 mt-1">by {plugin.developer.name}</p>}
        </div>
        <div className="flex flex-col gap-2">
          {!install_ ? (
            <button onClick={install} disabled={installing} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {installing ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Installing...</> : <><Download className="h-4 w-4" />{plugin.pricingModel === 'free' ? 'Install Free' : `Install — $${plugin.price}`}</>}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">Installed v{install_.installedVersion}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${install_.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{install_.status}</span>
              </div>
              <div className="flex items-center gap-2">
                {canUpgrade && <button onClick={upgrade} className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100">Upgrade to v{plugin.currentVersion}</button>}
                <button onClick={toggle} disabled={toggling} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">{install_.status === 'active' ? 'Disable' : 'Enable'}</button>
                <button onClick={uninstall} disabled={uninstalling} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Uninstall</button>
              </div>
            </>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{plugin.description}</p>
          </div>

          {/* Permissions */}
          {plugin.permissions?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-gray-500" /> Required Permissions</h2>
              <div className="flex flex-wrap gap-2">
                {plugin.permissions.map((perm: string) => (
                  <span key={perm} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{perm}</span>
                ))}
              </div>
            </div>
          )}

          {/* Changelog */}
          {plugin.versions?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <button onClick={() => setShowChangelog(!showChangelog)} className="flex items-center justify-between w-full">
                <h2 className="font-semibold text-gray-900">Version History</h2>
                {showChangelog ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>
              {showChangelog && (
                <div className="mt-4 space-y-4">
                  {plugin.versions.map((v: any) => (
                    <div key={v.id} className="border-l-2 border-violet-200 pl-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">v{v.version}</span>
                        {v.isStable && <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-xs text-green-600">Stable</span>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{v.changelog}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          {plugin.reviews?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Reviews</h2>
              <div className="space-y-4">
                {plugin.reviews.map((r: any) => (
                  <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      {[1,2,3,4,5].map((s) => <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}
                      {r.isVerifiedPurchase && <span className="text-xs text-green-600 font-medium">Verified</span>}
                    </div>
                    {r.title && <p className="text-sm font-semibold text-gray-900">{r.title}</p>}
                    {r.body && <p className="text-xs text-gray-600 mt-1">{r.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-900">Details</h3>
            {[
              ['Version', `v${plugin.currentVersion}`],
              ['License', plugin.licenseType],
              ['Pricing', plugin.pricingModel === 'free' ? 'Free' : `$${plugin.price}`],
              ['Min Core', `v${plugin.minCoreVersion}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900 capitalize">{v}</span>
              </div>
            ))}
          </div>

          {plugin.developer && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <h3 className="font-semibold text-sm text-gray-900">Developer</h3>
              <p className="text-sm text-gray-700">{plugin.developer.name}</p>
              {plugin.developer.website && <a href={plugin.developer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-violet-600 hover:underline"><Globe className="h-3 w-3" /> Website</a>}
              {plugin.developer.email && <a href={`mailto:${plugin.developer.email}`} className="flex items-center gap-1 text-xs text-violet-600 hover:underline"><Mail className="h-3 w-3" /> Support</a>}
            </div>
          )}

          {plugin.requiredModules?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <h3 className="font-semibold text-sm text-gray-900">Requires</h3>
              {plugin.requiredModules.map((m: string) => (
                <span key={m} className="block rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600 capitalize">{m}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
