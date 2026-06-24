'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Video, Users, Clock, CheckCircle, XCircle, Zap, FileText } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [meeting, setMeeting] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [aiActionItems, setAiActionItems] = useState('')
  const [savingAi, setSavingAi] = useState(false)

  const token = () => localStorage.getItem('accessToken') ?? ''

  const load = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([
      fetch(`/api/v1/comm/meetings/${id}`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`/api/v1/comm/meetings/${id}/participants`, { headers: { Authorization: `Bearer ${token()}` } }),
    ])
    const [mData, pData] = await Promise.all([mRes.json(), pRes.json()])
    if (mData.success) { setMeeting(mData.data); setAiSummary(mData.data.aiSummary ?? '') }
    if (pData.success) setParticipants(pData.data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function action(path: string, body?: any) {
    await fetch(`/api/v1/comm/meetings/${id}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    await load()
  }

  async function saveAi() {
    setSavingAi(true)
    let parsedItems
    try { parsedItems = aiActionItems ? JSON.parse(aiActionItems) : undefined } catch { parsedItems = aiActionItems ? [aiActionItems] : undefined }
    await fetch(`/api/v1/comm/meetings/${id}/ai-summary`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiSummary, aiActionItems: parsedItems }),
    })
    await load()
    setSavingAi(false)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!meeting) return <div className="text-center py-20 text-gray-400">Meeting not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{meeting.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[meeting.status] ?? ''}`}>{meeting.status}</span>
            <span className="text-xs text-gray-400 capitalize">{meeting.type}</span>
          </div>
          {meeting.description && <p className="text-sm text-gray-500 mt-0.5">{meeting.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-4">
          {/* Meeting room */}
          <div className="bg-gray-900 rounded-xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <p className="text-white text-lg font-semibold mb-2">{meeting.title}</p>
            <p className="text-gray-400 text-sm mb-6">
              {meeting.status === 'active' ? 'Meeting in progress' : meeting.status === 'scheduled' ? 'Meeting not started yet' : 'Meeting has ended'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {meeting.status === 'scheduled' && (
                <button onClick={() => action('/start')}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium">
                  <Video className="w-5 h-5" /> Start Meeting
                </button>
              )}
              {meeting.status === 'active' && (
                <>
                  <button onClick={() => action('/join')}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
                    <Video className="w-5 h-5" /> Join
                  </button>
                  <button onClick={() => action('/end')}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium">
                    <XCircle className="w-5 h-5" /> End Meeting
                  </button>
                </>
              )}
            </div>
            {meeting.roomToken && (
              <p className="text-xs text-gray-600 mt-4">Room: {meeting.roomToken}</p>
            )}
          </div>

          {/* Agenda */}
          {meeting.agenda && Array.isArray(meeting.agenda) && meeting.agenda.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Agenda</h2>
              <div className="space-y-2">
                {meeting.agenda.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <p className="text-sm text-gray-700">{item.item}</p>
                    </div>
                    {item.duration && <span className="text-xs text-gray-400">{item.duration} min</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-semibold text-gray-700">AI Meeting Summary</h2>
            </div>
            <textarea
              rows={4}
              placeholder="AI-generated meeting summary will appear here. You can also write your own."
              value={aiSummary}
              onChange={e => setAiSummary(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none mb-3"
            />
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Action Items (JSON array or freetext)</label>
              <textarea
                rows={2}
                placeholder={`["Follow up with team", "Review proposal by Friday"]`}
                value={typeof meeting.aiActionItems === 'object' ? JSON.stringify(meeting.aiActionItems) : (aiActionItems || '')}
                onChange={e => setAiActionItems(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              />
            </div>
            <button onClick={saveAi} disabled={savingAi}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors">
              {savingAi ? 'Saving...' : 'Save Summary'}
            </button>

            {meeting.aiActionItems && Array.isArray(meeting.aiActionItems) && meeting.aiActionItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Action Items</p>
                <ul className="space-y-1">
                  {meeting.aiActionItems.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3 text-sm">
            <h2 className="font-semibold text-gray-700">Details</h2>
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-24 shrink-0">Organizer</span>
              <span className="text-gray-700">{meeting.organizerId?.slice(0, 8)}...</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-24 shrink-0">Type</span>
              <span className="text-gray-700 capitalize">{meeting.type}</span>
            </div>
            {meeting.scheduledAt && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Scheduled</span>
                <span className="text-gray-700">{new Date(meeting.scheduledAt).toLocaleString()}</span>
              </div>
            )}
            {meeting.startedAt && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Started</span>
                <span className="text-gray-700">{new Date(meeting.startedAt).toLocaleString()}</span>
              </div>
            )}
            {meeting.endedAt && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Ended</span>
                <span className="text-gray-700">{new Date(meeting.endedAt).toLocaleString()}</span>
              </div>
            )}
            {meeting.durationMinutes && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Duration</span>
                <span className="text-gray-700">{meeting.durationMinutes} minutes</span>
              </div>
            )}
            {meeting.maxParticipants && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Max</span>
                <span className="text-gray-700">{meeting.maxParticipants} participants</span>
              </div>
            )}
            {meeting.channel && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Channel</span>
                <span className="text-indigo-600">#{meeting.channel.name}</span>
              </div>
            )}
            {meeting.relatedEntityType && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-24 shrink-0">Linked To</span>
                <span className="text-gray-700 capitalize">{meeting.relatedEntityType}</span>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Participants ({participants.length})</h2>
            </div>
            <div className="space-y-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 font-bold">
                    {p.userId.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 capitalize">{p.role}</p>
                    {p.joinedAt && <p className="text-xs text-gray-400">Joined {new Date(p.joinedAt).toLocaleTimeString()}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {p.hasVideo && <span className="text-xs text-gray-400" title="Video on">📷</span>}
                    {p.hasAudio && <span className="text-xs text-gray-400" title="Audio on">🎤</span>}
                  </div>
                </div>
              ))}
              {participants.length === 0 && <p className="text-xs text-gray-400">No participants yet</p>}
            </div>
          </div>

          {/* Recording */}
          {meeting.hasRecording && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-700">Recording Available</p>
              </div>
              {meeting.recordingUrl && (
                <a href={meeting.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">
                  View Recording →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
