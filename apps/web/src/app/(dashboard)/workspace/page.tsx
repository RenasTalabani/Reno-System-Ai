'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles, Send, Plus, Trash2, Search, Brain, MessageSquare, Bot, User,
  ChevronRight, Command, Loader2
} from 'lucide-react'

const TENANT_ID = 'default-tenant'
const USER_ID = 'default-user'

interface Message {
  id: string; role: 'user' | 'assistant'; content: string
  commandType?: string; requiresApproval?: boolean; createdAt: string
}

interface Session {
  id: string; title: string | null; messageCount: number; lastActiveAt: string
}

const COMMAND_TYPE_COLORS: Record<string, string> = {
  search: 'bg-blue-100 text-blue-700', report: 'bg-emerald-100 text-emerald-700',
  document: 'bg-amber-100 text-amber-700', dashboard: 'bg-cyan-100 text-cyan-700',
  task: 'bg-violet-100 text-violet-700', analyze: 'bg-rose-100 text-rose-700',
  general: 'bg-gray-100 text-gray-600',
}

const QUICK_PROMPTS = [
  { label: '🔍 Search employees', prompt: 'Find all employees in the system' },
  { label: '📊 Sales report', prompt: 'Generate a sales performance report for this month' },
  { label: '📄 Draft proposal', prompt: 'Draft a business proposal document for a new client' },
  { label: '📈 Create dashboard', prompt: 'Create a dashboard for executive KPIs' },
  { label: '✅ Create task', prompt: 'Create a task to review quarterly finances' },
]

export default function WorkspacePage() {
  const params = useSearchParams()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(params.get('sessionId'))
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadSessions() }, [])

  useEffect(() => {
    if (activeSessionId) loadMessages(activeSessionId)
  }, [activeSessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadSessions() {
    setLoadingSessions(true)
    const res = await fetch(`/api/v1/ai-workspace/sessions?tenantId=${TENANT_ID}&userId=${USER_ID}`)
      .then(r => r.json()).catch(() => ({}))
    setSessions(res.sessions ?? [])
    setLoadingSessions(false)
  }

  async function loadMessages(sessionId: string) {
    const res = await fetch(`/api/v1/ai-workspace/sessions/${sessionId}?tenantId=${TENANT_ID}`)
      .then(r => r.json()).catch(() => ({}))
    setMessages(res.session?.messages ?? [])
  }

  async function handleSend(promptOverride?: string) {
    const text = promptOverride ?? input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    const res = await fetch('/api/v1/ai-workspace/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, userId: USER_ID, message: text, sessionId: activeSessionId ?? undefined }),
    }).then(r => r.json()).catch(() => null)

    if (res?.message) {
      setMessages(prev => [...prev, res.message])
      if (!activeSessionId) {
        setActiveSessionId(res.sessionId)
        loadSessions()
      }
    }
    setSending(false)
    textareaRef.current?.focus()
  }

  async function handleNewChat() {
    setActiveSessionId(null)
    setMessages([])
  }

  async function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/v1/ai-workspace/sessions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID }),
    })
    if (activeSessionId === id) { setActiveSessionId(null); setMessages([]) }
    loadSessions()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-violet-600" />
            <span className="font-semibold text-gray-900 text-sm">AI Workspace</span>
          </div>
          <button type="button" onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus size={14} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingSessions ? (
            <div className="p-4 text-center text-gray-400 text-xs">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">No conversations yet</div>
          ) : sessions.map(s => (
            <button key={s.id} type="button"
              onClick={() => setActiveSessionId(s.id)}
              className={`w-full flex items-start gap-2 p-2.5 rounded-lg text-left mb-1 group transition ${activeSessionId === s.id ? 'bg-violet-50 border border-violet-200' : 'hover:bg-gray-50'}`}>
              <MessageSquare size={12} className="text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">{s.title ?? 'New Chat'}</div>
                <div className="text-xs text-gray-400">{s.messageCount} messages</div>
              </div>
              <button type="button"
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 shrink-0">
                <Trash2 size={11} />
              </button>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <Link href="/workspace/search" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 rounded-lg hover:bg-gray-50">
            <Search size={12} /> Universal Search
          </Link>
          <Link href="/workspace/memory" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 rounded-lg hover:bg-gray-50">
            <Brain size={12} /> Memory
          </Link>
          <Link href="/workspace/commands" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 rounded-lg hover:bg-gray-50">
            <Command size={12} /> Commands
          </Link>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
          <Sparkles size={16} className="text-violet-500" />
          <span className="font-semibold text-gray-900 text-sm">
            {activeSessionId ? sessions.find(s => s.id === activeSessionId)?.title ?? 'AI Assistant' : 'AI Workspace'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full font-medium flex items-center gap-1">
              <Brain size={10} /> Reno Brain
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100">
                <Sparkles size={28} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Workspace Assistant</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-md">
                  Ask me anything about your business. I can search data, generate reports, draft documents, create dashboards and more.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {QUICK_PROMPTS.map(p => (
                  <button key={p.prompt} type="button"
                    onClick={() => handleSend(p.prompt)}
                    className="text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition flex items-center gap-2">
                    {p.label} <ChevronRight size={12} className="ml-auto text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-violet-600" />
                  </div>
                )}
                <div className={`max-w-2xl ${msg.role === 'user' ? 'order-first' : ''}`}>
                  {msg.commandType && msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COMMAND_TYPE_COLORS[msg.commandType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {msg.commandType}
                      </span>
                      {msg.requiresApproval && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          ⚠ Requires Approval
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-violet-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your business... (Enter to send, Shift+Enter for newline)"
                className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
            </div>
            <button type="button" onClick={() => handleSend()} disabled={!input.trim() || sending}
              className="w-10 h-10 bg-violet-600 text-white rounded-xl flex items-center justify-center hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 px-1">
            <span className="text-xs text-gray-400">Reno Brain · Enterprise AI</span>
            <span className="text-xs text-gray-400 ml-auto">Enter to send · Shift+Enter for newline</span>
          </div>
        </div>
      </div>
    </div>
  )
}
