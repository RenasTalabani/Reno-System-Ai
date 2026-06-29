'use client'
import { useState, useEffect } from 'react'
import { Kanban, CheckSquare, Circle, Zap, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Summary { boards: number; openTasks: number; completedTasks: number; activeSprints: number }
interface Board { id: string; name: string; type: string; _count: { tasks: number; columns: number; sprints: number } }

export default function TaskBoardPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, b] = await Promise.all([
      fetch(`${API}/v1/task-board/summary`, { headers: h }).then(x => x.json()),
      fetch(`${API}/v1/task-board/boards`, { headers: h }).then(x => x.json()),
    ])
    setSummary(s.data); setBoards(b.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Kanban className="w-5 h-5 text-indigo-500" /> Task & Sprint Board</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500"><Plus className="w-4 h-4" /> New Board</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Boards', value: summary.boards, icon: Kanban, color: 'text-blue-400' },
            { label: 'Open Tasks', value: summary.openTasks, icon: Circle, color: 'text-amber-400' },
            { label: 'Completed', value: summary.completedTasks, icon: CheckSquare, color: 'text-emerald-400' },
            { label: 'Active Sprints', value: summary.activeSprints, icon: Zap, color: 'text-indigo-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {boards.map(b => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/40 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{b.name}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{b.type} board</p>
              </div>
              <Kanban className="w-4 h-4 text-indigo-400 shrink-0" />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{b._count.tasks} tasks</span>
              <span>{b._count.columns} columns</span>
              <span>{b._count.sprints} sprints</span>
            </div>
          </div>
        ))}
        {!loading && boards.length === 0 && <p className="col-span-2 text-center py-12 text-muted-foreground text-sm">No boards yet.</p>}
      </div>
    </div>
  )
}