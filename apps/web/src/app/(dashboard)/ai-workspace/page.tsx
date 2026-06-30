'use client'

import { useState, useRef, useEffect } from 'react'

interface Message { role: 'user' | 'assistant'; content: string; provider?: string }
interface Task { id: string; title: string; status: string; updatedAt: string }
interface Document { id: string; name: string; type: string; status: string }
interface MemoryEntry { id: string; type: string; key: string }
interface SearchResult { module: string; type: string; id: string; title: string; subtitle?: string }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API}/v1${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  })
  return res.json()
}

export default function AIWorkspacePage() {
  const [activeTab, setActiveTab] = useState<'command' | 'search' | 'tasks' | 'documents' | 'memory'>('command')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')

  // Documents
  const [docs, setDocs] = useState<Document[]>([])
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('pdf')
  const [docContent, setDocContent] = useState('')

  // Memory
  const [memory, setMemory] = useState<MemoryEntry[]>([])
  const [memType, setMemType] = useState('project')
  const [memKey, setMemKey] = useState('')
  const [memValue, setMemValue] = useState('')

  // Summary
  const [summary, setSummary] = useState({ activeSessions: 0, pendingTasks: 0, documents: 0, memories: 0, recentSearches: 0 })

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadSummary() }, [])
  useEffect(() => { if (activeTab === 'tasks') loadTasks() }, [activeTab])
  useEffect(() => { if (activeTab === 'documents') loadDocs() }, [activeTab])
  useEffect(() => { if (activeTab === 'memory') loadMemory() }, [activeTab])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadSummary() {
    const res = await apiFetch('/ai-workspace/summary').catch(() => null)
    if (res?.success) setSummary(res.data)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await apiFetch('/ai-workspace/command', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg.content, sessionId, provider: 'reno-brain' }),
      })
      if (res.success) {
        setSessionId(res.data.sessionId)
        setMessages(m => [...m, { role: 'assistant', content: res.data.reply, provider: res.data.provider }])
        loadSummary()
      } else {
        setMessages(m => [...m, { role: 'assistant', content: `Error: ${res.error ?? 'Unknown error'}` }])
      }
    } finally {
      setLoading(false)
    }
  }

  async function doSearch() {
    if (!searchQuery.trim() || searching) return
    setSearching(true)
    try {
      const res = await apiFetch(`/ai-workspace/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.success) setSearchResults(res.data.results)
    } finally { setSearching(false) }
  }

  async function loadTasks() {
    const res = await apiFetch('/ai-workspace/tasks')
    if (res.success) setTasks(res.data)
  }

  async function createTask() {
    if (!taskTitle.trim()) return
    const res = await apiFetch('/ai-workspace/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: taskTitle, description: taskDesc }),
    })
    if (res.success) { setTaskTitle(''); setTaskDesc(''); loadTasks() }
  }

  async function approveTask(id: string) {
    await apiFetch(`/ai-workspace/tasks/${id}/approve`, { method: 'POST' })
    loadTasks()
  }

  async function loadDocs() {
    const res = await apiFetch('/ai-workspace/documents')
    if (res.success) setDocs(res.data)
  }

  async function analyzeDoc() {
    if (!docContent.trim() || !docName.trim()) return
    const res = await apiFetch('/ai-workspace/documents/analyze', {
      method: 'POST',
      body: JSON.stringify({ name: docName, type: docType, content: docContent }),
    })
    if (res.success) { setDocName(''); setDocContent(''); loadDocs() }
  }

  async function loadMemory() {
    const res = await apiFetch('/ai-workspace/memory')
    if (res.success) setMemory(res.data)
  }

  async function saveMemory() {
    if (!memKey.trim() || !memValue.trim()) return
    const res = await apiFetch('/ai-workspace/memory', {
      method: 'POST',
      body: JSON.stringify({ type: memType, key: memKey, value: { data: memValue } }),
    })
    if (res.success) { setMemKey(''); setMemValue(''); loadMemory() }
  }

  const statusColor: Record<string, string> = {
    pending_approval: 'bg-yellow-100 text-yellow-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    analyzed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
  }

  const tabs = [
    { id: 'command', label: 'AI Command' },
    { id: 'search', label: 'Universal Search' },
    { id: 'tasks', label: 'Task Executor' },
    { id: 'documents', label: 'Document AI' },
    { id: 'memory', label: 'Workspace Memory' },
  ] as const

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Workspace</h1>
        <p className="text-sm text-gray-500 mt-1">Universal Desktop Assistant powered by Reno Brain — external AI providers require explicit tenant opt-in</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Active Sessions', value: summary.activeSessions },
          { label: 'Pending Tasks', value: summary.pendingTasks },
          { label: 'Documents', value: summary.documents },
          { label: 'Memory Entries', value: summary.memories },
          { label: 'Searches', value: summary.recentSearches },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Command Center */}
      {activeTab === 'command' && (
        <div className="bg-white border rounded-lg flex flex-col" style={{ height: 520 }}>
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Reno Brain Command Center</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">Provider: reno-brain</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-16">
                <div className="text-4xl mb-3">🧠</div>
                <p className="text-sm">Ask Reno Brain anything. Try: "search for customers", "help me analyze a document", "what can you do?"</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {m.content}
                  {m.provider && m.role === 'assistant' && (
                    <div className="text-xs opacity-60 mt-1">{m.provider}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2 text-sm text-gray-500 animate-pulse">Reno Brain is thinking...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t p-3 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask Reno Brain anything..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700 transition-colors">
              Send
            </button>
          </div>
        </div>
      )}

      {/* Universal Search */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="Search across CRM, HR, Finance, Docs, Tasks..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <button onClick={doSearch} disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700">
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
          {searchResults.length > 0 && (
            <div className="bg-white border rounded-lg divide-y">
              {searchResults.map(r => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap">{r.module}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{r.title}</div>
                    {r.subtitle && <div className="text-xs text-gray-400">{r.type} · {r.subtitle}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="text-center text-gray-400 py-8 text-sm">No results found for "{searchQuery}"</div>
          )}
        </div>
      )}

      {/* Task Executor */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Create AI Task</h3>
            <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={3}
              placeholder="Describe steps (one per line) or just describe what you need..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <div className="flex items-center gap-2">
              <button onClick={createTask} disabled={!taskTitle.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700">
                Create Task (Requires Approval)
              </button>
              <span className="text-xs text-gray-400">All tasks require your approval before execution</span>
            </div>
          </div>
          <div className="bg-white border rounded-lg divide-y">
            {tasks.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">No tasks yet</div>}
            {tasks.map(t => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{t.title}</div>
                  <div className="text-xs text-gray-400">{new Date(t.updatedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status] ?? 'bg-gray-100 text-gray-600'}`}>{t.status.replace(/_/g, ' ')}</span>
                  {t.status === 'pending_approval' && (
                    <button onClick={() => approveTask(t.id)} className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document AI */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Analyze Document</h3>
            <div className="flex gap-2">
              <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Document name"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['pdf', 'word', 'excel', 'markdown', 'text', 'code'].map(t => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <textarea value={docContent} onChange={e => setDocContent(e.target.value)} rows={5}
              placeholder="Paste document content here for AI analysis..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <button onClick={analyzeDoc} disabled={!docContent.trim() || !docName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700">
              Analyze Document
            </button>
          </div>
          <div className="bg-white border rounded-lg divide-y">
            {docs.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">No documents analyzed yet</div>}
            {docs.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{d.name}</div>
                  <div className="text-xs text-gray-400">{d.type.toUpperCase()}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[d.status] ?? 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Memory */}
      {activeTab === 'memory' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Save to Memory</h3>
            <div className="flex gap-2">
              <select value={memType} onChange={e => setMemType(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['project', 'file', 'favorite', 'recent', 'note'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input value={memKey} onChange={e => setMemKey(e.target.value)} placeholder="Key (e.g. my-project)"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <textarea value={memValue} onChange={e => setMemValue(e.target.value)} rows={2}
              placeholder="Value to remember..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <button onClick={saveMemory} disabled={!memKey.trim() || !memValue.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700">
              Save to Workspace Memory
            </button>
          </div>
          <div className="bg-white border rounded-lg divide-y">
            {memory.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">No memory entries yet</div>}
            {memory.map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{m.type}</span>
                <div className="text-sm text-gray-800">{m.key}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
