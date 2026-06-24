'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'

const EMOJI_QUICK = ['👍', '❤️', '😂', '🎉', '👀', '🚀']

export default function DmConversationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const [convRes, msgRes] = await Promise.all([
      fetch(`/api/v1/comm/dm/${id}`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`/api/v1/comm/dm/${id}/messages?limit=80`, { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [convData, msgData] = await Promise.all([convRes.json(), msgRes.json()])
    if (convData.success) setConversation(convData.data)
    if (msgData.success) setMessages(msgData.data)
    setLoading(false)

    await fetch(`/api/v1/comm/dm/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } })
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/v1/comm/dm/${id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    })
    const data = await res.json()
    if (data.success) { setMessages(prev => [...prev, data.data]); setText('') }
    setSending(false)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  const title = conversation?.isGroup
    ? (conversation.name ?? 'Group DM')
    : `Direct Message (${conversation?.participants?.length ?? 0} participants)`

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={() => router.back()} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm text-purple-700 font-bold">
          {title.charAt(0).toUpperCase()}
        </div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <span className="text-xs text-gray-400">
          {conversation?.participants?.length ?? 0} participant{conversation?.participants?.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No messages yet. Say hello!</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`group flex items-start gap-2 py-1 rounded-lg px-2 hover:bg-gray-50`}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 font-bold shrink-0 mt-0.5">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-gray-700">You</span>
                <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.isEdited && <span className="text-xs text-gray-300">(edited)</span>}
              </div>
              <p className={`text-sm leading-relaxed mt-0.5 ${msg.deletedAt ? 'text-gray-300 italic' : 'text-gray-700'}`}>
                {msg.deletedAt ? '[message deleted]' : msg.content}
              </p>
              {msg.reactions?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Object.entries(
                    msg.reactions.reduce((acc: Record<string, number>, r: any) => {
                      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc
                    }, {})
                  ).map(([emoji, count]) => (
                    <span key={emoji} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {emoji} {count as number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            placeholder="Write a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
          <button onClick={send} disabled={!text.trim() || sending}
            className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
