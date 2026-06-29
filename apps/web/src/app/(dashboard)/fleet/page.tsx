'use client'
import { useState, useEffect } from 'react'
import { Car, User, MapPin, Fuel, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Vehicle { id: string; make: string; model: string; year: number; licensePlate: string; status: string; fuelType: string; mileage: number; _count: { trips: number } }
interface Summary { vehicles: number; drivers: number; activeTrips: number; availableVehicles: number }

const statusColor = (s: string) => ({ available: 'bg-emerald-500/10 text-emerald-400', in_use: 'bg-blue-500/10 text-blue-400', maintenance: 'bg-amber-500/10 text-amber-400', inactive: 'bg-red-500/10 text-red-400' }[s] ?? 'bg-slate-500/10 text-slate-400')

export default function FleetPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [tab, setTab] = useState<'vehicles' | 'trips'>('vehicles')
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, v] = await Promise.all([
      fetch(`${API}/v1/fleet/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/fleet/vehicles`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setVehicles(v.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Car className="w-5 h-5 text-indigo-500" /> Fleet Management</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> Add Vehicle</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[{ label: 'Total Vehicles', value: summary.vehicles, icon: Car }, { label: 'Available', value: summary.availableVehicles, icon: Car }, { label: 'Active Drivers', value: summary.drivers, icon: User }, { label: 'Active Trips', value: summary.activeTrips, icon: MapPin }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className="w-4 h-4 text-indigo-400" /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map(v => (
          <div key={v.id} className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{v.year} {v.make} {v.model}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{v.licensePlate}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(v.status)}`}>{v.status.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Fuel className="w-3 h-3" /> {v.fuelType}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {v.mileage.toLocaleString()} km</span>
              <span>{v._count.trips} trips</span>
            </div>
          </div>
        ))}
        {!loading && vehicles.length === 0 && <p className="col-span-3 text-center py-12 text-muted-foreground text-sm">No vehicles registered.</p>}
      </div>
    </div>
  )
}
