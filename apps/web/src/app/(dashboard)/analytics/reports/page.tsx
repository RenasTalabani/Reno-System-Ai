'use client'

import { useEffect, useState } from 'react'
import { Plus, Download, Calendar, ChevronRight } from 'lucide-react'

interface Report {
  id: string
  name: string
  description: string | null
  module: string
  entity: string
  chartType: string | null
  isPublic: boolean
  createdAt: string
  _count: { scheduledReports: number; exports: number }
}

const MODULE_COLORS: Record<string, string> = {
  sales: 'bg-green-100 text-green-700',
  finance: 'bg-blue-100 text-blue-700',
  hr: 'bg-purple-100 text-purple-700',
  inventory: 'bg-yellow-100 text-yellow-700',
  procurement: 'bg-orange-100 text-orange-700',
  manufacturing: 'bg-red-100 text-red-700',
  projects: 'bg-indigo-100 text-indigo-700',
}

const REPORT_TEMPLATES = [
  { name: 'Sales Orders Summary', module: 'sales', entity: 'orders', columns: [{ field: 'number', label: 'Order #' }, { field: 'status', label: 'Status' }, { field: 'grandTotal', label: 'Total' }, { field: 'createdAt', label: 'Date' }] },
  { name: 'Employee Roster', module: 'hr', entity: 'employees', columns: [{ field: 'employeeNumber', label: 'Emp #' }, { field: 'firstName', label: 'First' }, { field: 'lastName', label: 'Last' }, { field: 'status', label: 'Status' }, { field: 'hireDate', label: 'Hire Date' }] },
  { name: 'Invoice Aging', module: 'finance', entity: 'invoices', columns: [{ field: 'number', label: 'Invoice #' }, { field: 'status', label: 'Status' }, { field: 'totalAmount', label: 'Amount' }, { field: 'dueDate', label: 'Due' }] },
  { name: 'Stock Levels', module: 'inventory', entity: 'stock', columns: [{ field: 'onHand', label: 'On Hand' }, { field: 'reserved', label: 'Reserved' }, { field: 'available', label: 'Available' }, { field: 'totalValue', label: 'Value' }] },
  { name: 'Purchase Orders', module: 'procurement', entity: 'orders', columns: [{ field: 'number', label: 'PO #' }, { field: 'status', label: 'Status' }, { field: 'grandTotal', label: 'Total' }, { field: 'orderDate', label: 'Date' }] },
  { name: 'Production Orders', module: 'manufacturing', entity: 'orders', columns: [{ field: 'number', label: 'MO #' }, { field: 'status', label: 'Status' }, { field: 'plannedQty', label: 'Planned' }, { field: 'producedQty', label: 'Produced' }] },
]

export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const load = () => {
    fetch('/api/v1/analytics/reports?limit=50')
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const createFromTemplate = async (tpl: typeof REPORT_TEMPLATES[0]) => {
    await fetch('/api/v1/analytics/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tpl.name, module: tpl.module, entity: tpl.entity, columns: tpl.columns }),
    })
    setShowTemplates(false)
    load()
  }

  const exportReport = async (id: string) => {
    setExporting(id)
    const res = await fetch('/api/v1/analytics/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: id, format: 'csv' }),
    })
    const data = await res.json()

    if (data.data?.csvData) {
      const blob = new Blob([data.data.csvData], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${id}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">{total} saved reports</p>
        </div>
        <button onClick={() => setShowTemplates(!showTemplates)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Report
        </button>
      </div>

      {showTemplates && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Start from a template:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {REPORT_TEMPLATES.map(tpl => (
              <button key={tpl.name} onClick={() => createFromTemplate(tpl)}
                className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm text-sm">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${MODULE_COLORS[tpl.module] ?? 'bg-gray-100 text-gray-600'}`}>
                  {tpl.module}
                </span>
                <p className="mt-1.5 font-medium text-gray-800">{tpl.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">Report Name</th>
              <th className="px-4 py-3 font-medium text-gray-500">Module</th>
              <th className="px-4 py-3 font-medium text-gray-500">Entity</th>
              <th className="px-4 py-3 font-medium text-gray-500">Scheduled</th>
              <th className="px-4 py-3 font-medium text-gray-500">Exports</th>
              <th className="px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No reports yet</td></tr>
            ) : items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${MODULE_COLORS[r.module] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.module}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">{r.entity.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  {r._count.scheduledReports > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <Calendar size={10} /> {r._count.scheduledReports} schedule(s)
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{r._count.exports}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => exportReport(r.id)} disabled={exporting === r.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50">
                      <Download size={10} />
                      {exporting === r.id ? 'Exporting...' : 'CSV'}
                    </button>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
