'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Hash, Users, Video, Bell, Search,
  ArrowRight, Megaphone, Clock, Star,
} from 'lucide-react'

interface DashboardData {
  summary: {
    totalChannels: number
    totalTeams: number
    totalMessages: number
    messagestoday: number
    activeMeetings: number
    unreadMentions: number
  }
  upcomingMeetings: any[]
  recentAnnouncements: any[]
  myChannels: any[]
}

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  important: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export default function CommunicationPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const token = () => localStorage.getItem('accessToken') ?? ''

  useEffect(() => {
    fetch('/api/v1/comm/dashboard', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const s = data?.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
          <p className="text-sm text-gray-500 mt-1">Team collaboration and messaging hub</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/communication/channels" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            <Hash className="w-4 h-4" /> Channels
          </Link>
          <Link href="/communication/meetings" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            <Video className="w-4 h-4" /> New Meeting
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Channels', value: s?.totalChannels ?? 0, icon: Hash, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/communication/channels' },
          { label: 'Teams', value: s?.totalTeams ?? 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', link: '/communication/channels' },
          { label: 'Active Meetings', value: s?.activeMeetings ?? 0, icon: Video, color: 'text-green-600', bg: 'bg-green-50', link: '/communication/meetings' },
          { label: 'Unread Mentions', value: s?.unreadMentions ?? 0, icon: Bell, color: 'text-red-600', bg: 'bg-red-50', link: '/communication/channels' },
        ].map(card => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.link} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Today stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Messages Today</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{s?.messagestoday ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">{s?.totalMessages ?? 0} total messages</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Quick Search</p>
          </div>
          <Link href="/communication/channels"
            className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            <Search className="w-3.5 h-3.5" /> Search messages...
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* My Channels */}
        <div className="col-span-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">My Channels</p>
            <Link href="/communication/channels" className="text-xs text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          {!data?.myChannels.length ? (
            <div className="p-12 text-center text-gray-400 text-sm">No channels yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.myChannels.slice(0, 8).map(m => (
                <Link key={m.id} href={`/communication/channels/${m.channel.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">#{m.channel.name}</p>
                    {m.channel.lastMessageAt && (
                      <p className="text-xs text-gray-400">Last message {new Date(m.channel.lastMessageAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{m.channel.messageCount} msgs</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links + Upcoming */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Quick Links</p>
            <div className="space-y-2">
              {[
                { label: 'Direct Messages', href: '/communication/dm', icon: MessageSquare },
                { label: 'Meetings', href: '/communication/meetings', icon: Video },
                { label: 'Announcements', href: '/communication/announcements', icon: Megaphone },
              ].map(l => {
                const Icon = l.icon
                return (
                  <Link key={l.href} href={l.href} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1">
                    <Icon className="w-3.5 h-3.5" /> {l.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Upcoming Meetings */}
          {data?.upcomingMeetings && data.upcomingMeetings.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Upcoming Meetings</p>
              <div className="space-y-3">
                {data.upcomingMeetings.slice(0, 3).map(m => (
                  <Link key={m.id} href={`/communication/meetings/${m.id}`}
                    className="block p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                    <p className="text-xs font-medium text-indigo-800 truncate">{m.title}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-indigo-600">
                      <Clock className="w-3 h-3" />
                      {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'Instant'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Announcements */}
      {data?.recentAnnouncements && data.recentAnnouncements.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Recent Announcements</p>
            </div>
            <Link href="/communication/announcements" className="text-xs text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentAnnouncements.map(a => (
              <div key={a.id} className="flex items-start gap-4 px-5 py-4">
                <Star className={`w-4 h-4 mt-0.5 shrink-0 ${a.isPinned ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[a.priority] ?? ''}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleDateString()} · {a._count?.reads ?? 0} read</p>
                </div>
                {!a.reads?.length && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
