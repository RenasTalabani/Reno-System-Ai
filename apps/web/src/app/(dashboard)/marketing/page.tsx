'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Send, BarChart3, FileText, Trash2, Play } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  sending: 'bg-amber-500/20 text-amber-400',
  sent: 'bg-green-500/20 text-green-400',
}

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  sentCount: number
  openCount: number
  totalRecipients: number
  sentAt: string | null
  createdAt: string
}

interface Template { id: string; name: string; subject: string; category: string }

export default function MarketingPage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<'campaigns' | 'templates'>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [modal, setModal] = useState<'campaign' | 'template' | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/v1/marketing/campaigns`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/marketing/templates`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([c, t]) => { setCampaigns(c.data ?? []); setTemplates(t.data ?? []) })
  }, [token])

  const createCampaign = async () => {
    const res = await fetch(`${API}/v1/marketing/campaigns`, { method: 'POST', headers, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.data) { setCampaigns(c => [data.data, ...c]); setModal(null); setForm({}) }
  }

  const createTemplate = async () => {
    const res = await fetch(`${API}/v1/marketing/templates`, { method: 'POST', headers, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.data) { setTemplates(t => [data.data, ...t]); setModal(null); setForm({}) }
  }

  const sendCampaign = async (id: string) => {
    setSending(id)
    const res = await fetch(`${API}/v1/marketing/campaigns/${id}/send`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.data) {
      setCampaigns(c => c.map(x => x.id === id ? { ...x, status: 'sent', sentCount: data.data.recipientCount, totalRecipients: data.data.recipientCount } : x))
    }
    setSending(null)
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
        <Mail className="w-5 h-5 text-indigo-500" /> Email Marketing
      </h1>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
          {(['campaigns', 'templates'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-lg capitalize transition-colors ${tab === t ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => { setModal(tab === 'campaigns' ? 'campaign' : 'template'); setForm({}) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New {tab === 'campaigns' ? 'Campaign' : 'Template'}
        </button>
      </div>

      {tab === 'campaigns' && (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-sm">{c.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground'}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.subject}</p>
                </div>
                {c.status === 'draft' && (
                  <button onClick={() => sendCampaign(c.id)} disabled={sending === c.id}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {sending === c.id ? 'Sending...' : <><Play className="w-3 h-3" /> Send</>}
                  </button>
                )}
              </div>
              {c.status === 'sent' && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: 'Recipients', value: c.totalRecipients },
                    { label: 'Sent', value: c.sentCount },
                    { label: 'Open Rate', value: c.totalRecipients > 0 ? `${Math.round((c.openCount / c.totalRecipients) * 100)}%` : '0%' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-background rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No campaigns yet</p>}
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.subject} · <span className="text-indigo-400">{t.category}</span></p>
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No templates yet</p>}
        </div>
      )}

      {(modal === 'campaign' || modal === 'template') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">{modal === 'campaign' ? 'New Campaign' : 'New Template'}</h2>
            <div className="space-y-3">
              {['name', 'subject'].map(field => (
                <div key={field}>
                  <label className="block text-sm text-muted-foreground mb-1 capitalize">{field}</label>
                  <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                </div>
              ))}
              {modal === 'campaign' && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">HTML Body</label>
                  <textarea value={form.htmlBody ?? ''} onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))} rows={4}
                    placeholder="<p>Hello {{firstName}},</p>" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={modal === 'campaign' ? createCampaign : createTemplate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
