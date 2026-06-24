'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Kanban, List, Calendar, Clock, Users, Target, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Task {
  id: string; title: string; status: string; priority: string; dueDate?: string
  assigneeId?: string; taskType: string; estimatedHours?: number
  _count?: { subtasks: number; comments: number; attachments: number }
}

interface Milestone { id: string; name: string; dueDate: string; status: string; _count: { tasks: number } }

const priorityColor: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' }
const statusVariant: Record<string, any> = { todo: 'default', in_progress: 'warning', in_review: 'info', done: 'success', cancelled: 'danger', backlog: 'default' }

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [board, setBoard] = useState<any>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'board' | 'milestones' | 'timeline'>('board')
  const [showAddTask, setShowAddTask] = useState(false)
  const [addingTask, setAddingTask] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ title: string; priority: string; dueDate: string; taskType: string }>()

  const loadProject = async () => {
    if (!token) return
    setLoading(true)
    const [projRes, milestonesRes] = await Promise.all([
      fetch(`${API}/v1/pm/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/v1/pm/milestones?projectId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const [proj, miles] = await Promise.all([projRes.json(), milestonesRes.json()])
    if (proj.success) setProject(proj.data)
    if (miles.success) setMilestones(miles.data)
    setLoading(false)
  }

  const loadTasks = async () => {
    if (!token) return
    const res = await fetch(`${API}/v1/pm/tasks?projectId=${id}&limit=100`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) setTasks(data.data)
  }

  const loadBoard = async () => {
    if (!token || !project) return
    if (project.boards?.[0]) {
      const res = await fetch(`${API}/v1/pm/boards/${project.boards[0].id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setBoard(data.data)
    }
  }

  useEffect(() => { loadProject() }, [id, token])
  useEffect(() => { if (project) { loadTasks(); loadBoard() } }, [project])

  const onAddTask = async (values: any) => {
    setAddingTask(true)
    try {
      await fetch(`${API}/v1/pm/tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, projectId: id, dueDate: values.dueDate || undefined }),
      })
      setShowAddTask(false)
      reset()
      loadTasks()
      loadBoard()
    } finally { setAddingTask(false) }
  }

  if (loading) return <div className="p-8"><div className="h-40 bg-card rounded-xl animate-pulse" /></div>
  if (!project) return <div className="p-8 text-muted-foreground">Project not found.</div>

  const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done']
  const statusLabels: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-border">
        <Link href="/projects" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Projects
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: project.color }}>
              {project.code.slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="font-mono text-xs">{project.code}</span>
                <Badge variant={statusVariant[project.status] ?? 'default'} className="capitalize text-xs">{project.status.replace('_', ' ')}</Badge>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.members?.length ?? 0} members</span>
                {project.targetDate && <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{new Date(project.targetDate).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress */}
            <div className="flex items-center gap-2 mr-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
              </div>
              <span className="text-sm font-medium text-foreground">{project.progress}%</span>
            </div>
            <Button onClick={() => setShowAddTask(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {([
            { key: 'board', label: 'Board', icon: Kanban },
            { key: 'list', label: 'List', icon: List },
            { key: 'milestones', label: 'Milestones', icon: Target },
            { key: 'timeline', label: 'Timeline', icon: Calendar },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${activeTab === tab.key ? 'bg-indigo-500/10 text-indigo-500 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Board view */}
        {activeTab === 'board' && (
          <div className="p-6 flex gap-4 overflow-x-auto min-h-full">
            {STATUSES.map(status => {
              const statusTasks = tasks.filter(t => t.status === status)
              return (
                <div key={status} className="flex flex-col w-72 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-foreground">{statusLabels[status]}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{statusTasks.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {statusTasks.map(task => (
                      <Link key={task.id} href={`/projects/${id}/tasks/${task.id}`} className="bg-card border border-border rounded-xl p-3 hover:border-indigo-500/50 transition-all group block">
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: priorityColor[task.priority] ?? '#94a3b8' }} />
                          <p className="text-sm text-foreground font-medium flex-1 group-hover:text-indigo-500 transition-colors leading-snug">{task.title}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span className="capitalize bg-muted px-1.5 py-0.5 rounded text-[10px]">{task.taskType}</span>
                          {task.dueDate && (
                            <span className={`flex items-center gap-0.5 ${new Date(task.dueDate) < new Date() ? 'text-red-500' : ''}`}>
                              <Clock className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {task._count && (task._count.subtasks > 0 || task._count.comments > 0) && (
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            {task._count.subtasks > 0 && <span>↳ {task._count.subtasks}</span>}
                            {task._count.comments > 0 && <span>💬 {task._count.comments}</span>}
                          </div>
                        )}
                      </Link>
                    ))}
                    {statusTasks.length === 0 && (
                      <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-xs text-muted-foreground/50">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List view */}
        {activeTab === 'list' && (
          <div className="p-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No tasks yet</td></tr>
                  ) : tasks.map(task => (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${id}/tasks/${task.id}`} className="font-medium text-foreground hover:text-indigo-500 transition-colors">{task.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{task.taskType}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant[task.status]} className="capitalize text-xs">{task.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3"><span className={`capitalize text-xs font-medium ${priorityColor[task.priority] ?? ''} `}>{task.priority}</span></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {task.dueDate ? (
                          <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : ''}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Milestones */}
        {activeTab === 'milestones' && (
          <div className="p-6 space-y-4">
            {milestones.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p>No milestones yet</p>
              </div>
            ) : milestones.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{m.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Due {new Date(m.dueDate).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                      · {m._count.tasks} tasks
                    </p>
                  </div>
                  <Badge variant={m.status === 'completed' ? 'success' : new Date(m.dueDate) < new Date() ? 'danger' : 'default'} className="capitalize">
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline (placeholder) */}
        {activeTab === 'timeline' && (
          <div className="p-6 flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">Timeline / Gantt View</p>
              <p className="text-sm mt-1">Full Gantt chart with drag-to-reschedule coming in Phase 2.1</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      <Modal open={showAddTask} onClose={() => { setShowAddTask(false); reset() }} title="Add Task" size="md">
        <form onSubmit={handleSubmit(onAddTask)} className="space-y-4">
          <Input label="Task Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('taskType')}>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="story">Story</option>
              </select>
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
          </div>
          <Input label="Due Date" type="date" {...register('dueDate')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowAddTask(false); reset() }}>Cancel</Button>
            <Button type="submit" loading={addingTask}>Add Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
