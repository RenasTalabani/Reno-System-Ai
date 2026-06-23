'use client'

import { useEffect, useState } from 'react'
import { Plus, LayoutDashboard, Globe, Lock, Pencil, Trash2 } from 'lucide-react'

interface Dashboard {
  id: string
  name: string
  type: string
  module: string | null
  isDefault: boolean
  isPublic: boolean
  description: string | null
  createdAt: string
  _count: { widgets: number }
}

const TYPE_COLORS: Record<string, string> = {
  executive: 'bg-purple-100 text-purple-700',
  department: 'bg-blue-100 text-blue-700',
  module: 'bg-green-100 text-green-700',
  custom: 'bg-gray-100 text-gray-600',
}

export default function DashboardsPage() {
  const [items, setItems] = useState<Dashboard[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('custom')

  const load = () => {
    fetch('/api/v1/analytics/dashboards?limit=50')
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.meta?.pagination?.total ?? 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newName.trim()) return
    await fetch('/api/v1/analytics/dashboards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, type: newType }),
    })
    setCreating(false)
    setNewName('')
    setNewType('custom')
    load()
  }

  const deleteDashboard = async (id: string) => {
    await fetch(`/api/v1/analytics/dashboards/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-500 text-sm mt-1">{total} dashboards configured</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Dashboard
        </button>
      </div>

      {creating && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Dashboard name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
          />
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newType}
            onChange={e => setNewType(e.target.value)}
          >
            <option value="custom">Custom</option>
            <option value="executive">Executive</option>
            <option value="department">Department</option>
            <option value="module">Module</option>
          </select>
          <button onClick={create} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Create</button>
          <button onClick={() => setCreating(false)} className="px-4 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="col-span-3 py-8 text-center text-gray-400">
            No dashboards yet. Create your first dashboard to get started.
          </div>
        ) : items.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <LayoutDashboard size={18} className="text-indigo-600" />
              </div>
              <div className="flex gap-1">
                {d.isDefault && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">Default</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[d.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {d.type}
                </span>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900">{d.name}</h3>
            {d.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{d.description}</p>}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{d._count.widgets} widgets</span>
                <span className="flex items-center gap-1">
                  {d.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                  {d.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                  <Pencil size={12} />
                </button>
                <button onClick={() => deleteDashboard(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
