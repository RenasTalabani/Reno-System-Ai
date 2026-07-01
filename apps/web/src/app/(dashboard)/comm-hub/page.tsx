'use client'

import { useState, useEffect, useCallback } from 'react'

async function apiGet(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`)
  return r.json()
}
async function apiPost(path: string, body?: unknown) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return r.json()
}
async function apiDelete(path: string) {
  const r = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  return r.json()
}

interface Channel { id: string; name: string; channelType: string; isActive: boolean; totalSent: number; totalFailed: number }
interface Message { id: string; channelType: string; toAddress: string; subject?: string; status: string; createdAt: string; aiGenerated: boolean }
interface Campaign { id: string; name: string; channelType: string; status: string; totalSent: number; totalDelivered: number; totalOpened: number; totalClicked: number }
interface Template { id: string; name: string; channelType: string; category: string; subject?: string; timesUsed: number }
interface BuiltInTemplate { name: string; slug: string; channelType: string; category: string; description?: string }
interface DashboardData { summary: string; stats: { totalMessages: number; totalDelivered: number; totalCampaigns: number; activeChannels: number }; channelBreakdown: { channelType: string; count: number }[]; recentMessages: Message[] }

const TABS = ['Dashboard', 'Channels', 'Messages', 'Campaigns', 'Templates'] as const
type Tab = typeof TABS[number]

const STATUS_COLORS: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
  queued: 'bg-yellow-100 text-yellow-700', sent: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-500', active: 'bg-green-100 text-green-700',
}
const CHANNEL_ICONS: Record<string, string> = {
  email: '📧', sms: '💬', push: '🔔', chat: '💭', whatsapp: '📱', slack: '🔷', in_app: '📲',
}

export default function CommHubPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateLibrary, setTemplateLibrary] = useState<BuiltInTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [showSendForm, setShowSendForm] = useState(false)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [channelForm, setChannelForm] = useState({ name: '', channelType: 'email' })
  const [sendForm, setSendForm] = useState({ channelType: 'email', toAddress: '', subject: '', body: '', aiGenerated: false })
  const [campaignForm, setCampaignForm] = useState({ name: '', slug: '', channelType: 'email', bodyTemplate: '', subject: '' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDashboard = useCallback(async () => { const d = await apiGet('/v1/mch/dashboard'); setDashboard(d) }, [])
  const loadChannels = useCallback(async () => { const d = await apiGet('/v1/mch/channels'); setChannels(d.channels ?? []) }, [])
  const loadMessages = useCallback(async () => { const d = await apiGet('/v1/mch/messages'); setMessages(d.messages ?? []) }, [])
  const loadCampaigns = useCallback(async () => { const d = await apiGet('/v1/mch/campaigns'); setCampaigns(d.campaigns ?? []) }, [])
  const loadTemplates = useCallback(async () => {
    const [t, lib] = await Promise.all([apiGet('/v1/mch/templates'), apiGet('/v1/mch/template-library')])
    setTemplates(t.templates ?? []); setTemplateLibrary(lib.templates ?? [])
  }, [])

  useEffect(() => {
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      Dashboard: loadDashboard, Channels: loadChannels, Messages: loadMessages,
      Campaigns: loadCampaigns, Templates: loadTemplates,
    }
    loaders[tab]().finally(() => setLoading(false))
  }, [tab, loadDashboard, loadChannels, loadMessages, loadCampaigns, loadTemplates])

  const createChannel = async () => {
    const r = await apiPost('/v1/mch/channels', channelForm)
    if (r.error) flash(r.error); else { flash('Channel created'); setShowChannelForm(false); await loadChannels() }
  }

  const deleteChannel = async (id: string) => {
    await apiDelete(`/v1/mch/channels/${id}`); await loadChannels()
  }

  const sendMessage = async () => {
    const r = await apiPost('/v1/mch/messages/send', sendForm)
    if (r.error) flash(r.error); else { flash(`Message ${r.status} (${r.channelType} → ${r.toAddress})`); setShowSendForm(false); await loadMessages() }
  }

  const trackMessage = async (id: string, event: 'opened' | 'clicked') => {
    await apiPost(`/v1/mch/messages/${id}/track`, { event }); await loadMessages()
  }

  const createCampaign = async () => {
    const r = await apiPost('/v1/mch/campaigns', campaignForm)
    if (r.error) flash(r.error); else { flash('Campaign created'); setShowCampaignForm(false); await loadCampaigns() }
  }

  const launchCampaign = async (id: string) => {
    flash('Launching campaign...')
    const r = await apiPost(`/v1/mch/campaigns/${id}/launch`)
    if (r.error) flash(r.error); else flash(`Campaign sent — ${r.campaign.totalSent} messages · ${r.metrics.grade} grade (${r.metrics.openRate.toFixed(1)}% open rate)`)
    await loadCampaigns()
  }

  const deleteCampaign = async (id: string) => {
    await apiDelete(`/v1/mch/campaigns/${id}`); await loadCampaigns()
  }

  const installTemplate = async (slug: string) => {
    const r = await apiPost('/v1/mch/template-library/install', { slug })
    if (r.error) flash(r.error); else { flash(`Template installed: ${r.name}`); await loadTemplates() }
  }

  const deleteTemplate = async (id: string) => {
    await apiDelete(`/v1/mch/templates/${id}`); await loadTemplates()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Multi-Channel Communication Hub</h1>
        <p className="text-gray-500 text-sm mt-1">Email · SMS · Push · Chat · WhatsApp · Slack · In-App</p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {/* Dashboard */}
      {!loading && tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-pink-600 to-rose-700 rounded-xl p-5 text-white">
            <p className="text-lg font-medium">{dashboard.summary}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Messages', value: dashboard.stats.totalMessages, color: 'text-pink-600' },
              { label: 'Delivered', value: dashboard.stats.totalDelivered, color: 'text-green-600' },
              { label: 'Campaigns', value: dashboard.stats.totalCampaigns, color: 'text-blue-600' },
              { label: 'Active Channels', value: dashboard.stats.activeChannels, color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Channel Breakdown</h3>
              {dashboard.channelBreakdown.map(c => (
                <div key={c.channelType} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div className="flex items-center gap-2">{CHANNEL_ICONS[c.channelType] ?? '📨'}<span>{c.channelType}</span></div>
                  <span className="font-medium">{c.count}</span>
                </div>
              ))}
              {dashboard.channelBreakdown.length === 0 && <p className="text-sm text-gray-400">No messages sent yet.</p>}
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Recent Messages</h3>
              {dashboard.recentMessages.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div className="flex items-center gap-2">{CHANNEL_ICONS[m.channelType] ?? '📨'}<div><div>{m.toAddress}</div><div className="text-xs text-gray-400">{m.subject ?? m.channelType}</div></div></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                </div>
              ))}
              {dashboard.recentMessages.length === 0 && <p className="text-sm text-gray-400">No messages yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Channels */}
      {!loading && tab === 'Channels' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{channels.length} channels</p>
            <button onClick={() => setShowChannelForm(true)} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-700">+ Add Channel</button>
          </div>
          {showChannelForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Add Channel</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Channel name" value={channelForm.name} onChange={e => setChannelForm(f => ({ ...f, name: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={channelForm.channelType} onChange={e => setChannelForm(f => ({ ...f, channelType: e.target.value }))}>
                  {['email','sms','push','chat','whatsapp','slack','in_app'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createChannel} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm">Create</button>
                <button onClick={() => setShowChannelForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(c => (
              <div key={c.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-2xl">{CHANNEL_ICONS[c.channelType] ?? '📨'}</span><div><div className="font-medium">{c.name}</div><div className="text-xs text-gray-400">{c.channelType}</div></div></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.isActive ? 'active' : 'inactive'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs text-gray-500">
                  <div><div className="font-bold text-gray-700">{c.totalSent}</div>Sent</div>
                  <div><div className="font-bold text-red-500">{c.totalFailed}</div>Failed</div>
                </div>
                <button onClick={() => deleteChannel(c.id)} className="w-full py-1.5 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100">Remove</button>
              </div>
            ))}
            {channels.length === 0 && <div className="md:col-span-3 bg-white rounded-xl border p-8 text-center text-gray-400"><p className="text-2xl mb-2">📡</p><p>No channels. Add one above.</p></div>}
          </div>
        </div>
      )}

      {/* Messages */}
      {!loading && tab === 'Messages' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{messages.length} messages</p>
            <button onClick={() => setShowSendForm(true)} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-700">+ Send Message</button>
          </div>
          {showSendForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Send Message</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <select className="border rounded-lg px-3 py-2 text-sm" value={sendForm.channelType} onChange={e => setSendForm(f => ({ ...f, channelType: e.target.value }))}>
                  {['email','sms','push','chat','in_app'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="To (email/phone/user-id)" value={sendForm.toAddress} onChange={e => setSendForm(f => ({ ...f, toAddress: e.target.value }))} />
                {sendForm.channelType === 'email' && <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Subject" value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} />}
                <textarea className="border rounded-lg px-3 py-2 text-sm md:col-span-2 h-20" placeholder="Message body" value={sendForm.body} onChange={e => setSendForm(f => ({ ...f, body: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm col-span-2">
                  <input type="checkbox" checked={sendForm.aiGenerated} onChange={e => setSendForm(f => ({ ...f, aiGenerated: e.target.checked }))} />
                  AI-generated message
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={sendMessage} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm">Send</button>
                <button onClick={() => setShowSendForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Channel','To','Subject','Status','AI','Time','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {messages.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{CHANNEL_ICONS[m.channelType] ?? '📨'} {m.channelType}</td>
                    <td className="px-4 py-3 text-gray-600">{m.toAddress}</td>
                    <td className="px-4 py-3 text-gray-500">{m.subject ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>{m.status}</span></td>
                    <td className="px-4 py-3">{m.aiGenerated ? '🤖' : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-3">
                      {m.status === 'delivered' && (
                        <div className="flex gap-1">
                          <button onClick={() => trackMessage(m.id, 'opened')} className="text-blue-600 hover:underline text-xs">Open</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => trackMessage(m.id, 'clicked')} className="text-purple-600 hover:underline text-xs">Click</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {messages.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No messages yet. Send a message above.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaigns */}
      {!loading && tab === 'Campaigns' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-gray-500">{campaigns.length} campaigns</p>
            <button onClick={() => setShowCampaignForm(true)} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-700">+ New Campaign</button>
          </div>
          {showCampaignForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Create Campaign</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Campaign name" value={campaignForm.name} onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="slug" value={campaignForm.slug} onChange={e => setCampaignForm(f => ({ ...f, slug: e.target.value }))} />
                <select className="border rounded-lg px-3 py-2 text-sm" value={campaignForm.channelType} onChange={e => setCampaignForm(f => ({ ...f, channelType: e.target.value }))}>
                  {['email','sms','push','in_app'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Subject (email only)" value={campaignForm.subject} onChange={e => setCampaignForm(f => ({ ...f, subject: e.target.value }))} />
                <textarea className="border rounded-lg px-3 py-2 text-sm md:col-span-2 h-16" placeholder="Body template (use {{first_name}} variables)" value={campaignForm.bodyTemplate} onChange={e => setCampaignForm(f => ({ ...f, bodyTemplate: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={createCampaign} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm">Create</button>
                <button onClick={() => setShowCampaignForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {campaigns.map(c => (
              <div key={c.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div><div className="font-semibold">{c.name}</div><div className="text-xs text-gray-400">{CHANNEL_ICONS[c.channelType]} {c.channelType}</div></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </div>
                {c.totalSent > 0 && (
                  <div className="grid grid-cols-4 gap-2 text-center text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                    <div><div className="font-bold">{c.totalSent}</div>Sent</div>
                    <div><div className="font-bold text-green-600">{c.totalDelivered}</div>Delivered</div>
                    <div><div className="font-bold text-blue-600">{c.totalOpened}</div>Opened</div>
                    <div><div className="font-bold text-purple-600">{c.totalClicked}</div>Clicked</div>
                  </div>
                )}
                <div className="flex gap-2">
                  {c.status === 'draft' && <button onClick={() => launchCampaign(c.id)} className="flex-1 bg-pink-600 text-white py-1.5 rounded text-xs hover:bg-pink-700">🚀 Launch</button>}
                  <button onClick={() => deleteCampaign(c.id)} className="px-3 py-1.5 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100">Del</button>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <div className="md:col-span-2 bg-white rounded-xl border p-8 text-center text-gray-400"><p className="text-2xl mb-2">📣</p><p>No campaigns yet. Create your first campaign.</p></div>}
          </div>
        </div>
      )}

      {/* Templates */}
      {!loading && tab === 'Templates' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Your Templates ({templates.length})</h3>
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="bg-white border rounded-lg p-3 flex items-center justify-between">
                    <div><div className="text-sm font-medium">{t.name}</div><div className="text-xs text-gray-400">{CHANNEL_ICONS[t.channelType]} {t.channelType} · used {t.timesUsed}×</div></div>
                    <button onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:text-red-600 text-xs">Del</button>
                  </div>
                ))}
                {templates.length === 0 && <p className="text-sm text-gray-400">No templates. Install from library below.</p>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Template Library</h3>
              <div className="space-y-2">
                {templateLibrary.map(t => {
                  const installed = templates.some(tpl => tpl.name === t.name)
                  return (
                    <div key={t.slug} className="bg-white border rounded-lg p-3 flex items-center justify-between">
                      <div><div className="text-sm font-medium">{t.name}</div><div className="text-xs text-gray-400">{CHANNEL_ICONS[t.channelType]} {t.channelType} · {t.category}</div></div>
                      <button onClick={() => !installed && installTemplate(t.slug)}
                        className={`px-3 py-1.5 rounded text-xs ${installed ? 'bg-gray-100 text-gray-400' : 'bg-pink-600 text-white hover:bg-pink-700'}`}>
                        {installed ? 'Installed' : 'Install'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
