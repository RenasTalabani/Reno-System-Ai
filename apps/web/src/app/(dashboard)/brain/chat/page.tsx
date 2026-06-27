'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Brain,
  Send,
  Plus,
  Trash2,
  ChevronDown,
  User,
  Loader2,
  AlertTriangle,
  Sparkles,
  Zap,
} from 'lucide-react'

interface ProviderBadge {
  slug: string
  name: string
  model: string
  isFallback: boolean
  fallbackReason?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  provider?: string
  providerBadge?: ProviderBadge
}

interface Conversation {
  id: string
  title: string | null
  messageCount: number
  agent: { name: string; slug: string }
}

interface Agent {
  id: string
  slug: string
  name: string
  title: string
  color: string | null
}

type ProviderOption = 'reno_brain' | 'claude'

const PROVIDER_LABELS: Record<ProviderOption, string> = {
  reno_brain: 'Reno Brain',
  claude: 'Claude (Anthropic)',
}

const PROVIDER_COLORS: Record<string, string> = {
  reno_brain: 'bg-indigo-100 text-indigo-700',
  claude: 'bg-amber-100 text-amber-700',
}

function ProviderBadgeChip({ badge }: { badge: ProviderBadge }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[badge.slug] ?? 'bg-gray-100 text-gray-600'}`}>
      {badge.slug === 'claude' ? <Sparkles size={9} /> : <Brain size={9} />}
      {badge.name}
      {badge.isFallback && <span className="opacity-70">(fallback)</span>}
    </span>
  )
}

function ChatContent() {
  const searchParams = useSearchParams()
  const [agents, setAgents] = useState<Agent[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('reno-ceo')
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption>('reno_brain')
  const [claudeAvailable, setClaudeAvailable] = useState(false)
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [agentDropdown, setAgentDropdown] = useState(false)
  const [providerDropdown, setProviderDropdown] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const agentParam = searchParams.get('agent')
    const convParam = searchParams.get('conversation')
    if (agentParam) setSelectedAgent(agentParam)
    if (convParam) {
      setCurrentConvId(convParam)
      loadConversationMessages(convParam)
    }
    Promise.all([
      fetch('/api/v1/brain/agents').then(r => r.json()),
      fetch('/api/v1/brain/chat/conversations').then(r => r.json()),
      fetch('/api/v1/admin/ai/claude/availability').then(r => r.json()),
    ]).then(([a, c, cl]) => {
      setAgents(a.data ?? [])
      setConversations(c.data ?? [])
      setClaudeAvailable(cl.data?.available === true)
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversationMessages(convId: string) {
    setLoadingMessages(true)
    try {
      const r = await fetch(`/api/v1/brain/chat/conversations/${convId}/messages`)
      const d = await r.json()
      // Map DB messages to UI format
      const msgs: Message[] = (d.data?.messages ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        provider: m.provider,
        providerBadge: m.metadata?.providerBadge,
      }))
      setMessages(msgs)
    } finally {
      setLoadingMessages(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    setSending(true)

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      role: 'user',
      content: userMsg,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const r = await fetch('/api/v1/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          agentSlug: selectedAgent,
          conversationId: currentConvId,
          provider: selectedProvider,
        }),
      })
      const d = await r.json()
      if (d.success) {
        setCurrentConvId(d.data.conversationId)
        const uMsg: Message = d.data.userMessage ?? { ...optimistic, id: `user-${Date.now()}` }
        const aMsg: Message = {
          ...d.data.assistantMessage,
          providerBadge: d.data.providerBadge,
        }
        setMessages(prev => [...prev.filter(m => m.id !== optimistic.id), uMsg, aMsg])
        const c = await fetch('/api/v1/brain/chat/conversations').then(r2 => r2.json())
        setConversations(c.data ?? [])
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  function newConversation() {
    setCurrentConvId(null)
    setMessages([])
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/v1/brain/chat/conversations/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (currentConvId === id) newConversation()
  }

  const currentAgent = agents.find(a => a.slug === selectedAgent)
  const availableProviders: ProviderOption[] = claudeAvailable
    ? ['reno_brain', 'claude']
    : ['reno_brain']

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <button type="button" onClick={newConversation}
            className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm rounded-lg font-medium">
            <Plus size={14} />New Conversation
          </button>
        </div>

        {/* Agent selector */}
        <div className="p-3 border-b border-gray-100 space-y-3">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Agent</label>
            <div className="relative">
              <button type="button" onClick={() => setAgentDropdown(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100">
                <span className="truncate">{currentAgent?.name ?? 'Select Agent'}</span>
                <ChevronDown size={12} className="text-gray-400 shrink-0" />
              </button>
              {agentDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                  {agents.map(a => (
                    <button type="button" key={a.id} onClick={() => { setSelectedAgent(a.slug); setAgentDropdown(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedAgent === a.slug ? 'bg-indigo-50 text-indigo-700' : 'text-gray-800'}`}>
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-gray-400 block">{a.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Provider selector */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">AI Provider</label>
            <div className="relative">
              <button type="button" onClick={() => setProviderDropdown(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100">
                <span className="flex items-center gap-1.5">
                  {selectedProvider === 'claude' ? <Sparkles size={12} className="text-amber-500" /> : <Brain size={12} className="text-indigo-500" />}
                  <span className="truncate">{PROVIDER_LABELS[selectedProvider]}</span>
                </span>
                <ChevronDown size={12} className="text-gray-400 shrink-0" />
              </button>
              {providerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                  {availableProviders.map(p => (
                    <button type="button" key={p} onClick={() => { setSelectedProvider(p); setProviderDropdown(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${selectedProvider === p ? 'bg-indigo-50 text-indigo-700' : 'text-gray-800'}`}>
                      {p === 'claude' ? <Sparkles size={12} className="text-amber-500" /> : <Brain size={12} className="text-indigo-500" />}
                      {PROVIDER_LABELS[p]}
                    </button>
                  ))}
                  {!claudeAvailable && (
                    <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                      <Zap size={10} className="inline mr-1" />
                      <a href="/settings/ai-providers" className="underline">Enable Claude</a> in Settings
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-gray-400 font-medium px-2 py-1">History</p>
          {conversations.length === 0
            ? <p className="text-xs text-gray-400 px-2 py-2">No conversations yet</p>
            : conversations.map(conv => (
              <div key={conv.id}
                className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-50 ${currentConvId === conv.id ? 'bg-indigo-50' : ''}`}
                onClick={() => { setCurrentConvId(conv.id); loadConversationMessages(conv.id) }}>
                <div className="min-w-0">
                  <p className={`text-xs truncate font-medium ${currentConvId === conv.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {conv.title ?? 'Conversation'}
                  </p>
                  <p className="text-xs text-gray-400">{conv.agent.name} · {conv.messageCount} msgs</p>
                </div>
                <button type="button" aria-label="Delete conversation" onClick={e => { e.stopPropagation(); deleteConversation(conv.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{currentAgent?.name ?? 'Reno Brain'}</p>
              <p className="text-xs text-gray-400">{currentAgent?.title ?? 'AI Intelligence Layer'}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${PROVIDER_COLORS[selectedProvider] ?? 'bg-gray-100 text-gray-600'}`}>
            {selectedProvider === 'claude' ? <Sparkles size={11} /> : <Brain size={11} />}
            {PROVIDER_LABELS[selectedProvider]}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />Loading...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <Brain size={28} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{currentAgent?.name ?? 'Reno Brain'}</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-sm">{currentAgent?.title ?? 'Central AI Intelligence Layer'}</p>
              <p className="text-gray-400 text-xs mt-4">Ask me anything about your business data across all modules.</p>
              {selectedProvider === 'claude' && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                  <Sparkles size={11} />
                  Claude (Anthropic) is active for this conversation
                </div>
              )}
            </div>
          ) : messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.provider === 'claude' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                  {msg.provider === 'claude' ? <Sparkles size={12} className="text-white" /> : <Brain size={12} className="text-white" />}
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-2xl">
                <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
                {/* Provider badge on AI messages */}
                {msg.role === 'assistant' && msg.providerBadge && (
                  <div className="flex items-center gap-2">
                    <ProviderBadgeChip badge={msg.providerBadge} />
                    {msg.providerBadge.isFallback && msg.providerBadge.fallbackReason && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {msg.providerBadge.fallbackReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-gray-500" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${selectedProvider === 'claude' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                {selectedProvider === 'claude' ? <Sparkles size={12} className="text-white" /> : <Brain size={12} className="text-white" />}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          {selectedProvider === 'claude' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-2">
              <Sparkles size={10} />
              Using Claude (Anthropic) — business context is sent to an external AI service
            </div>
          )}
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white transition-all">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={`Ask ${currentAgent?.name ?? 'Reno Brain'} anything...`}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-[120px]"
            />
            <button type="button" onClick={sendMessage} disabled={!input.trim() || sending}
              className={`w-8 h-8 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors shrink-0 ${selectedProvider === 'claude' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}

export default function BrainChatPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  )
}
