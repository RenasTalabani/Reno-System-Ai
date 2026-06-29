'use client'
import { useState, useEffect } from 'react'
import { Building2, Key, DollarSign, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Property { id: string; name: string; address: string; type: string; totalUnits: number; status: string; _count: { leases: number } }
interface Lease { id: string; tenantName: string; unit: string; rentAmount: number; status: string; startDate: string; endDate: string | null; property: { name: string } }
interface Summary { properties: number; activeLeases: number; monthlyRevenue: number }

export default function FacilityPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [tab, setTab] = useState<'properties' | 'leases'>('properties')
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, p, l] = await Promise.all([
      fetch(`${API}/v1/facility/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/facility/properties`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/facility/leases`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setProperties(p.data ?? []); setLeases(l.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500" /> Facility Management</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> Add Property</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Properties', value: summary.properties, icon: Building2 }, { label: 'Active Leases', value: summary.activeLeases, icon: Key }, { label: 'Monthly Revenue', value: `$${Number(summary.monthlyRevenue).toLocaleString()}`, icon: DollarSign }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className="w-5 h-5 text-indigo-400" /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {(['properties', 'leases'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm px-4 py-2 rounded-lg capitalize transition-colors ${tab === t ? 'bg-card border border-border text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
        ))}
      </div>

      {tab === 'properties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-start justify-between">
                <div><p className="text-sm font-semibold text-foreground">{p.name}</p><p className="text-xs text-muted-foreground mt-0.5">{p.address}</p></div>
                <span className="text-xs capitalize text-muted-foreground">{p.type}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>{p.totalUnits} units</span><span>{p._count.leases} leases</span>
              </div>
            </div>
          ))}
          {!loading && properties.length === 0 && <p className="col-span-2 text-center py-12 text-muted-foreground text-sm">No properties.</p>}
        </div>
      )}

      {tab === 'leases' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {leases.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No leases found.</p>}
            {leases.map(l => (
              <div key={l.id} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{l.tenantName} <span className="text-muted-foreground">· Unit {l.unit}</span></p>
                  <p className="text-xs text-muted-foreground">{l.property.name} · From {new Date(l.startDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right"><p className="text-sm font-bold text-foreground">${Number(l.rentAmount).toLocaleString()}/mo</p><p className={`text-xs ${l.status === 'active' ? 'text-emerald-400' : 'text-muted-foreground'}`}>{l.status}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
