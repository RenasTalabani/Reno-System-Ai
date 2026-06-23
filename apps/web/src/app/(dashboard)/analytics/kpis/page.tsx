'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

interface KpiData {
  period: string
  generatedAt: string
  finance: { revenueThisMonth: number; revenueLastMonth: number; revenueChangePercent: number; expensesThisMonth: number; grossMargin: number; openInvoicesCount: number; openInvoicesValue: number }
  sales: { ordersThisMonth: number; ordersValueThisMonth: number; quotationsOpen: number }
  hr: { totalEmployees: number; newHiresThisMonth: number; onLeaveNow: number }
  inventory: { totalStockValue: number; lowStockProducts: number }
  procurement: { openPurchaseOrders: number; openPOValue: number }
  manufacturing: { activeOrders: number; completedLast30Days: number; pendingQualityChecks: number }
  projects: { activeProjects: number }
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function ChangeIndicator({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.1) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus size={10} /> 0%</span>
  if (pct > 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><TrendingUp size={10} /> +{pct.toFixed(1)}%</span>
  return <span className="text-xs text-red-600 flex items-center gap-0.5"><TrendingDown size={10} /> {pct.toFixed(1)}%</span>
}

function KpiCard({ label, value, sub, change }: { label: string; value: string | number; sub: string; change?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-400">{sub}</p>
        {change !== undefined && <ChangeIndicator pct={change} />}
      </div>
    </div>
  )
}

export default function KpiPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [snapshotting, setSnapshotting] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/v1/analytics/kpis')
      .then(r => r.json())
      .then(d => setKpis(d.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const snapshot = async () => {
    setSnapshotting(true)
    await fetch('/api/v1/analytics/kpis/snapshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setSnapshotting(false)
  }

  if (loading) return <div className="p-6 text-gray-500">Loading KPIs...</div>
  if (!kpis) return <div className="p-6 text-gray-500">No data</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Explorer</h1>
          <p className="text-gray-500 text-sm mt-1">Cross-module performance metrics · Generated {new Date(kpis.generatedAt).toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={snapshot} disabled={snapshotting}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {snapshotting ? 'Saving...' : 'Save Snapshot'}
          </button>
          <button onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Finance */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Finance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Revenue MTD" value={fmt(kpis.finance.revenueThisMonth)} sub={`Last month: ${fmt(kpis.finance.revenueLastMonth)}`} change={kpis.finance.revenueChangePercent} />
          <KpiCard label="Expenses MTD" value={fmt(kpis.finance.expensesThisMonth)} sub="Vendor bills approved/paid" />
          <KpiCard label="Gross Margin" value={`${kpis.finance.grossMargin.toFixed(1)}%`} sub="Revenue minus expenses" />
          <KpiCard label="Open Invoices" value={kpis.finance.openInvoicesCount} sub={fmt(kpis.finance.openInvoicesValue) + ' receivable'} />
        </div>
      </div>

      {/* Sales */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Sales</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Orders This Month" value={kpis.sales.ordersThisMonth} sub={fmt(kpis.sales.ordersValueThisMonth) + ' total value'} />
          <KpiCard label="Open Quotations" value={kpis.sales.quotationsOpen} sub="Draft or sent" />
        </div>
      </div>

      {/* HR */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Human Resources</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Total Employees" value={kpis.hr.totalEmployees} sub="Active headcount" />
          <KpiCard label="New Hires MTD" value={kpis.hr.newHiresThisMonth} sub="This month" />
          <KpiCard label="On Leave Now" value={kpis.hr.onLeaveNow} sub="Currently on leave" />
        </div>
      </div>

      {/* Inventory */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Inventory</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Total Stock Value" value={fmt(kpis.inventory.totalStockValue)} sub="All warehouses" />
          <KpiCard label="Low / Zero Stock" value={kpis.inventory.lowStockProducts} sub="Products at or below zero" />
        </div>
      </div>

      {/* Procurement */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Procurement</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Open POs" value={kpis.procurement.openPurchaseOrders} sub="Pending / approved" />
          <KpiCard label="Open PO Value" value={fmt(kpis.procurement.openPOValue)} sub="Total committed" />
        </div>
      </div>

      {/* Manufacturing */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Manufacturing</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Active Orders" value={kpis.manufacturing.activeOrders} sub="Released or in progress" />
          <KpiCard label="Completed (30d)" value={kpis.manufacturing.completedLast30Days} sub="Last 30 days" />
          <KpiCard label="Pending QC" value={kpis.manufacturing.pendingQualityChecks} sub="Awaiting inspection" />
        </div>
      </div>

      {/* Projects */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Projects</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Active Projects" value={kpis.projects.activeProjects} sub="In progress" />
        </div>
      </div>
    </div>
  )
}
