'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Store, Puzzle, Palette, Zap, Bot, Building2, Package, Star, TrendingUp, Shield, Search } from 'lucide-react'

interface FeaturedData {
  plugins: any[]
  themes: any[]
  industryPacks: any[]
}

export default function MarketplacePage() {
  const [featured, setFeatured] = useState<FeaturedData>({ plugins: [], themes: [], industryPacks: [] })
  const [categories, setCategories] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/marketplace/search/featured').then((r) => r.json()),
      fetch('/api/v1/marketplace/search/categories').then((r) => r.json()),
    ]).then(([f, c]) => {
      setFeatured(f.data ?? { plugins: [], themes: [], industryPacks: [] })
      setCategories(c.data ?? {})
    }).finally(() => setLoading(false))
  }, [])

  const sections = [
    { icon: Puzzle, label: 'Plugins', description: 'Extend Reno with powerful integrations', href: '/marketplace/plugins', color: 'bg-violet-500', count: categories.plugins?.reduce((s: number, c: any) => s + c.count, 0) ?? 0 },
    { icon: Palette, label: 'Themes', description: 'Customize the look and feel', href: '/marketplace/themes', color: 'bg-pink-500', count: categories.themes?.reduce((s: number, c: any) => s + c.count, 0) ?? 0 },
    { icon: Zap, label: 'Workflow Templates', description: 'Ready-made automation flows', href: '/marketplace/workflow-templates', color: 'bg-amber-500', count: categories.workflowTemplates?.reduce((s: number, c: any) => s + c.count, 0) ?? 0 },
    { icon: Bot, label: 'AI Agents', description: 'Pre-trained business AI assistants', href: '/marketplace/ai-agents', color: 'bg-cyan-500', count: categories.aiAgents?.reduce((s: number, c: any) => s + c.count, 0) ?? 0 },
    { icon: Building2, label: 'Industry Packs', description: 'Complete setups for your sector', href: '/marketplace/industry-packs', color: 'bg-emerald-500', count: categories.industryPacks?.reduce((s: number, c: any) => s + c.count, 0) ?? 0 },
    { icon: Package, label: 'My Installed', description: 'Manage installed plugins & themes', href: '/marketplace/installed', color: 'bg-gray-500', count: 0 },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">Reno Marketplace</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Extend Your Reno System</h1>
          <p className="text-white/70 text-base mb-6 max-w-lg">Browse plugins, themes, AI agents, workflow templates, and industry packs to tailor Reno to your business.</p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search && (window.location.href = `/marketplace/plugins?search=${encodeURIComponent(search)}`)}
              placeholder="Search marketplace..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white/60 text-sm"
            />
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-8 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Shield, label: 'Security Reviewed', desc: 'All plugins pass our security audit' },
          { icon: TrendingUp, label: 'Revenue Sharing', desc: '70% earnings for developers' },
          { icon: Star, label: 'Quality Rated', desc: 'Community reviews & ratings' },
        ].map((b) => (
          <div key={b.label} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <b.icon className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{b.label}</p>
              <p className="text-xs text-gray-500">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-3 gap-4">
          {sections.map((s) => (
            <Link key={s.label} href={s.href} className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:border-violet-300 hover:shadow-sm transition-all">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
              </div>
              {s.count > 0 && <span className="text-xs text-gray-400">{s.count} available</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* Featured plugins */}
      {featured.plugins.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Featured Plugins</h2>
            <Link href="/marketplace/plugins?featured=true" className="text-sm text-violet-600 hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {featured.plugins.map((p) => (
              <PluginCard key={p.id} plugin={p} />
            ))}
          </div>
        </div>
      )}

      {/* Featured themes */}
      {featured.themes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Featured Themes</h2>
            <Link href="/marketplace/themes?featured=true" className="text-sm text-violet-600 hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {featured.themes.map((t) => (
              <ThemeCard key={t.id} theme={t} />
            ))}
          </div>
        </div>
      )}

      {/* Industry packs */}
      {featured.industryPacks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Industry Packs</h2>
            <Link href="/marketplace/industry-packs" className="text-sm text-violet-600 hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {featured.industryPacks.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-violet-300 transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{p.industry}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="h-3 w-3 fill-current" />
                  {p.rating.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      )}
    </div>
  )
}

function PluginCard({ plugin }: { plugin: any }) {
  const priceLabel = plugin.pricingModel === 'free' ? 'Free' : `$${plugin.price}/${plugin.pricingModel === 'subscription' ? 'mo' : ''}`
  return (
    <Link href={`/marketplace/plugins/${plugin.id}`} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-violet-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          {plugin.iconUrl ? <img src={plugin.iconUrl} alt={plugin.name} className="h-8 w-8 rounded-lg object-cover" /> : <Puzzle className="h-5 w-5 text-violet-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{plugin.name}</p>
          <p className="text-xs text-gray-500 capitalize">{plugin.category}</p>
        </div>
      </div>
      <p className="text-xs text-gray-600 line-clamp-2">{plugin.shortDescription}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-amber-500">
          <Star className="h-3 w-3 fill-current" />
          {plugin.rating.toFixed(1)}
        </div>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{priceLabel}</span>
      </div>
    </Link>
  )
}

function ThemeCard({ theme }: { theme: any }) {
  return (
    <Link href={`/marketplace/themes/${theme.id}`} className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-violet-300 hover:shadow-sm transition-all">
      <div className="h-20 w-full" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }} />
      <div className="p-3">
        <p className="font-medium text-sm text-gray-900 truncate">{theme.name}</p>
        <div className="flex items-center gap-1 text-xs text-amber-500 mt-1">
          <Star className="h-3 w-3 fill-current" />
          {theme.rating.toFixed(1)}
        </div>
      </div>
    </Link>
  )
}
