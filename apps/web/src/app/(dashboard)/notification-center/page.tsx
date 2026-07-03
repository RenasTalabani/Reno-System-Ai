'use client'
import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Send, Trash2, Settings, BarChart2, BookOpen, Filter, RefreshCw, Mail, Zap, Clock } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const hd = { Authorization: `Bearer ${token}` }
  const get = (p: string) => fetch(`${API}${p}`, { headers: hd }).then(r => r.json())
  const post = (p: string, b: unknown) => fetch(`${API}${p}`, { method: 'POST', headers: hj, body: JSON.stringify(b) }).then(r => r.json())
  const put = (p: string, b: unknown) => fetch(`${API}${p}`, { method: 'PUT', headers: hj, body: JSON.stringify(b) }).then(r => r.json())
  const patch = (p: string, b: unknown) => fetch(`${API}${p}`, { method: 'PATCH', headers: hj, body: JSON.stringify(b) }).then(r => r.json())
  const del = (p: string) => fetch(`${API}${p}`, { method: 'DELETE', headers: hd }).then(r => r.json())
  return { get, post, put, patch, del }
}

const TABS = ['Templates', 'Rules', 'History', 'Preferences', 'Channels', 'Broadcasts', 'Stats']
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700', normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700', urgent: 'bg-purple-100 text-purple-700'
}

