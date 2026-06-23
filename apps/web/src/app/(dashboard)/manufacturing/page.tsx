'use client'

import { useEffect, useState } from 'react'
import { Factory, Settings, CheckCircle, AlertTriangle, Clock, Wrench } from 'lucide-react'

interface KPIs {
  totalOrders: number
  activeOrders: number
  completedOrders30d: number
  totalWorkCenters: number
  pendingQualityChecks: number
  failedQualityChecks: number
  maintenanceDueCount: number
}

interface RecentOrder {
  id: string
  number: string
  status: string
  productName: string
  productCode: string
  plannedQty: number
  producedQty: number
  scheduledEnd: string | null
}

interface WorkCenterHealth {
  id: string
  name: string
  code: string
  type: string
  oeeActual: number | null
  oeeTarget: number | null
  aiDowntimeRisk: number | null
  aiMaintenancePriority: string | null
  maintenanceDue: boolean
  nextMaintenanceAt: string | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  released: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function ManufacturingDashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [workCenterHealth, setWorkCenterHealth] = useState<WorkCenterHealth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/manufacturing/dashboard')
      .then(r => r.json())
      .then(d => {
        setKpis(d.data.kpis)
        setRecentOrders(d.data.recentOrders)
        setWorkCenterHealth(d.data.workCenterHealth)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading manufacturing data...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manufacturing</h1>
        <p className="text-gray-500 text-sm mt-1">Production orders, BOM, work centers, quality control, and MRP</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Orders', value: kpis?.totalOrders, icon: Factory, color: 'text-blue-600' },
          { label: 'Active', value: kpis?.activeOrders, icon: Clock, color: 'text-purple-600' },
          { label: 'Completed (30d)', value: kpis?.completedOrders30d, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Work Centers', value: kpis?.totalWorkCenters, icon: Settings, color: 'text-gray-600' },
          { label: 'QC Pending', value: kpis?.pendingQualityChecks, icon: CheckCircle, color: 'text-yellow-600' },
          { label: 'QC Failed', value: kpis?.failedQualityChecks, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Maintenance Due', value: kpis?.maintenanceDueCount, icon: Wrench, color: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon size={14} />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Manufacturing Orders</h2>
            <a href="/manufacturing/orders" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No orders yet</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{o.number}</p>
                  <p className="text-xs text-gray-500">{o.productName} ({o.productCode})</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {Number(o.producedQty)}/{Number(o.plannedQty)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Work Center Health */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Work Center Health</h2>
            <a href="/manufacturing/work-centers" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {workCenterHealth.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No work centers</p>
            ) : workCenterHealth.map(w => (
              <div key={w.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{w.type}</p>
                  </div>
                  <div className="text-right">
                    {w.oeeActual != null && (
                      <p className="text-sm font-semibold text-gray-700">
                        OEE {(Number(w.oeeActual) * 100).toFixed(0)}%
                      </p>
                    )}
                    {w.maintenanceDue && (
                      <div className="flex items-center gap-1 justify-end">
                        <Wrench size={10} className="text-orange-500" />
                        <span className="text-xs text-orange-500">Maintenance due</span>
                      </div>
                    )}
                    {w.aiDowntimeRisk != null && Number(w.aiDowntimeRisk) > 0.7 && (
                      <div className="flex items-center gap-1 justify-end">
                        <AlertTriangle size={10} className="text-red-500" />
                        <span className="text-xs text-red-500">High downtime risk</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/manufacturing/orders" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Factory size={14} />
            New Manufacturing Order
          </a>
          <a href="/manufacturing/bom" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            <Settings size={14} />
            Bill of Materials
          </a>
          <a href="/manufacturing/work-centers" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            <Wrench size={14} />
            Work Centers
          </a>
          <a href="/manufacturing/mrp" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            <CheckCircle size={14} />
            Run MRP
          </a>
        </div>
      </div>
    </div>
  )
}
