'use client'
import { useEffect, useState } from 'react'

export default function PosPage() {
  const [summary, setSummary] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/proxy/v1/pos/summary').then(r => r.json()).then(d => setSummary(d.data ?? {}))
  }, [])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Point of Sale</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Open Orders', value: summary.openOrders ?? 0, color: 'bg-yellow-50 border-yellow-200' },
          { label: "Today's Orders", value: summary.todayOrders ?? 0, color: 'bg-blue-50 border-blue-200' },
          { label: "Today's Revenue", value: `$${(summary.todayRevenue ?? 0).toLocaleString()}`, color: 'bg-green-50 border-green-200' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-5 ${c.color}`}>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
