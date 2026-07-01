'use client'

import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const BASE = `${API}/v1/personal-assistant`

async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  })
  return res.json()
}

interface Briefing {
  id: string; date: string; greeting: string; focusItem?: string
  summary: {
    pendingApprovals: number; activeJobs: number; openDiscoveries: number
    alerts: { level: string; title: string; detail: string; module: string }[]
    recommendations: { priority: string; title: string; reason: string; action: string; module: string }[]
    quickStats: { label: string; value: number }[]
  }
  aiPlan: { time: string; activity: string; module?: string; priority: string }[]
}

interface Memory { id: string; category: string; key: string; value: unknown; confidence: number; learnedAt: string }
interface Habit { id: string; name: string; trigger: string; triggerValue?: string; module?: string; action: string; active: boolean; triggerCount: number }
interface WeeklyReview {
  id: string; weekStart: string; weekEnd: string; productivityScore?: number
  highlights: string[]; nextWeekFocus?: string
  accomplished: { jobsCompleted: number; stepsExecuted: number; discoveriesResolved: number }
  delayed: { jobsPending: number; openDiscoveries: number; summary: string }
  improvements: { suggestions: string[] }
}
interface Profile {
  displayName?: string; timezone: string; workStartHour: number; workEndHour: number
  reportingStyle: string; focusAreas: string[]; coachingEnabled: boolean; teamCoachEnabled: boolean; isNew?: boolean
}
interface CoachInsight { type: string; message: string; suggestion: string }
interface TimelineEvent { type: string; ts: string; label: string; module?: string; tool?: string; focusItem?: string }

type TabId = 'home' | 'profile' | 'memory' | 'habits' | 'weekly' | 'timeline' | 'coach'

const alertColors: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
}
const alertIcons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', critical: '🚨' }
const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-green-100 text-green-700',
}
const planPriorityDot: Record<string, string> = { high: 'bg-red-400', medium: 'bg-yellow-400', low: 'bg-green-400' }

