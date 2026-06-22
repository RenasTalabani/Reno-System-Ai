'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, FolderOpen, Clock, Users, TrendingUp, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useForm } from 'react-hook-form'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Project {
  id: string; name: string; code: string; description?: string
  status: string; priority: string; color: string; progress: number
  targetDate?: string; members: Array<{ userId: string; role: string }>
  _count: { tasks: number; milestones: number }
}

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'default' | 'danger'> = {
  active: 'success', planning: 'info' as any, on_hold: 'warning', completed: 'default', cancelled: 'danger',
}

const priorityColors: Record<string, string> = {
  critical: 'text-red-500', high: 'text-orange-500', medium: 'text-amber-500', low: 'text-slate-400',
}

export default function ProjectsPage() {
  const { token } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string; description: string; companyId: string; startDate: string; targetDate: string; priority: string }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await fetch(`${API}/v1/pm/projects?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) { setProjects(data.data); setTotal(data.meta?.pagination?.total ?? 0) }
    } finally {
      setLoading(false)
    }
  }, [token, search, status])

  useEffect(() => { if (token) load() }, [load])

  const onCreate = async (values: any) => {
    setCreating(true)
    try {
      const res = await fetch(`${API}/v1/pm/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, companyId: values.companyId }),
      })
      const data = await res.json()
      if (data.success) { setShowCreate(false); reset(); load() }
    } finally { setCreating(false) }
  }

  const statusGroups: Record<string, Project[]> = {
    active: [],
    planning: [],
    on_hold: [],
    completed: [],
    cancelled: [],
  }
  for (const p of projects) {
    if (statusGroups[p.status]) statusGroups[p.status].push(p)
    else statusGroups[p.status] = [p]
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total projects</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-muted-foreground"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="planning">Planning</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
          <p className="text-muted-foreground text-sm mt-2">Create your first project to get started</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Create Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`} className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/50 transition-all group block">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: project.color }}>
                    {project.code.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-indigo-500 transition-colors">{project.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{project.code}</p>
                  </div>
                </div>
                <Badge variant={statusVariant[project.status] ?? 'default'} className="capitalize text-xs">{project.status.replace('_', ' ')}</Badge>
              </div>

              {project.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>}

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" />{project._count.tasks} tasks</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.members.length}</span>
                </div>
                {project.targetDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(project.targetDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className={`text-xs font-medium capitalize ${priorityColors[project.priority] ?? ''}`}>{project.priority} priority</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset() }} title="New Project" size="lg">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <Input label="Project Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" rows={3} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...register('startDate')} />
            <Input label="Target Date" type="date" {...register('targetDate')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
            <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('priority')}>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
