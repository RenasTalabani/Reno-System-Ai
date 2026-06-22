'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useForm } from 'react-hook-form'
import { getInitials } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  workEmail: string
  employmentType: string
  status: string
  hireDate: string
  avatarUrl?: string
  department?: { id: string; name: string }
  manager?: { id: string; firstName: string; lastName: string }
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  on_leave: 'warning',
  suspended: 'warning',
  terminated: 'danger',
  probation: 'default',
}

export default function EmployeesPage() {
  const { token } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const limit = 20

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    firstName: string; lastName: string; workEmail: string; employmentType: string; hireDate: string; companyId: string
  }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await fetch(`${API}/v1/hr/employees?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setEmployees(data.data)
        setTotal(data.meta?.pagination?.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [token, page, search, status])

  useEffect(() => { if (token) load() }, [load])

  const onCreate = async (values: any) => {
    setCreating(true)
    try {
      const res = await fetch(`${API}/v1/hr/employees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreate(false)
        reset()
        load()
      }
    } finally {
      setCreating(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total employees</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-muted-foreground"
            placeholder="Search employees..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="on_leave">On Leave</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hire Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-muted/50 rounded animate-pulse" /></td></tr>
              ))
            ) : employees.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No employees found</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/hr/employees/${emp.id}`} className="flex items-center gap-3 hover:text-indigo-500 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-semibold text-indigo-500 shrink-0">
                        {getInitials(emp.firstName, emp.lastName)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.workEmail}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{emp.employeeCode}</td>
                  <td className="px-4 py-3 text-foreground/80">{emp.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground/70 capitalize">{emp.employmentType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-foreground/70">{new Date(emp.hireDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[emp.status] ?? 'default'} className="capitalize">{emp.status.replace('_', ' ')}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Add Employee" size="lg">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" error={errors.firstName?.message} {...register('firstName', { required: 'Required' })} />
            <Input label="Last Name" error={errors.lastName?.message} {...register('lastName', { required: 'Required' })} />
          </div>
          <Input label="Work Email" type="email" error={errors.workEmail?.message} {...register('workEmail', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hire Date" type="date" error={errors.hireDate?.message} {...register('hireDate', { required: 'Required' })} />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Employment Type</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('employmentType')}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Employee</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