export default function PersonalAssistantPage() {
  const [tab, setTab] = useState<TabId>('home')
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [coaching, setCoaching] = useState<CoachInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Profile form
  const [editProfile, setEditProfile] = useState(false)
  const [pName, setPName] = useState('')
  const [pStyle, setPStyle] = useState('brief')
  const [pStart, setPStart] = useState(9)
  const [pEnd, setPEnd] = useState(18)
  const [pCoach, setPCoach] = useState(true)
  const [pFocus, setPFocus] = useState('')

  // Memory / habit form
  const [memCat, setMemCat] = useState('preference')
  const [memKey, setMemKey] = useState('')
  const [memVal, setMemVal] = useState('')
  const [habitName, setHabitName] = useState('')
  const [habitTrigger, setHabitTrigger] = useState('time')
  const [habitTriggerVal, setHabitTriggerVal] = useState('09:00')
  const [habitAction, setHabitAction] = useState('')
  const [habitModule, setHabitModule] = useState('')

  // Focus today
  const [focusText, setFocusText] = useState('')

  const loadBriefing = useCallback(async () => {
    const r = await apiFetch('/briefing/today').catch(() => null)
    if (r?.success) setBriefing(r.data)
  }, [])

  const loadProfile = useCallback(async () => {
    const r = await apiFetch('/profile').catch(() => null)
    if (r?.success) {
      setProfile(r.data)
      setPName(r.data.displayName ?? '')
      setPStyle(r.data.reportingStyle ?? 'brief')
      setPStart(r.data.workStartHour ?? 9)
      setPEnd(r.data.workEndHour ?? 18)
      setPCoach(r.data.coachingEnabled ?? true)
      setPFocus((r.data.focusAreas ?? []).join(', '))
    }
  }, [])

  const loadMemories = useCallback(async () => {
    const r = await apiFetch('/memory').catch(() => null)
    if (r?.success) setMemories(r.data)
  }, [])

  const loadHabits = useCallback(async () => {
    const r = await apiFetch('/habits').catch(() => null)
    if (r?.success) setHabits(r.data)
  }, [])

  const loadReviews = useCallback(async () => {
    const r = await apiFetch('/weekly-reviews').catch(() => null)
    if (r?.success) setReviews(r.data)
  }, [])

  const loadTimeline = useCallback(async () => {
    const r = await apiFetch('/timeline').catch(() => null)
    if (r?.success) setTimeline(r.data)
  }, [])

  const loadCoach = useCallback(async () => {
    const r = await apiFetch('/coach').catch(() => null)
    if (r?.success) setCoaching(r.data.insights ?? [])
  }, [])

  useEffect(() => {
    loadBriefing(); loadProfile()
  }, [loadBriefing, loadProfile])

  useEffect(() => {
    if (tab === 'memory') loadMemories()
    if (tab === 'habits') loadHabits()
    if (tab === 'weekly') loadReviews()
    if (tab === 'timeline') loadTimeline()
    if (tab === 'coach') loadCoach()
  }, [tab, loadMemories, loadHabits, loadReviews, loadTimeline, loadCoach])

  async function regenerateBriefing() {
    setLoading(true)
    const r = await apiFetch('/briefing/generate', { method: 'POST', body: '{}' })
    if (r.success) { setBriefing(r.data); setMsg('✅ Briefing regenerated') }
    setLoading(false)
  }

  async function saveProfile() {
    setLoading(true)
    const r = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        displayName: pName || undefined,
        reportingStyle: pStyle,
        workStartHour: pStart,
        workEndHour: pEnd,
        coachingEnabled: pCoach,
        focusAreas: pFocus ? pFocus.split(',').map(s => s.trim()).filter(Boolean) : [],
      }),
    })
    if (r.success) { setProfile(r.data); setMsg('✅ Profile saved'); setEditProfile(false) }
    setLoading(false)
  }

  async function addMemory() {
    if (!memKey || !memVal) return
    const r = await apiFetch('/memory', {
      method: 'POST',
      body: JSON.stringify({ category: memCat, key: memKey, value: memVal }),
    })
    if (r.success) { loadMemories(); setMemKey(''); setMemVal('') }
  }

  async function deleteMemory(id: string) {
    await apiFetch(`/memory/${id}`, { method: 'DELETE' })
    loadMemories()
  }

  async function addHabit() {
    if (!habitName || !habitAction) return
    const r = await apiFetch('/habits', {
      method: 'POST',
      body: JSON.stringify({ name: habitName, trigger: habitTrigger, triggerValue: habitTriggerVal, action: habitAction, module: habitModule || undefined }),
    })
    if (r.success) { loadHabits(); setHabitName(''); setHabitAction(''); setHabitModule('') }
  }

  async function deleteHabit(id: string) {
    await apiFetch(`/habits/${id}`, { method: 'DELETE' })
    loadHabits()
  }

  async function generateWeekly() {
    setLoading(true)
    const r = await apiFetch('/weekly-review/generate', { method: 'POST', body: '{}' })
    if (r.success) { loadReviews(); setMsg('✅ Weekly review generated') }
    setLoading(false)
  }

  async function setFocus() {
    if (!focusText) return
    await apiFetch('/focus', { method: 'POST', body: JSON.stringify({ focus: focusText }) })
    setMsg(`✅ Focus set: ${focusText}`)
    setFocusText('')
  }

  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'home', icon: '🌅', label: 'Daily Briefing' },
    { id: 'profile', icon: '👤', label: 'My Profile' },
    { id: 'coach', icon: '🎯', label: 'AI Coach' },
    { id: 'habits', icon: '🔄', label: 'Habits' },
    { id: 'memory', icon: '🧠', label: 'AI Memory' },
    { id: 'weekly', icon: '📊', label: 'Weekly Review' },
    { id: 'timeline', icon: '📅', label: 'Timeline' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Personal Working Assistant</h1>
            <p className="text-xs text-gray-500 mt-0.5">Reno Brain knows how you work · Powered by your personal data</p>
          </div>
          {msg && (
            <div className={`text-sm px-3 py-1.5 rounded-lg ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          )}
        </div>
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">

        {/* Daily Briefing */}
        {tab === 'home' && (
          <div className="space-y-5">
            {briefing ? (
              <>
                {/* Greeting */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                  <div className="text-2xl font-bold mb-1">{briefing.greeting}</div>
                  {briefing.focusItem && (
                    <div className="text-indigo-200 text-sm mt-2">🎯 Today's Focus: {briefing.focusItem}</div>
                  )}
                  <div className="flex gap-4 mt-4">
                    {(briefing.summary.quickStats ?? []).map(s => (
                      <div key={s.label} className="text-center">
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-indigo-200 text-xs">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Set focus */}
                <div className="flex gap-2">
                  <input value={focusText} onChange={e => setFocusText(e.target.value)}
                    placeholder="Set today's focus (press Enter)"
                    onKeyDown={e => e.key === 'Enter' && setFocus()}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <button onClick={setFocus} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Set Focus</button>
                  <button onClick={regenerateBriefing} disabled={loading}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50">
                    🔄 Refresh
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Alerts */}
                  <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b text-sm font-semibold text-gray-700">Alerts</div>
                    {(briefing.summary.alerts ?? []).map((a, i) => (
                      <div key={i} className={`mx-4 my-2 px-3 py-2 rounded-lg border ${alertColors[a.level] ?? alertColors.info}`}>
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <span>{alertIcons[a.level]}</span> {a.title}
                        </div>
                        <div className="text-xs mt-0.5 opacity-80">{a.detail}</div>
                      </div>
                    ))}
                    {!briefing.summary.alerts?.length && <div className="text-center text-green-600 py-5 text-sm">✅ No alerts — all clear!</div>}
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b text-sm font-semibold text-gray-700">Recommendations</div>
                    {(briefing.summary.recommendations ?? []).map((r, i) => (
                      <div key={i} className="px-5 py-3 border-b last:border-b-0">
                        <div className="flex items-start gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${priorityColors[r.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.priority}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{r.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{r.reason}</div>
                            <div className="text-xs text-indigo-600 mt-1">→ {r.action}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!briefing.summary.recommendations?.length && <div className="text-center text-gray-400 py-5 text-sm">No recommendations today</div>}
                  </div>
                </div>

                {/* Daily AI Plan */}
                {briefing.aiPlan && briefing.aiPlan.length > 0 && (
                  <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b text-sm font-semibold text-gray-700">AI Daily Plan</div>
                    {briefing.aiPlan.map((p, i) => (
                      <div key={i} className="px-5 py-3 border-b last:border-b-0 flex items-center gap-3">
                        <div className="text-xs text-gray-400 w-12 shrink-0 font-mono">{p.time}</div>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${planPriorityDot[p.priority] ?? 'bg-gray-300'}`} />
                        <div className="text-sm text-gray-700 flex-1">{p.activity}</div>
                        {p.module && <div className="text-xs text-indigo-400 shrink-0">{p.module}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🌅</div>
                <div className="text-gray-500 text-lg">Generating your daily briefing...</div>
                <div className="text-gray-400 text-sm mt-2">Reno Brain is collecting your personalised insights</div>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && (
          <div className="max-w-lg">
            <div className="bg-white border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Your Working Profile</h3>
                {!editProfile && (
                  <button onClick={() => setEditProfile(true)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                    Edit
                  </button>
                )}
              </div>

              {!editProfile ? (
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Display Name', value: profile?.displayName ?? '(not set)' },
                    { label: 'Reporting Style', value: profile?.reportingStyle ?? 'brief' },
                    { label: 'Work Hours', value: `${profile?.workStartHour ?? 9}:00 — ${profile?.workEndHour ?? 18}:00` },
                    { label: 'AI Coaching', value: profile?.coachingEnabled ? 'Enabled ✅' : 'Disabled' },
                    { label: 'Focus Areas', value: (profile?.focusAreas ?? []).join(', ') || '(none set)' },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between py-2 border-b last:border-b-0">
                      <span className="text-gray-500">{f.label}</span>
                      <span className="text-gray-800 font-medium">{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Display Name">
                    <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Your name" className={inputCls} />
                  </Field>
                  <Field label="Reporting Style">
                    <select value={pStyle} onChange={e => setPStyle(e.target.value)} className={inputCls}>
                      <option value="brief">Brief — concise summaries</option>
                      <option value="detailed">Detailed — full information</option>
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Work Start">
                      <input type="number" value={pStart} onChange={e => setPStart(Number(e.target.value))} min={0} max={23} className={inputCls} />
                    </Field>
                    <Field label="Work End">
                      <input type="number" value={pEnd} onChange={e => setPEnd(Number(e.target.value))} min={0} max={23} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Focus Areas (comma-separated)">
                    <input value={pFocus} onChange={e => setPFocus(e.target.value)} placeholder="e.g. security, performance, API" className={inputCls} />
                  </Field>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={pCoach} onChange={e => setPCoach(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Enable AI Coaching</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={saveProfile} disabled={loading}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => setEditProfile(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Coach */}
        {tab === 'coach' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="font-semibold text-indigo-900 mb-1">AI Workspace Coach</div>
              <div className="text-sm text-indigo-700">Reno Brain monitors your working patterns and suggests improvements. Enable coaching in your profile to get personalised insights.</div>
            </div>
            {coaching.length > 0 ? coaching.map((c, i) => (
              <div key={i} className="bg-white border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{c.message}</div>
                    <div className="text-xs text-indigo-600 mt-1.5">→ {c.suggestion}</div>
                    <div className="text-xs text-gray-400 mt-1">{c.type}</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white border rounded-xl p-8 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <div className="text-gray-700 font-medium">No coaching insights right now</div>
                <div className="text-gray-400 text-sm mt-1">Keep working — Reno Brain will learn your patterns and offer personalised suggestions.</div>
              </div>
            )}
          </div>
        )}

        {/* Habits */}
        {tab === 'habits' && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="bg-white border rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-gray-800 text-sm">Add New Habit</h3>
                <input value={habitName} onChange={e => setHabitName(e.target.value)} placeholder="Habit name (e.g. Morning Sales Review)" className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <select value={habitTrigger} onChange={e => setHabitTrigger(e.target.value)} className={inputCls}>
                    <option value="time">Time trigger</option>
                    <option value="day_of_week">Day of week</option>
                    <option value="event">Event trigger</option>
                  </select>
                  <input value={habitTriggerVal} onChange={e => setHabitTriggerVal(e.target.value)} placeholder="09:00 / monday" className={inputCls} />
                </div>
                <input value={habitAction} onChange={e => setHabitAction(e.target.value)} placeholder="Suggested action" className={inputCls} />
                <input value={habitModule} onChange={e => setHabitModule(e.target.value)} placeholder="Module (optional)" className={inputCls} />
                <button onClick={addHabit} className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Add Habit</button>
              </div>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b text-sm font-medium text-gray-700">Your Habits ({habits.length})</div>
              {habits.map(h => (
                <div key={h.id} className="px-5 py-3 border-b last:border-b-0 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{h.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{h.trigger}: {h.triggerValue} · {h.triggerCount} triggers</div>
                    <div className="text-xs text-indigo-600 mt-0.5">{h.action}</div>
                  </div>
                  <button onClick={() => deleteHabit(h.id)} className="text-xs text-red-400 hover:text-red-600 ml-3 shrink-0">Remove</button>
                </div>
              ))}
              {!habits.length && <div className="text-center text-gray-400 py-6 text-sm">No habits yet</div>}
            </div>
          </div>
        )}

        {/* AI Memory */}
        {tab === 'memory' && (
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Teach Reno Something</h3>
              <select value={memCat} onChange={e => setMemCat(e.target.value)} className={inputCls}>
                {['preference', 'style', 'habit', 'note', 'achievement'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={memKey} onChange={e => setMemKey(e.target.value)} placeholder="Key (e.g. report_style)" className={inputCls} />
              <input value={memVal} onChange={e => setMemVal(e.target.value)} placeholder="Value (e.g. I prefer bullet points)" className={inputCls} />
              <button onClick={addMemory} className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Remember This</button>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b text-sm font-medium text-gray-700">What Reno Knows ({memories.length})</div>
              {memories.map(m => (
                <div key={m.id} className="px-5 py-3 border-b last:border-b-0 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{m.category}</span>
                      <span className="text-sm font-medium text-gray-800">{m.key}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{String(m.value)}</div>
                    <div className="text-xs text-gray-300 mt-0.5">Confidence: {Math.round(m.confidence * 100)}%</div>
                  </div>
                  <button onClick={() => deleteMemory(m.id)} className="text-xs text-red-400 hover:text-red-600 ml-3 shrink-0">Forget</button>
                </div>
              ))}
              {!memories.length && <div className="text-center text-gray-400 py-6 text-sm">Reno has no memories yet — teach it about your preferences</div>}
            </div>
          </div>
        )}

        {/* Weekly Review */}
        {tab === 'weekly' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={generateWeekly} disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Generating...' : '📊 Generate This Week\'s Review'}
              </button>
            </div>
            {reviews.map(r => (
              <div key={r.id} className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Week of {r.weekStart} – {r.weekEnd}</div>
                    {r.nextWeekFocus && <div className="text-sm text-indigo-600 mt-0.5">Next week: {r.nextWeekFocus}</div>}
                  </div>
                  {r.productivityScore !== undefined && r.productivityScore !== null && (
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${r.productivityScore >= 75 ? 'text-green-600' : r.productivityScore >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {r.productivityScore}
                      </div>
                      <div className="text-xs text-gray-400">score</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 divide-x">
                  <div className="px-5 py-4">
                    <div className="text-xs font-semibold text-green-700 mb-2">✅ Accomplished</div>
                    {r.highlights.map((h, i) => <div key={i} className="text-xs text-gray-600 mb-1">• {h}</div>)}
                    {!r.highlights.length && <div className="text-xs text-gray-400">No highlights recorded</div>}
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-xs font-semibold text-yellow-700 mb-2">⏳ Carry Over</div>
                    <div className="text-xs text-gray-600">{r.delayed?.summary ?? 'None'}</div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-xs font-semibold text-indigo-700 mb-2">💡 Improvements</div>
                    {(r.improvements?.suggestions ?? []).map((s: string, i: number) => (
                      <div key={i} className="text-xs text-gray-600 mb-1">• {s}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {!reviews.length && (
              <div className="text-center text-gray-400 py-10">Generate your first weekly review above</div>
            )}
          </div>
        )}

        {/* Timeline */}
        {tab === 'timeline' && (
          <div className="max-w-2xl">
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b text-sm font-medium text-gray-700">Your Personal Timeline (last 7 days)</div>
              {timeline.map((e, i) => (
                <div key={i} className="px-5 py-3 border-b last:border-b-0 flex gap-3 items-start">
                  <span className="text-lg shrink-0">{e.type === 'briefing' ? '🌅' : e.type === 'step' ? '⚙️' : '📌'}</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-800">{e.label}</div>
                    {e.focusItem && <div className="text-xs text-indigo-500 mt-0.5">{e.focusItem}</div>}
                    {e.tool && <div className="text-xs text-gray-400 mt-0.5">Tool: {e.tool}</div>}
                    {e.module && <div className="text-xs text-gray-400 mt-0.5">{e.module}</div>}
                  </div>
                  <div className="text-xs text-gray-300 shrink-0">{new Date(e.ts).toLocaleString()}</div>
                </div>
              ))}
              {!timeline.length && <div className="text-center text-gray-400 py-8 text-sm">No timeline events yet</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
      {children}
    </div>
  )
}
