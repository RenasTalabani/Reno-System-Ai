'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Send, Bot, User, ArrowLeft, Loader2, Brain } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  ceo: 'from-purple-600 to-indigo-600',
  coo: 'from-blue-600 to-cyan-600',
  cfo: 'from-green-600 to-emerald-600',
  chro: 'from-rose-600 to-pink-600',
  sales_director: 'from-orange-500 to-amber-500',
  procurement_director: 'from-teal-600 to-green-600',
  production_director: 'from-yellow-600 to-orange-600',
  support_director: 'from-sky-600 to-blue-600',
  project_director: 'from-violet-600 to-purple-600',
  analyst: 'from-slate-600 to-gray-600',
}

interface Msg { role: 'user' | 'assistant'; content: string }

export default function ExecChatPage() {
  const { role } = useParams<{ role: string }>()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [execName, setExecName] = useState('')
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loadingBriefing, setLoadingBriefing] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/v1/ai-exec/executives/${role}/briefing`).then(r => r.json()).then(d => {
      if (d.data) {
        setExecName(d.data.executiveName)
        setBriefing(d.data.briefing)
      }
      setLoadingBriefing(false)
    }).catch(() => setLoadingBriefing(false))
  }, [role])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/ai-exec/executives/${role}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationId: convId }),
      }).then(r => r.json())
      if (res.data) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
        setConvId(res.data.conversationId)
        setExecName(res.data.executiveName)
      }
    } finally {
      setLoading(false)
    }
  }

  const colorClass = ROLE_COLORS[role] ?? 'from-gray-600 to-gray-700'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colorClass} px-6 py-4 text-white`}>
        <div className="flex items-center gap-3">
          <Link href="/ai-executive" className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className={`w-10 h-10 rounded-full bg-white/20 flex items-center justify-center`}>
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">{execName || role}</h1>
            <p className="text-white/70 text-xs">AI Executive · Live company data · Human approval required for actions</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* Daily briefing */}
        {loadingBriefing ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating briefing...
          </div>
        ) : briefing ? (
          <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-600">DAILY BRIEFING</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{briefing}</p>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-gray-200' : `bg-gradient-to-br ${colorClass}`}`}>
              {m.role === 'user' ? <User className="w-4 h-4 text-gray-600" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 border border-gray-100 shadow-sm'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${colorClass}`}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white p-4">
        <p className="text-xs text-amber-600 mb-2 text-center">⚠ All AI proposals require human approval before execution</p>
        <div className="flex gap-3">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder={`Ask ${execName || role} anything about your business...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          />
          <button onClick={send} disabled={!input.trim() || loading}
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${colorClass} text-white disabled:opacity-40 hover:opacity-90 transition-opacity`}>
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
