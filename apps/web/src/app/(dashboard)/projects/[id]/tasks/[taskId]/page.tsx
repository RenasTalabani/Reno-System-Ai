'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock, MessageSquare, Paperclip, GitBranch, Send, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const statusVariant: Record<string, any> = { todo: 'default', in_progress: 'warning', in_review: 'info' as any, done: 'success', cancelled: 'danger', backlog: 'default' }
const priorityColor: Record<string, string> = { critical: 'text-red-500', high: 'text-orange-500', medium: 'text-amber-500', low: 'text-slate-400' }
const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']

export default function TaskDetailPage() {
  const { id, taskId } = useParams<{ id: string; taskId: string }>()
  const { token, user } = useAuthStore()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [logTime, setLogTime] = useState(false)
  const [timeDesc, setTimeDesc] = useState('')
  const [timeMins, setTimeMins] = useState('')

  const loadTask = async () => {
    if (!token) return
    setLoading(true)
    const res = await fetch(`${API}/v1/pm/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) setTask(data.data)
    setLoading(false)
  }

  useEffect(() => { loadTask() }, [taskId, token])

  const handleStatusChange = async (status: string) => {
    await fetch(`${API}/v1/pm/tasks/${taskId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadTask()
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return
    setSubmittingComment(true)
    try {
      await fetch(`${API}/v1/pm/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      })
      setComment('')
      loadTask()
    } finally { setSubmittingComment(false) }
  }

  const handleLogTime = async () => {
    if (!timeMins) return
    const now = new Date()
    const start = new Date(now.getTime() - parseInt(timeMins) * 60000)
    await fetch(`${API}/v1/pm/tasks/${taskId}/time-logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime: start.toISOString(), endTime: now.toISOString(), durationMinutes: parseInt(timeMins), description: timeDesc }),
    })
    setLogTime(false); setTimeMins(''); setTimeDesc('')
    loadTask()
  }

  if (loading) return <div className="p-8"><div className="h-60 bg-card rounded-xl animate-pulse" /></div>
  if (!task) return <div className="p-8 text-muted-foreground">Task not found.</div>

  const totalTimeLogged = task.timeLogs?.reduce((s: number, l: any) => s + (l.durationMinutes ?? 0), 0) ?? 0

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href={`/projects/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to {task.project?.name}
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f97316' : task.priority === 'medium' ? '#f59e0b' : '#94a3b8' }} />
              <div>
                <h1 className="text-xl font-bold text-foreground">{task.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{task.project?.name} · <span className="font-mono">{task.project?.code}</span></p>
              </div>
            </div>
            {task.description && <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>}
          </div>

          {/* Subtasks */}
          {task.subtasks?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-3">Subtasks ({task.subtasks.length})</h3>
              <div className="space-y-2">
                {task.subtasks.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.status === 'done'} onChange={() => {}} className="rounded border-border" />
                    <span className={s.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Comments ({task.comments?.length ?? 0})
            </h3>

            {(task.comments ?? []).map((c: any) => (
              <div key={c.id} className="flex gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-semibold text-indigo-500 shrink-0">U</div>
                <div className="flex-1">
                  <div className="bg-muted/30 rounded-xl px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">{new Date(c.createdAt).toLocaleString()}{c.isEdited && ' · edited'}</p>
                    <p className="text-sm text-foreground">{c.content}</p>
                  </div>
                  {(c.replies ?? []).map((r: any) => (
                    <div key={r.id} className="flex gap-2 mt-2 ml-4">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-[9px] font-semibold text-indigo-500 shrink-0">U</div>
                      <div className="bg-muted/20 rounded-xl px-3 py-2 flex-1">
                        <p className="text-xs text-foreground">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-2 mt-2">
              <textarea
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                rows={2}
                placeholder="Add a comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.metaKey && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={!comment.trim() || submittingComment}
                className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Time Logs */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Time Tracking</h3>
              <button onClick={() => setLogTime(!logTime)} className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors">+ Log time</button>
            </div>

            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="text-muted-foreground">Logged: <span className="font-semibold text-foreground">{(totalTimeLogged / 60).toFixed(1)}h</span></span>
              {task.estimatedHours && <span className="text-muted-foreground">Est: <span className="font-semibold text-foreground">{task.estimatedHours}h</span></span>}
            </div>

            {logTime && (
              <div className="border border-border rounded-lg p-3 space-y-2 mb-3">
                <input type="number" placeholder="Duration (minutes)" value={timeMins} onChange={e => setTimeMins(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                <input placeholder="Description (optional)" value={timeDesc} onChange={e => setTimeDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setLogTime(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleLogTime} className="text-sm text-indigo-500 font-medium hover:text-indigo-600">Save</button>
                </div>
              </div>
            )}

            {task.timeLogs?.slice(0, 5).map((l: any) => (
              <div key={l.id} className="flex justify-between text-xs text-muted-foreground py-1 border-b border-border last:border-0">
                <span>{l.description ?? 'Time entry'}</span>
                <span>{(l.durationMinutes / 60).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
            <select
              value={task.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Details */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority</span>
              <span className={`font-medium capitalize ${priorityColor[task.priority] ?? ''}`}>{task.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="capitalize">{task.taskType}</span>
            </div>
            {task.dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : ''}>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            {task.estimatedHours && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimate</span>
                <span>{task.estimatedHours}h</span>
              </div>
            )}
            {task.milestone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milestone</span>
                <span className="text-indigo-500">{task.milestone.name}</span>
              </div>
            )}
            {task.parent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parent</span>
                <Link href={`/projects/${id}/tasks/${task.parent.id}`} className="text-indigo-500 truncate max-w-[120px]">{task.parent.title}</Link>
              </div>
            )}
          </div>

          {/* Dependencies */}
          {(task.dependsOn?.length > 0 || task.dependedOnBy?.length > 0) && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> Dependencies</p>
              {task.dependsOn?.map((d: any) => (
                <div key={d.id} className="text-xs text-muted-foreground mb-1">
                  Blocked by: <Link href={`/projects/${id}/tasks/${d.dependsOn.id}`} className="text-indigo-500">{d.dependsOn.title}</Link>
                </div>
              ))}
              {task.dependedOnBy?.map((d: any) => (
                <div key={d.id} className="text-xs text-muted-foreground mb-1">
                  Blocks: <Link href={`/projects/${id}/tasks/${d.task.id}`} className="text-amber-500">{d.task.title}</Link>
                </div>
              ))}
            </div>
          )}

          {/* Attachments */}
          {task.attachments?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Attachments ({task.attachments.length})</p>
              {task.attachments.map((a: any) => (
                <a key={a.id} href={a.fileUrl} target="_blank" className="text-xs text-indigo-500 hover:underline block truncate">{a.fileName}</a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
