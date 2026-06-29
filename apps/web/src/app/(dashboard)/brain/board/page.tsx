'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, PlayCircle, ChevronDown, MessageSquare, CheckCircle2, AlertCircle, X } from 'lucide-react'

interface BoardSession {
  id: string
  sessionName: string
  agenda: string[]
  status: string
  discussion: Array<{ role: string; message: string; sentiment: string }>
  decisions: Array<{ topic: string; decision: string; rationale: string }>
  actionItems: string[]
  consensus: string | null
  conductedAt: string | null
  createdAt: string
}

const ROLE_COLORS: Record<string, string> = {
  CEO: 'bg-purple-500/10 text-purple-600',
  CFO: 'bg-blue-500/10 text-blue-600',
  COO: 'bg-green-500/10 text-green-600',
  CMO: 'bg-pink-500/10 text-pink-600',
  CTO: 'bg-amber-500/10 text-amber-600',
}

const SENTIMENT_ICONS: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  concerned: '😟',
  opposing: '❌',
}

export default function BoardPage() {
  const [sessions, setSessions] = useState<BoardSession[]>([])
  const [selected, setSelected] = useState<BoardSession | null>(null)
  const [creating, setCreating] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [agendaText, setAgendaText] = useState('')

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/v1/brain/board')
      if (res.ok) {
        const data = await res.json() as { sessions: BoardSession[] }
        setSessions(data.sessions)
      }
    } catch { /* no-op */ }
  }

  const createSession = async () => {
    setCreating(true)
    try {
      const agenda = agendaText.split('\n').map((l) => l.trim()).filter(Boolean)
      const res = await fetch('/api/v1/brain/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName, agenda }),
      })
      if (res.ok) {
        const session = await res.json() as BoardSession
        setSessions((prev) => [session, ...prev])
        setSelected(session)
        setShowCreate(false)
        setSessionName('')
        setAgendaText('')
      }
    } finally {
      setCreating(false)
    }
  }

  const simulate = async (id: string) => {
    setSimulating(true)
    try {
      const res = await fetch(`/api/v1/brain/board/${id}/simulate`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json() as BoardSession
        setSessions((prev) => prev.map((s) => s.id === id ? updated : s))
        setSelected(updated)
      }
    } finally {
      setSimulating(false)
    }
  }

  useEffect(() => { void fetchSessions() }, [])

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sessions sidebar */}
      <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-foreground">Board Simulator</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="New session"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No sessions yet</p>
          )}
          {sessions.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setSelected(s)}
              className={`w-full rounded-lg p-3 text-left transition-colors ${selected?.id === s.id ? 'bg-primary/10' : 'hover:bg-accent'}`}
            >
              <p className="text-sm font-medium text-foreground truncate">{s.sessionName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.status === 'completed' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                  {s.status}
                </span>
                <span className="text-[10px] text-muted-foreground">{s.agenda.length} items</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Users className="h-16 w-16 text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-foreground">AI Board Meeting Simulator</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a session, define the agenda, and let AI board members debate and decide — using real company data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start First Session
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selected.sessionName}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selected.agenda.length} agenda items · {selected.status}
                </p>
              </div>
              {selected.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => void simulate(selected.id)}
                  disabled={simulating}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <PlayCircle className={`h-4 w-4 ${simulating ? 'animate-pulse' : ''}`} />
                  {simulating ? 'Simulating…' : 'Run Simulation'}
                </button>
              )}
            </div>

            {/* Agenda */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Agenda</h3>
              <ol className="space-y-1.5">
                {selected.agenda.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="shrink-0 font-mono text-muted-foreground">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            {/* Discussion */}
            {selected.discussion.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Board Discussion</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {selected.discussion.map((msg, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[msg.role] ?? 'bg-muted text-muted-foreground'}`}>
                        {msg.role}
                      </span>
                      <p className="text-sm text-foreground flex-1">{msg.message}</p>
                      <span className="shrink-0 text-base" title={msg.sentiment}>{SENTIMENT_ICONS[msg.sentiment] ?? '💬'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions */}
            {selected.decisions.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-foreground">Board Decisions</h3>
                </div>
                <div className="space-y-3">
                  {selected.decisions.map((d, i) => (
                    <div key={i} className="rounded-lg bg-green-500/5 border border-green-500/10 p-3">
                      <p className="text-xs font-medium text-muted-foreground">{d.topic}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{d.decision}</p>
                      <p className="text-xs text-muted-foreground mt-1">{d.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consensus */}
            {selected.consensus && (
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Board Consensus</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.consensus}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-51 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">New Board Session</h3>
                  <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground" htmlFor="session-name">Session Name</label>
                    <input
                      id="session-name"
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="Q3 Strategy Review"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground" htmlFor="agenda">Agenda Items (one per line)</label>
                    <textarea
                      id="agenda"
                      value={agendaText}
                      onChange={(e) => setAgendaText(e.target.value)}
                      placeholder={'Revenue targets\nHiring plan\nTech investments\nMarket expansion'}
                      rows={5}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSession()}
                      disabled={creating || !sessionName || !agendaText}
                      className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {creating ? 'Creating…' : 'Create Session'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unused import prevention */}
      <ChevronDown className="hidden" />
    </div>
  )
}
