'use client'

import { useEffect, useState, useCallback } from 'react'
import { Clock, Plus, Pencil, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'

interface SlaPolicy {
  id: string
  name: string
  priority: string
  firstResponseMinutes: number
  resolutionMinutes: number
  businessHoursOnly: boolean
  isDefault: boolean
  isActive: boolean
  escalationRules?: EscalationRule[]
}

interface EscalationRule {
  id: string
  name: string
  triggerType: string
  triggerMinutes: number
  action: string
  notifyEmails: string[]
  isActive: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
}

function minsToLabel(mins: number) {
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return `${Math.round(mins / 1440)}d`
}

export default function SlaPage() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [showEscModal, setShowEscModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null)
  const [editingEsc, setEditingEsc] = useState<EscalationRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [policyForm, setPolicyForm] = useState({
    name: '', priority: 'medium', firstResponseMinutes: 240, resolutionMinutes: 1440,
    businessHoursOnly: false, isDefault: false,
  })

  const [escForm, setEscForm] = useState({
    name: '', slaPolicyId: '', triggerType: 'first_response_breach',
    triggerMinutes: 60, action: 'notify', notifyEmails: '',
  })

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const [polRes, escRes] = await Promise.all([
      fetch('/api/v1/helpdesk/sla', { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/helpdesk/sla/escalation', { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [polData, escData] = await Promise.all([polRes.json(), escRes.json()])
    if (polData.success) {
      const pols = polData.data
      if (escData.success) {
        const rules = escData.data
        pols.forEach((p: SlaPolicy) => {
          p.escalationRules = rules.filter((r: EscalationRule & { slaPolicyId: string }) => r.slaPolicyId === p.id)
        })
      }
      setPolicies(pols)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreatePolicy() {
    setEditingPolicy(null)
    setPolicyForm({ name: '', priority: 'medium', firstResponseMinutes: 240, resolutionMinutes: 1440, businessHoursOnly: false, isDefault: false })
    setError('')
    setShowPolicyModal(true)
  }

  function openEditPolicy(p: SlaPolicy) {
    setEditingPolicy(p)
    setPolicyForm({ name: p.name, priority: p.priority, firstResponseMinutes: p.firstResponseMinutes, resolutionMinutes: p.resolutionMinutes, businessHoursOnly: p.businessHoursOnly, isDefault: p.isDefault })
    setError('')
    setShowPolicyModal(true)
  }

  async function savePolicy() {
    if (!policyForm.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const url = editingPolicy ? `/api/v1/helpdesk/sla/${editingPolicy.id}` : '/api/v1/helpdesk/sla'
    const method = editingPolicy ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(policyForm),
    })
    const data = await res.json()
    if (data.success) { setShowPolicyModal(false); await load() } else { setError(data.error ?? 'Failed') }
    setSaving(false)
  }

  async function deletePolicy(id: string) {
    if (!confirm('Delete this SLA policy?')) return
    await fetch(`/api/v1/helpdesk/sla/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    await load()
  }

  function openCreateEsc(policyId: string) {
    setEditingEsc(null)
    setEscForm({ name: '', slaPolicyId: policyId, triggerType: 'first_response_breach', triggerMinutes: 60, action: 'notify', notifyEmails: '' })
    setError('')
    setShowEscModal(true)
  }

  function openEditEsc(rule: EscalationRule & { slaPolicyId: string }) {
    setEditingEsc(rule)
    setEscForm({ name: rule.name, slaPolicyId: rule.slaPolicyId, triggerType: rule.triggerType, triggerMinutes: rule.triggerMinutes, action: rule.action, notifyEmails: rule.notifyEmails?.join(', ') ?? '' })
    setError('')
    setShowEscModal(true)
  }

  async function saveEsc() {
    if (!escForm.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const body = { ...escForm, notifyEmails: escForm.notifyEmails.split(',').map(e => e.trim()).filter(Boolean) }
    const url = editingEsc ? `/api/v1/helpdesk/sla/escalation/${editingEsc.id}` : '/api/v1/helpdesk/sla/escalation'
    const method = editingEsc ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) { setShowEscModal(false); await load() } else { setError(data.error ?? 'Failed') }
    setSaving(false)
  }

  async function deleteEsc(id: string) {
    if (!confirm('Delete this escalation rule?')) return
    await fetch(`/api/v1/helpdesk/sla/escalation/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    await load()
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SLA Policies</h1>
          <p className="text-sm text-gray-500 mt-1">Service level agreements and escalation rules</p>
        </div>
        <button onClick={openCreatePolicy}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No SLA policies yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map(policy => (
            <div key={policy.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-gray-800">{policy.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[policy.priority] ?? ''}`}>
                    {policy.priority}
                  </span>
                  {policy.isDefault && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Default
                    </span>
                  )}
                  {!policy.isActive && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openCreateEsc(policy.id)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Escalation Rule
                  </button>
                  <button onClick={() => openEditPolicy(policy)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deletePolicy(policy.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-3 grid grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">First Response</p>
                  <p className="font-semibold text-gray-800">{minsToLabel(policy.firstResponseMinutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Resolution</p>
                  <p className="font-semibold text-gray-800">{minsToLabel(policy.resolutionMinutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Business Hours</p>
                  <p className="font-semibold text-gray-800">{policy.businessHoursOnly ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {policy.escalationRules && policy.escalationRules.length > 0 && (
                <div className="border-t border-gray-100 px-5 py-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Escalation Rules</p>
                  <div className="space-y-2">
                    {policy.escalationRules.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">{rule.name}</p>
                            <p className="text-xs text-gray-400">
                              {rule.triggerType.replace(/_/g, ' ')} after {minsToLabel(rule.triggerMinutes)} → {rule.action}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditEsc(rule as any)} className="p-1 rounded hover:bg-orange-100 text-gray-400 hover:text-indigo-600">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteEsc(rule.id)} className="p-1 rounded hover:bg-orange-100 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editingPolicy ? 'Edit SLA Policy' : 'New SLA Policy'}</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input value={policyForm.name} onChange={e => setPolicyForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select value={policyForm.priority} onChange={e => setPolicyForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Response (min)</label>
                <input type="number" min={1} value={policyForm.firstResponseMinutes}
                  onChange={e => setPolicyForm(f => ({ ...f, firstResponseMinutes: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Resolution (min)</label>
                <input type="number" min={1} value={policyForm.resolutionMinutes}
                  onChange={e => setPolicyForm(f => ({ ...f, resolutionMinutes: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={policyForm.businessHoursOnly}
                  onChange={e => setPolicyForm(f => ({ ...f, businessHoursOnly: e.target.checked }))} className="w-4 h-4 rounded" />
                Business hours only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={policyForm.isDefault}
                  onChange={e => setPolicyForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 rounded" />
                Default for priority
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowPolicyModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={savePolicy} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editingEsc ? 'Edit Escalation Rule' : 'New Escalation Rule'}</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rule Name <span className="text-red-500">*</span></label>
              <input value={escForm.name} onChange={e => setEscForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Trigger Type</label>
                <select value={escForm.triggerType} onChange={e => setEscForm(f => ({ ...f, triggerType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {['first_response_breach', 'resolution_breach', 'no_activity'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">After (minutes)</label>
                <input type="number" min={1} value={escForm.triggerMinutes}
                  onChange={e => setEscForm(f => ({ ...f, triggerMinutes: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Action</label>
              <select value={escForm.action} onChange={e => setEscForm(f => ({ ...f, action: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {['notify', 'reassign', 'escalate', 'close'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notify Emails (comma separated)</label>
              <input value={escForm.notifyEmails} onChange={e => setEscForm(f => ({ ...f, notifyEmails: e.target.value }))}
                placeholder="admin@company.com, support@company.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowEscModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveEsc} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
