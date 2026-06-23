'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, CheckCircle, Package, Zap } from 'lucide-react'

interface MfgOrder {
  id: string
  number: string
  status: string
  finishedProduct: { name: string; code: string; costPrice: number | null }
  bom: { code: string; name: string; version: string } | null
  plannedQty: number
  producedQty: number
  scrapQty: number
  scheduledStart: string | null
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  notes: string | null
  aiProductionScore: number | null
  aiYieldForecast: number | null
  aiBottleneckRisk: number | null
  aiInsights: string | null
  components: { id: string; component: { name: string; code: string }; plannedQty: number; consumedQty: number }[]
  operations: { id: string; name: string; status: string; workCenter: { name: string; code: string; costPerHour: number | null } | null; plannedHours: number; actualHours: number | null; sequence: number }[]
  qualityChecks: { id: string; number: string; status: string; inspectedAt: string | null }[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  released: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function ManufacturingOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<MfgOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = () => {
    fetch(`/api/v1/manufacturing/orders/${params.id}`)
      .then(r => r.json())
      .then(d => setOrder(d.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [params.id])

  const act = async (action: string, body: object = {}) => {
    setActing(true)
    await fetch(`/api/v1/manufacturing/orders/${params.id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    load()
    setActing(false)
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>
  if (!order) return <div className="p-6 text-gray-500">Order not found</div>

  const progress = Number(order.plannedQty) > 0 ? Math.min(100, (Number(order.producedQty) / Number(order.plannedQty)) * 100) : 0

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 text-gray-400 hover:text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{order.number}</h1>
            <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {order.finishedProduct.name} · {order.finishedProduct.code}
            {order.bom && ` · BOM: ${order.bom.code} v${order.bom.version}`}
          </p>
        </div>

        <div className="flex gap-2">
          {order.status === 'draft' && (
            <button onClick={() => act('release')} disabled={acting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Release
            </button>
          )}
          {order.status === 'released' && (
            <button onClick={() => act('start')} disabled={acting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50">
              <Play size={14} /> Start Production
            </button>
          )}
          {['released', 'in_progress'].includes(order.status) && (
            <>
              <button onClick={() => act('consume')} disabled={acting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50">
                <Package size={14} /> Consume Components
              </button>
              <button onClick={() => act('produce', { qty: order.plannedQty })} disabled={acting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                <Zap size={14} /> Post FG
              </button>
              <button onClick={() => act('complete')} disabled={acting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50">
                <CheckCircle size={14} /> Complete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Production Progress</span>
          <span className="text-sm text-gray-500">{Number(order.producedQty)} / {Number(order.plannedQty)} units ({progress.toFixed(0)}%)</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        {order.scrapQty > 0 && <p className="text-xs text-red-500 mt-1">Scrap: {Number(order.scrapQty)} units</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Components */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Components ({order.components.length})</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-2 font-medium text-gray-500">Component</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Planned</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Consumed</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.components.map(c => {
                  const done = Number(c.consumedQty) >= Number(c.plannedQty)
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">{c.component.name}</p>
                        <p className="text-xs text-gray-400">{c.component.code}</p>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{Number(c.plannedQty)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{Number(c.consumedQty)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${done ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {done ? 'consumed' : 'pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Operations */}
          {order.operations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Operations</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {order.operations.sort((a, b) => a.sequence - b.sequence).map(op => (
                  <div key={op.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{op.name}</p>
                      <p className="text-xs text-gray-400">{op.workCenter?.name ?? 'No work center'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {op.actualHours != null ? `${op.actualHours}h / ` : ''}{op.plannedHours}h planned
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        op.status === 'completed' ? 'bg-green-100 text-green-700' :
                        op.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {op.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-gray-900">Details</h3>
            {order.scheduledStart && <div><p className="text-gray-400">Scheduled Start</p><p>{new Date(order.scheduledStart).toLocaleDateString()}</p></div>}
            {order.scheduledEnd && <div><p className="text-gray-400">Scheduled End</p><p>{new Date(order.scheduledEnd).toLocaleDateString()}</p></div>}
            {order.actualStart && <div><p className="text-gray-400">Actual Start</p><p>{new Date(order.actualStart).toLocaleDateString()}</p></div>}
            {order.actualEnd && <div><p className="text-gray-400">Actual End</p><p>{new Date(order.actualEnd).toLocaleDateString()}</p></div>}
          </div>

          {(order.aiProductionScore != null || order.aiBottleneckRisk != null) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-indigo-900">AI Production Director</h3>
              {order.aiProductionScore != null && <div><p className="text-indigo-600">Production Score</p><p className="font-bold">{(Number(order.aiProductionScore) * 100).toFixed(0)}%</p></div>}
              {order.aiYieldForecast != null && <div><p className="text-indigo-600">Yield Forecast</p><p className="font-bold">{Number(order.aiYieldForecast)}</p></div>}
              {order.aiBottleneckRisk != null && <div><p className="text-indigo-600">Bottleneck Risk</p><p className={`font-bold ${Number(order.aiBottleneckRisk) > 0.7 ? 'text-red-600' : 'text-green-600'}`}>{(Number(order.aiBottleneckRisk) * 100).toFixed(0)}%</p></div>}
              {order.aiInsights && <div><p className="text-indigo-600">Insights</p><p className="text-xs text-indigo-800">{order.aiInsights}</p></div>}
            </div>
          )}

          {order.qualityChecks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Quality Checks</h3>
              {order.qualityChecks.map(qc => (
                <div key={qc.id} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-500">{qc.number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    qc.status === 'passed' ? 'bg-green-100 text-green-700' :
                    qc.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{qc.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