export default function NotificationCenterPage() {
  const api = useApi()
  const [tab, setTab] = useState('Templates')
  const [templates, setTemplates] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [prefs, setPrefs] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [registry, setRegistry] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)

  const [tplForm, setTplForm] = useState({ name: '', eventType: '', titleTpl: '', bodyTpl: '', priority: 'normal', channels: ['in_app'] })
  const [sendForm, setSendForm] = useState({ templateId: '', recipientIds: '', variables: '{}' })
  const [chanForm, setChanForm] = useState({ channelType: 'email', name: '', config: '{"host":"smtp.example.com","port":587}' })
  const [broadForm, setBroadForm] = useState({ title: '', body: '', priority: 'normal' })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'Templates') { const d = await api.get('/notification-center/templates'); setTemplates(d.templates ?? []) }
      if (tab === 'Rules') { const d = await api.get('/notification-center/rules'); setRules(d.rules ?? []) }
      if (tab === 'History') { const d = await api.get('/notification-center/history'); setHistory(d.notifications ?? []) }
      if (tab === 'Preferences') { const d = await api.get('/notification-center/preferences'); setPrefs(d) }
      if (tab === 'Channels') { const d = await api.get('/notification-center/channels'); setChannels(d.channels ?? []) }
      if (tab === 'Broadcasts') { const d = await api.get('/notification-center/broadcasts'); setBroadcasts(d.broadcasts ?? []) }
      if (tab === 'Stats') { const d = await api.get('/notification-center/stats'); setStats(d) }
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/notification-center/registry').then(d => setRegistry(d)) }, [])

  async function createTemplate() {
    const res = await api.post('/notification-center/templates', tplForm)
    if (res.id) { notify('Template created'); setShowCreate(false); load(); setTplForm({ name: '', eventType: '', titleTpl: '', bodyTpl: '', priority: 'normal', channels: ['in_app'] }) }
    else notify(res.message ?? 'Error')
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete template?')) return
    await api.del(`/notification-center/templates/${id}`)
    notify('Deleted'); load()
  }

  async function sendNotification() {
    let vars = {}; try { vars = JSON.parse(sendForm.variables) } catch { }
    const recipients = sendForm.recipientIds.split(',').map(s => s.trim()).filter(Boolean)
    const res = await api.post('/notification-center/send', { templateId: sendForm.templateId, recipientIds: recipients, variables: vars })
    notify(res.sent ? `Sent ${res.sent} notification(s)` : res.message ?? 'Error')
  }

  async function createChannel() {
    let config = {}; try { config = JSON.parse(chanForm.config) } catch { }
    const res = await api.post('/notification-center/channels', { ...chanForm, config })
    if (res.id) { notify('Channel created'); setShowCreate(false); load() }
    else notify(res.message ?? 'Error')
  }

  async function testChannel(id: string) {
    const res = await api.post(`/notification-center/channels/${id}/test`, {})
    notify(res.message ?? 'Test sent')
  }

  async function deleteChannel(id: string) {
    await api.del(`/notification-center/channels/${id}`)
    notify('Deleted'); load()
  }

  async function sendBroadcast() {
    const res = await api.post('/notification-center/broadcast', broadForm)
    notify(res.sentCount !== undefined ? `Broadcast sent to ${res.sentCount} user(s)` : res.message ?? 'Error')
    setBroadForm({ title: '', body: '', priority: 'normal' }); load()
  }

  async function markAllRead() {
    await api.post('/notification-center/history/read-all', {})
    notify('All marked as read'); load()
  }

  async function updatePrefs(updates: any) {
    const res = await api.put('/notification-center/preferences', { ...prefs, ...updates })
    setPrefs(res); notify('Preferences saved')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
            <p className="text-sm text-gray-500">Templates, rules, channels, and delivery management</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setShowCreate(false) }}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* TEMPLATES */}
      {tab === 'Templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Notification Templates ({templates.length})</h2>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Create Template</h3>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Template name" value={tplForm.name} onChange={e => setTplForm(f => ({...f, name: e.target.value}))}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Event type (e.g. report.generated)" value={tplForm.eventType} onChange={e => setTplForm(f => ({...f, eventType: e.target.value}))}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Title template: e.g. Report {{reportName}} ready" value={tplForm.titleTpl} onChange={e => setTplForm(f => ({...f, titleTpl: e.target.value}))}
                  className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                <textarea placeholder="Body template: e.g. Your report {{reportName}} was generated." value={tplForm.bodyTpl} onChange={e => setTplForm(f => ({...f, bodyTpl: e.target.value}))}
                  className="border rounded-lg px-3 py-2 text-sm col-span-2 h-20" />
                <select value={tplForm.priority} onChange={e => setTplForm(f => ({...f, priority: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['low','normal','high','critical','urgent'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createTemplate} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Create</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}
          {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
            <div className="grid gap-3">
              {templates.map((t: any) => (
                <div key={t.id} className="bg-white border rounded-xl p-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{t.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority] ?? 'bg-gray-100 text-gray-700'}`}>{t.priority}</span>
                      {!t.isActive && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-500">{t.eventType}</p>
                    <p className="text-sm text-gray-700">{t.titleTpl}</p>
                    <div className="flex gap-1 flex-wrap">
                      {(t.channels ?? []).map((c: string) => (
                        <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {templates.length === 0 && <div className="text-center py-12 text-gray-400">No templates yet — create one above</div>}
            </div>
          )}
          {/* Quick send */}
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Send className="w-4 h-4 text-purple-600" /> Quick Send</h3>
            <div className="grid grid-cols-2 gap-3">
              <select value={sendForm.templateId} onChange={e => setSendForm(f => ({...f, templateId: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Select template...</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input placeholder="Recipient user ID(s) comma-separated" value={sendForm.recipientIds} onChange={e => setSendForm(f => ({...f, recipientIds: e.target.value}))}
                className="border rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder='Variables JSON: {"reportName":"Q3","date":"2026-07-03"}' value={sendForm.variables} onChange={e => setSendForm(f => ({...f, variables: e.target.value}))}
                className="border rounded-lg px-3 py-2 text-sm col-span-2 h-16" />
            </div>
            <button onClick={sendNotification} disabled={!sendForm.templateId} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
              Send Notification
            </button>
          </div>
        </div>
      )}

      {/* RULES */}
      {tab === 'Rules' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Automation Rules ({rules.length})</h2>
          {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
            <div className="grid gap-3">
              {rules.map((r: any) => (
                <div key={r.id} className="bg-white border rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold text-gray-900">{r.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Trigger: <code className="bg-gray-100 px-1 rounded">{r.triggerType}</code> → Template: {r.template?.name}</p>
                      <p className="text-xs text-gray-500">Target: {r.targetType} · Runs: {r.runCount}</p>
                    </div>
                  </div>
                </div>
              ))}
              {rules.length === 0 && <div className="text-center py-12 text-gray-400">No automation rules yet</div>}
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === 'History' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Notification History</h2>
            <button onClick={markAllRead} className="text-sm text-purple-600 hover:text-purple-800">Mark all read</button>
          </div>
          {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
            <div className="grid gap-2">
              {history.map((n: any) => (
                <div key={n.id} className={`bg-white border rounded-xl p-4 ${!n.readAt ? 'border-purple-200 bg-purple-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.readAt ? 'bg-purple-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[n.priority] ?? 'bg-gray-100 text-gray-700'}`}>{n.priority}</span>
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {history.length === 0 && <div className="text-center py-12 text-gray-400">No notifications yet</div>}
            </div>
          )}
        </div>
      )}

      {/* PREFERENCES */}
      {tab === 'Preferences' && prefs && (
        <div className="bg-white border rounded-xl p-6 space-y-6 max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Settings className="w-5 h-5" /> Notification Preferences</h2>
          <div className="space-y-4">
            {[['in_app','inApp','In-App Notifications'],['email','email','Email Notifications'],['push','push','Push Notifications'],['sms','sms','SMS Notifications']].map(([,key,label]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <button onClick={() => updatePrefs({ [key]: !prefs[key] })}
                  className={`w-12 h-6 rounded-full transition-colors ${prefs[key] ? 'bg-purple-600' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium text-gray-700">Digest Mode</p>
                <p className="text-xs text-gray-400">Batch notifications into a digest</p>
              </div>
              <button onClick={() => updatePrefs({ digestMode: !prefs.digestMode })}
                className={`w-12 h-6 rounded-full transition-colors ${prefs.digestMode ? 'bg-purple-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.digestMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quiet Hours</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">From</span>
                  <input type="number" min={0} max={23} value={prefs.quietHoursStart ?? 22} onChange={e => setPrefs((p: any) => ({...p, quietHoursStart: +e.target.value}))}
                    className="w-16 border rounded-lg px-2 py-1 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">To</span>
                  <input type="number" min={0} max={23} value={prefs.quietHoursEnd ?? 7} onChange={e => setPrefs((p: any) => ({...p, quietHoursEnd: +e.target.value}))}
                    className="w-16 border rounded-lg px-2 py-1 text-sm" />
                </div>
                <button onClick={() => updatePrefs({ quietHoursStart: prefs.quietHoursStart, quietHoursEnd: prefs.quietHoursEnd })}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANNELS */}
      {tab === 'Channels' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Delivery Channels ({channels.length})</h2>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Add Channel
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Add Channel</h3>
              <div className="grid grid-cols-2 gap-4">
                <select value={chanForm.channelType} onChange={e => setChanForm(f => ({...f, channelType: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                  {['email','sms','push','webhook','slack','teams'].map(c => <option key={c}>{c}</option>)}
                </select>
                <input placeholder="Channel name" value={chanForm.name} onChange={e => setChanForm(f => ({...f, name: e.target.value}))}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <textarea placeholder='Config JSON: {"host":"smtp.example.com","port":587}' value={chanForm.config} onChange={e => setChanForm(f => ({...f, config: e.target.value}))}
                  className="border rounded-lg px-3 py-2 text-sm col-span-2 h-20" />
              </div>
              <div className="flex gap-2">
                <button onClick={createChannel} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Add</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}
          {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
            <div className="grid gap-3">
              {channels.map((c: any) => (
                <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.channelType} · {c.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => testChannel(c.id)} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200">Test</button>
                    <button onClick={() => deleteChannel(c.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {channels.length === 0 && <div className="text-center py-12 text-gray-400">No channels configured yet</div>}
            </div>
          )}
        </div>
      )}

      {/* BROADCASTS */}
      {tab === 'Broadcasts' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Broadcasts</h2>
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Send className="w-4 h-4 text-purple-600" /> Send Broadcast</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Title" value={broadForm.title} onChange={e => setBroadForm(f => ({...f, title: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
              <textarea placeholder="Message body" value={broadForm.body} onChange={e => setBroadForm(f => ({...f, body: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm col-span-2 h-20" />
              <select value={broadForm.priority} onChange={e => setBroadForm(f => ({...f, priority: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm">
                {['low','normal','high','critical'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <button onClick={sendBroadcast} disabled={!broadForm.title} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
              Send to All Users
            </button>
          </div>
          {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
            <div className="grid gap-3">
              {broadcasts.map((b: any) => (
                <div key={b.id} className="bg-white border rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{b.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{b.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[b.priority] ?? 'bg-gray-100 text-gray-700'}`}>{b.priority}</span>
                        <span className="text-xs text-gray-400">Sent to {b.sentCount} users</span>
                        <span className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {broadcasts.length === 0 && <div className="text-center py-12 text-gray-400">No broadcasts yet</div>}
            </div>
          )}
        </div>
      )}

      {/* STATS */}
      {tab === 'Stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Notification Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Notifications', value: stats.totalNotifications ?? 0, color: 'purple' },
              { label: 'Unread', value: stats.unread ?? 0, color: 'blue' },
              { label: 'Templates', value: stats.templates ?? 0, color: 'green' },
              { label: 'Broadcasts', value: stats.broadcasts ?? 0, color: 'orange' },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-5">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active Rules', value: stats.activeRules ?? 0 },
              { label: 'Active Channels', value: stats.activeChannels ?? 0 },
              { label: 'Pending Digests', value: stats.pendingDigests ?? 0 },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {registry && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Supported Channels</h3>
              <div className="flex gap-2 flex-wrap">
                {registry.channels?.map((c: string) => (
                  <span key={c} className="text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
