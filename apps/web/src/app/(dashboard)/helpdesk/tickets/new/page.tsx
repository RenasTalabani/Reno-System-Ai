'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const TYPES = ['question', 'incident', 'problem', 'request', 'change']
const PRIORITIES = ['critical', 'high', 'medium', 'low']

export default function NewTicketPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    subject: '',
    description: '',
    type: 'question',
    priority: 'medium',
    categoryId: '',
    agentId: '',
    tags: '',
    source: 'internal',
  })

  const token = () => localStorage.getItem('accessToken') ?? ''

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/helpdesk/categories/all', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch('/api/v1/helpdesk/agents', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([cData, aData]) => {
      if (cData.success) setCategories(cData.data)
      if (aData.success) setAgents(aData.data)
    })
  }, [])

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject.trim() || !form.description.trim()) {
      setError('Subject and description are required')
      return
    }
    setSubmitting(true)
    setError('')

    const body: any = {
      subject: form.subject.trim(),
      description: form.description.trim(),
      type: form.type,
      priority: form.priority,
      source: form.source,
      ...(form.categoryId && { categoryId: form.categoryId }),
      ...(form.agentId && { agentId: form.agentId }),
      ...(form.tags.trim() && { tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }),
    }

    const res = await fetch('/api/v1/helpdesk/tickets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      router.push(`/helpdesk/tickets/${data.data.id}`)
    } else {
      setError(data.error ?? 'Failed to create ticket')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/helpdesk/tickets" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Ticket</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a support ticket</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
          <input
            value={form.subject}
            onChange={e => set('subject', e.target.value)}
            placeholder="Brief summary of the issue"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
          <textarea
            rows={5}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Detailed description of the issue..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              <option value="">No Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
            <select value={form.source} onChange={e => set('source', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              {['internal', 'email', 'api', 'employee_portal', 'customer_portal'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign To</label>
          <select value={form.agentId} onChange={e => set('agentId', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
            <option value="">Unassigned</option>
            {agents.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.user?.firstName ? `${a.user.firstName} ${a.user.lastName ?? ''}`.trim() : a.user?.displayName ?? 'Agent'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
          <input
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
            placeholder="billing, urgent, login (comma separated)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <Link href="/helpdesk/tickets"
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}
            className="px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
            {submitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
