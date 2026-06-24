'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tag, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
  parentId?: string | null
  children?: Category[]
  _count?: { tickets: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', parentId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [flat, setFlat] = useState<Category[]>([])

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const [treeRes, flatRes] = await Promise.all([
      fetch('/api/v1/helpdesk/categories', { headers: { Authorization: `Bearer ${token()}` } }),
      fetch('/api/v1/helpdesk/categories/all', { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [treeData, flatData] = await Promise.all([treeRes.json(), flatRes.json()])
    if (treeData.success) setCategories(treeData.data)
    if (flatData.success) setFlat(flatData.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', color: '#6366f1', parentId: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '', color: cat.color ?? '#6366f1', parentId: cat.parentId ?? '' })
    setError('')
    setShowModal(true)
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color || undefined,
      parentId: form.parentId || undefined,
    }
    const url = editing ? `/api/v1/helpdesk/categories/${editing.id}` : '/api/v1/helpdesk/categories'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      setShowModal(false)
      await load()
    } else {
      setError(data.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return
    await fetch(`/api/v1/helpdesk/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    })
    await load()
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Organize support tickets by category</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No categories yet</p>
          <button onClick={openCreate} className="mt-3 text-sm text-indigo-600 hover:underline">Create your first category</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subcategories</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(cat => (
                <>
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? '#6366f1' }} />
                        <span className="font-medium text-gray-800">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{cat.description ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{cat.children?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(cat)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteCategory(cat.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {cat.children?.map(child => (
                    <tr key={child.id} className="hover:bg-gray-50 bg-gray-50/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 pl-6">
                          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: child.color ?? cat.color ?? '#6366f1' }} />
                          <span className="text-gray-700 text-xs">{child.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{child.description ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">—</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${child.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {child.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEdit(child)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteCategory(child.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Category' : 'New Category'}</h2>

            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-9 h-9 rounded border border-gray-200 cursor-pointer" />
                  <span className="text-xs text-gray-400">{form.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent Category</label>
                <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">None (Root)</option>
                  {flat.filter(c => c.id !== editing?.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
