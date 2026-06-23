'use client'

import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, Wrench, Wifi } from 'lucide-react'

interface WorkCenter {
  id: string
  code: string
  name: string
  type: string
  capacity: number
  capacityUnit: string
  costPerHour: number | null
  oeeTarget: number | null
  oeeActual: number | null
  mtbfHours: number | null
  mttrHours: number | null
  nextMaintenanceAt: string | null
  digitalTwinId: string | null
  mesDeviceId: string | null
  mesProtocol: string | null
  aiEfficiencyScore: number | null
  aiDowntimeRisk: number | null
  aiMaintenancePriority: string | null
  isActive: boolean
  _count: { orderOps: number; maintenanceLogs: number }
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export default function WorkCentersPage() {
  const [items, setItems] = useState<WorkCenter[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/manufacturing/work-centers?limit=100')
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const inSevenDays = new Date(now.getTime() + 7 * 86400000)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Centers</h1>
          <p className="text-gray-500 text-sm mt-1">{total} work centers</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          Add Work Center
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="col-span-3 py-8 text-center text-gray-400">No work centers yet</div>
        ) : items.map(w => {
          const maintenanceDue = w.nextMaintenanceAt && new Date(w.nextMaintenanceAt) <= inSevenDays
          return (
            <div key={w.id} className={`bg-white rounded-xl border p-5 space-y-4 ${maintenanceDue ? 'border-orange-300' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-400">{w.code} · <span className="capitalize">{w.type}</span></p>
                </div>
                <div className="flex gap-1.5">
                  {w.digitalTwinId && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">Digital Twin</span>
                  )}
                  {w.mesDeviceId && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                      <Wifi size={10} /> MES
                    </span>
                  )}
                </div>
              </div>

              {/* OEE */}
              {(w.oeeTarget != null || w.oeeActual != null) && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>OEE</span>
                    <span>{w.oeeActual != null ? `${(Number(w.oeeActual) * 100).toFixed(0)}%` : '—'} / target {w.oeeTarget != null ? `${(Number(w.oeeTarget) * 100).toFixed(0)}%` : '—'}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${w.oeeActual != null && w.oeeTarget != null && Number(w.oeeActual) >= Number(w.oeeTarget) ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min(100, Number(w.oeeActual ?? 0) * 100)}%` }} />
                  </div>
                </div>
              )}

              {/* MTBF / MTTR */}
              {(w.mtbfHours != null || w.mttrHours != null) && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {w.mtbfHours != null && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">MTBF</p>
                      <p className="font-semibold text-gray-700">{Number(w.mtbfHours).toFixed(1)}h</p>
                    </div>
                  )}
                  {w.mttrHours != null && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">MTTR</p>
                      <p className="font-semibold text-gray-700">{Number(w.mttrHours).toFixed(1)}h</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI */}
              {(w.aiDowntimeRisk != null || w.aiMaintenancePriority) && (
                <div className="flex items-center gap-2">
                  {w.aiDowntimeRisk != null && Number(w.aiDowntimeRisk) > 0.5 && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle size={10} /> {(Number(w.aiDowntimeRisk) * 100).toFixed(0)}% downtime risk
                    </span>
                  )}
                  {w.aiMaintenancePriority && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[w.aiMaintenancePriority] ?? 'bg-gray-100 text-gray-600'}`}>
                      {w.aiMaintenancePriority} priority
                    </span>
                  )}
                </div>
              )}

              {/* Maintenance */}
              {maintenanceDue && (
                <div className="flex items-center gap-2 text-orange-600 text-xs">
                  <Wrench size={12} />
                  <span>Maintenance due {w.nextMaintenanceAt ? new Date(w.nextMaintenanceAt).toLocaleDateString() : 'soon'}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                <span>{w._count.orderOps} operations</span>
                {w.costPerHour != null && <span>${Number(w.costPerHour).toFixed(2)}/hr</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
