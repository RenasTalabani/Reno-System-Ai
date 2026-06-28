'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, RefreshCw, Layers, Users, Workflow, BarChart2, FileText, Bot, ShieldCheck } from 'lucide-react'

const TENANT_ID = 'default-tenant'
const USER_ID = 'admin-user'

interface PlanItem {
  id: string; category: string; title: string; description: string
  config: Record<string, unknown> | null; status: string; order: number
}

interface Plan {
  id: string; industry: string; templateUsed: string | null
  summary: string; status: string; items: PlanItem[]
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  module:    { label: 'Modules',    icon: Layers,    color: 'bg-blue-50 border-blue-200 text-blue-700' },
  role:      { label: 'Roles',      icon: Users,     color: 'bg-violet-50 border-violet-200 text-violet-700' },
  workflow:  { label: 'Workflows',  icon: Workflow,  color: 'bg-amber-50 border-amber-200 text-amber-700' },
  dashboard: { label: 'Dashboards', icon: BarChart2, color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  report:    { label: 'Reports',    icon: FileText,  color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  agent:     { label: 'AI Agents',  icon: Bot,       color: 'bg-rose-50 border-rose-200 text-rose-700' },
}

const INDUSTRY_LABELS: Record<string, string> = {
  gym: 'Gym & Fitness', logistics: 'Logistics', manufacturing: 'Manufacturing',
  retail: 'Retail', healthcare: 'Healthcare', education: 'Education', services: 'Professional Services',
}

export default function PlanPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('sessionId') ?? ''

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/ai-onboarding/sessions/${sessionId}/plan?tenantId=${TENANT_ID}`)
      .then(r => r.json())
      .then(d => { if (d.plan) { setPlan(d.plan); if (d.plan.status === 'approved' || d.plan.status === 'applied') setApproved(true) } setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId])

  async function handleApprove() {
    if (!plan) return
    setApproving(true)
    await fetch(`/api/v1/ai-onboarding/plans/${plan.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, userId: USER_ID }),
    })
    setApproved(true)
    setApproving(false)
    router.push(`/setup/apply?planId=${plan.id}`)
  }

  const grouped = plan ? Object.entries(
    plan.items.reduce<Record<string, PlanItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  ) : []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-violet-400" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 flex-col gap-2">
        <Layers size={28} className="text-gray-300" />
        <p className="text-sm">No plan found for this session.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Plan header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-violet-200 text-sm font-medium mb-1">AI Setup Plan — {INDUSTRY_LABELS[plan.industry] ?? plan.industry}</div>
            <h1 className="text-2xl font-bold mb-2">Your Business Configuration</h1>
            <p className="text-violet-100 text-sm leading-relaxed max-w-lg">{plan.summary}</p>
          </div>
          <div className="shrink-0 ml-4">
            <div className="text-4xl">{
              plan.industry === 'gym' ? '🏋️' : plan.industry === 'logistics' ? '🚛' :
              plan.industry === 'manufacturing' ? '🏭' : plan.industry === 'retail' ? '🛒' :
              plan.industry === 'healthcare' ? '🏥' : plan.industry === 'education' ? '🎓' : '💼'
            }</div>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/20 rounded-xl px-3 py-1.5 text-sm">{plan.items.length} setup actions</div>
          <div className="bg-white/20 rounded-xl px-3 py-1.5 text-sm">{grouped.length} categories</div>
          <div className={`rounded-xl px-3 py-1.5 text-sm font-medium ${plan.status === 'approved' || plan.status === 'applied' ? 'bg-green-500/80' : 'bg-white/20'}`}>
            {plan.status}
          </div>
        </div>
      </div>

      {/* Safety notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Review carefully.</strong> This plan will configure your Reno instance. No changes are applied until you click "Approve & Apply". You can modify configurations afterward.
        </p>
      </div>

      {/* Plan items by category */}
      {grouped.map(([category, items]) => {
        const meta = CATEGORY_META[category] ?? { label: category, icon: Layers, color: 'bg-gray-50 border-gray-200 text-gray-700' }
        const Icon = meta.icon
        return (
          <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
              <Icon size={14} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">{meta.label}</span>
              <span className="ml-auto text-xs text-gray-400">{items.length} items</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <CheckCircle size={14} className="text-violet-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${meta.color}`}>{category}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Approve button */}
      <div className="sticky bottom-4">
        <button type="button" onClick={handleApprove} disabled={approving || approved}
          className="w-full flex items-center justify-center gap-3 py-4 bg-violet-600 text-white rounded-2xl font-semibold text-base hover:bg-violet-700 disabled:opacity-50 transition shadow-lg shadow-violet-200">
          {approving ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          {approved ? 'Plan Approved — Redirecting...' : approving ? 'Approving...' : 'Approve & Apply This Setup Plan'}
        </button>
      </div>
    </div>
  )
}
