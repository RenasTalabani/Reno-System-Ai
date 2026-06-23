'use client'

import { useEffect, useState } from 'react'
import { Warehouse, Plus, MapPin, Layers, Package } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const ZONE_TYPE_COLORS: Record<string, string> = {
  storage: 'bg-blue-500/10 text-blue-500',
  receiving: 'bg-green-500/10 text-green-500',
  shipping: 'bg-orange-500/10 text-orange-500',
  returns: 'bg-amber-500/10 text-amber-500',
  quarantine: 'bg-red-500/10 text-red-500',
}

export default function WarehousesPage() {
  const { token } = useAuthStore()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    const res = await fetch(`${API}/v1/inventory/warehouses`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) setWarehouses(json.data)
    setLoading(false)
  }

  const loadWarehouse = async (id: string) => {
    const res = await fetch(`${API}/v1/inventory/warehouses/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) setSelected(json.data)
  }

  useEffect(() => { load() }, [token])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage warehouses, zones, and bin locations</p>
        </div>
        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Warehouse
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Warehouses list */}
        <div className="col-span-1 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))
          ) : warehouses.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No warehouses yet
            </div>
          ) : warehouses.map(w => (
            <button
              type="button"
              key={w.id}
              onClick={() => loadWarehouse(w.id)}
              className={`w-full text-left bg-card border rounded-xl p-4 hover:border-indigo-500/40 transition-colors ${selected?.id === w.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-border'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{w.code}</span>
                    {w.isDefault && <span className="text-xs bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">Default</span>}
                  </div>
                  <p className="font-semibold text-foreground mt-0.5">{w.name}</p>
                  {w.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {w.city}{w.country ? `, ${w.country}` : ''}
                    </p>
                  )}
                </div>
                <Warehouse className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {w._count?.zones ?? 0} zones</span>
                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {w._count?.stockBalances ?? 0} products</span>
              </div>
            </button>
          ))}
        </div>

        {/* Warehouse detail */}
        <div className="col-span-2">
          {!selected ? (
            <div className="bg-card border border-border rounded-xl h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a warehouse to view zones and bins</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-foreground">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">{selected.code} {selected.address ? `· ${selected.address}` : ''}</p>
                  </div>
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-500 rounded-lg hover:bg-indigo-500/20 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Zone
                  </button>
                </div>

                {!selected.zones?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No zones defined yet</div>
                ) : (
                  <div className="space-y-3">
                    {selected.zones.map((zone: any) => (
                      <div key={zone.id} className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{zone.code}</span>
                            <span className="font-medium text-sm text-foreground">{zone.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ZONE_TYPE_COLORS[zone.type] ?? 'bg-muted text-muted-foreground'}`}>{zone.type}</span>
                          </div>
                          <button type="button" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Bin
                          </button>
                        </div>
                        {zone.bins?.length > 0 && (
                          <div className="px-4 py-2 flex flex-wrap gap-2">
                            {zone.bins.map((bin: any) => (
                              <span key={bin.id} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-mono">
                                {bin.code}
                              </span>
                            ))}
                          </div>
                        )}
                        {(!zone.bins || zone.bins.length === 0) && (
                          <div className="px-4 py-2 text-xs text-muted-foreground">No bins defined</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
