'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Hash, Send, Smile, Pin, Lock, Unlock, MoreHorizontal, Reply, Users } from 'lucide-react'

const EMOJI_QUICK = ['👍', '❤️', '😂', '🎉', '👀', '🚀']

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [channel, setChannel] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [pinned, setPinned] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [threadMsg, setThreadMsg] = useState<any>(null)
  const [threadReplies, setThreadReplies] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const token = () => localStorage.getItem('accessToken') ?? ''

  const loadMessages = useCallback(async () => {
    const [chRes, msgRes, pinRes] = await Promise.all([
      fetch(`/api/v1/comm/channels/${id}`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`/api/v1/comm/channels/${id}/messages?limit=80`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`/api/v1/comm/channels/${id}/pinned`, { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [chData, msgData, pinData] = await Promise.all([chRes.json(), msgRes.json(), pinRes.json()])
    if (chData.success) setChannel(chData.data)
    if (msgData.success) setMessages(msgData.data)
    if (pinData.success) setPinned(pinData.data)
    setLoading(false)
  }, [id])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/v1/comm/channels/${id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim(), parentMessageId: replyTo?.id }),
    })
    const data = await res.json()
    if (data.success) {
      setMessages(prev => [...prev, data.data])
      setText('')
      setReplyTo(null)
      await fetch(`/api/v1/comm/channels/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } })
    }
    setSending(false)
  }

  async function react(msgId: string, emoji: string) {
    await fetch(`/api/v1/comm/channels/${id}/messages/${msgId}/react`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    await loadMessages()
  }

  async function pinMessage(msgId: string, isPinned: boolean) {
    const method = isPinned ? 'DELETE' : 'POST'
    await fetch(`/api/v1/comm/channels/${id}/messages/${msgId}/pin`, { method, headers: { Authorization: `Bearer ${token()}` } })
    await loadMessages()
  }

  async function loadThread(msg: any) {
    setThreadMsg(msg)
    const res = await fetch(`/api/v1/comm/channels/${id}/threads/${msg.id}`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    if (data.success) setThreadReplies(data.data)
  }

  async function loadMembers() {
    const res = await fetch(`/api/v1/comm/channels/${id}/members`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    if (data.success) { setMembers(data.data); setShowMembers(true) }
  }

  function groupByDate(msgs: any[]) {
    const groups: Record<string, any[]> = {}
    msgs.forEach(m => {
      const day = new Date(m.createdAt).toLocaleDateString()
      if (!groups[day]) groups[day] = []
      groups[day].push(m)
    })
    return groups
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  const grouped = groupByDate(messages)

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      {/* Main channel */}
      <div className="flex flex-col flex-1 min-w-0 bg-white border border-gray-100 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
          <button onClick={() => router.back()} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Hash className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">#{channel?.name}</p>
            {channel?.topic && <p className="text-xs text-gray-400 truncate">{channel.topic}</p>}
          </div>
          <div className="flex items-center gap-2">
            {pinned.length > 0 && (
              <button onClick={() => setShowPinned(!showPinned)} className={`p-1.5 rounded hover:bg-gray-100 ${showPinned ? 'text-indigo-600' : 'text-gray-400'}`}>
                <Pin className="w-4 h-4" />
              </button>
            )}
            <button onClick={loadMembers} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pinned banner */}
        {showPinned && pinned.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2">
            <p className="text-xs font-medium text-yellow-700 mb-1">Pinned Messages</p>
            {pinned.map(m => (
              <p key={m.id} className="text-xs text-gray-600 line-clamp-1">📌 {m.content}</p>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {Object.entries(grouped).map(([day, msgs]) => (
            <div key={day}>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 shrink-0">{day}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {msgs.map(msg => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  onReact={react}
                  onPin={pinMessage}
                  onReply={() => setReplyTo(msg)}
                  onThread={() => loadThread(msg)}
                />
              ))}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3 shrink-0">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Reply className="w-3 h-3 text-indigo-400" />
              <span className="truncate flex-1">Replying to: {replyTo.content}</span>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              placeholder={`Message #${channel?.name}`}
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

      {/* Thread panel */}
      {threadMsg && (
        <div className="w-80 border-l border-gray-100 bg-white flex flex-col ml-4 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Thread</p>
            <button onClick={() => { setThreadMsg(null); setThreadReplies([]) }} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Original</p>
              <p className="text-sm text-gray-700">{threadMsg.content}</p>
            </div>
            {threadReplies.map(r => (
              <MessageRow key={r.id} msg={r} onReact={react} onPin={() => {}} onReply={() => {}} onThread={() => {}} compact />
            ))}
          </div>
        </div>
      )}

      {/* Members panel */}
      {showMembers && (
        <div className="w-64 border-l border-gray-100 bg-white flex flex-col ml-4 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Members ({members.length})</p>
            <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 font-bold">
                  {m.userId.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">Member</p>
                  <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MessageRow({ msg, onReact, onPin, onReply, onThread, compact }: {
  msg: any, onReact: (id: string, emoji: string) => void, onPin: (id: string, pinned: boolean) => void,
  onReply: () => void, onThread: () => void, compact?: boolean,
}) {
  const [hover, setHover] = useState(false)
  const isDeleted = msg.deletedAt !== null

  if (isDeleted) return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
      <p className="text-sm text-gray-300 italic">[message deleted]</p>
    </div>
  )

  return (
    <div
      className={`group flex items-start gap-2 ${compact ? 'py-1' : 'py-1.5'} rounded-lg px-2 hover:bg-gray-50 relative`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 font-bold shrink-0 mt-0.5`}>
        U
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-700">User</span>
          {msg.isEdited && <span className="text-xs text-gray-300">(edited)</span>}
          {msg.isPinned && <span className="text-xs text-yellow-500">📌</span>}
          {msg.isAiGenerated && <span className="text-xs text-purple-400 bg-purple-50 px-1 rounded">AI</span>}
          <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-sm text-gray-700 break-words leading-relaxed mt-0.5">{msg.content}</p>

        {/* Reactions */}
        {msg.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(
              msg.reactions.reduce((acc: Record<string, number>, r: any) => {
                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc
              }, {})
            ).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-indigo-100 px-1.5 py-0.5 rounded-full transition-colors">
                {emoji} <span className="text-gray-500">{count as number}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread info */}
        {msg._count?.replies > 0 && (
          <button onClick={onThread} className="flex items-center gap-1 mt-1 text-xs text-indigo-600 hover:underline">
            <Reply className="w-3 h-3" /> {msg._count.replies} {msg._count.replies === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Hover toolbar */}
      {hover && !compact && (
        <div className="absolute right-2 top-1 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5 z-10">
          {EMOJI_QUICK.map(e => (
            <button key={e} onClick={() => onReact(msg.id, e)} className="text-sm hover:scale-125 transition-transform px-0.5">
              {e}
            </button>
          ))}
          <button onClick={onReply} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600" title="Reply in thread">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onPin(msg.id, msg.isPinned)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-yellow-500" title={msg.isPinned ? 'Unpin' : 'Pin'}>
            <Pin className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
