'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Phone, Mail, Building2, Globe, Star, TrendingDown, MessageSquare, CheckCircle, Clock, Plus, Send } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const typeVariant: Record<string, any> = { lead: 'warning', prospect: 'info', customer: 'success', churned: 'danger' }
const activityIcon: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: MessageSquare,
  note: MessageSquare,
  task: CheckCircle,
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuthStore()
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'opportunities' | 'notes'>('overview')
  const [noteContent, setNoteContent] = useState('')
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activity, setActivity] = useState({ activityType: 'call', subject: '', scheduledAt: '', description: '' })

  const load = async () => {
    if (!token) return
    setLoading(true)
    const res = await fetch(`${API}/v1/crm/contacts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) setContact(data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id, token])

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    await fetch(`${API}/v1/crm/notes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: id, content: noteContent }),
    })
    setNoteContent('')
    load()
  }

  const handleAddActivity = async () => {
    if (!activity.subject.trim()) return
    await fetch(`${API}/v1/crm/activities`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: id, ...activity }),
    })
    setActivity({ activityType: 'call', subject: '', scheduledAt: '', description: '' })
    setShowActivityForm(false)
    load()
  }

  const handleConvert = async () => {
    await fetch(`${API}/v1/crm/contacts/${id}/convert`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  if (loading) return <div className="p-8"><div className="h-60 bg-card rounded-xl animate-pulse" /></div>
  if (!contact) return <div className="p-8 text-muted-foreground">Contact not found.</div>

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'activities', label: `Activities (${contact.activities?.length ?? 0})` },
    { key: 'opportunities', label: `Deals (${contact.opportunities?.length ?? 0})` },
    { key: 'notes', label: `Notes (${contact.crmNotes?.length ?? 0})` },
  ] as const

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/crm/contacts" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> All Contacts
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xl shrink-0">
              {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{contact.firstName} {contact.lastName}</h1>
              <p className="text-muted-foreground text-sm">{contact.jobTitle ?? '—'}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant={typeVariant[contact.contactType] ?? 'default'} className="capitalize">{contact.contactType}</Badge>
                <Badge variant="default" className="capitalize">{contact.status}</Badge>
                {contact.source && <Badge variant="default">{contact.source}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {contact.contactType === 'lead' && (
              <Button size="sm" variant="secondary" onClick={handleConvert}>Convert to Customer</Button>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === t.key ? 'bg-indigo-500/10 text-indigo-500 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${contact.email}`} className="text-indigo-500 hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{contact.company.name}</span>
                  </div>
                )}
                {contact.linkedInUrl && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4 shrink-0" />
                    <a href={contact.linkedInUrl} target="_blank" className="text-indigo-500 hover:underline truncate">LinkedIn</a>
                  </div>
                )}
              </div>
              {contact.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">{contact.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Activities */}
          {activeTab === 'activities' && (
            <div className="space-y-3">
              {showActivityForm && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      value={activity.activityType} onChange={e => setActivity(a => ({ ...a, activityType: e.target.value }))}>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="task">Task</option>
                    </select>
                    <input type="datetime-local" className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      value={activity.scheduledAt} onChange={e => setActivity(a => ({ ...a, scheduledAt: e.target.value }))} />
                  </div>
                  <input className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Subject" value={activity.subject} onChange={e => setActivity(a => ({ ...a, subject: e.target.value }))} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowActivityForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                    <button onClick={handleAddActivity} className="text-sm text-indigo-500 font-medium hover:text-indigo-600">Save</button>
                  </div>
                </div>
              )}
              <button onClick={() => setShowActivityForm(true)} className="w-full py-2 text-sm text-indigo-500 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-500/5 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Log Activity
              </button>
              {(contact.activities ?? []).map((a: any) => {
                const Icon = activityIcon[a.activityType] ?? Clock
                return (
                  <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{a.subject}</p>
                      {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="capitalize">{a.activityType}</span>
                        · {a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={a.status === 'completed' ? 'success' : 'default'} className="capitalize text-xs shrink-0">{a.status}</Badge>
                  </div>
                )
              })}
              {!contact.activities?.length && !showActivityForm && (
                <div className="text-center py-8 text-muted-foreground text-sm">No activities yet</div>
              )}
            </div>
          )}

          {/* Opportunities */}
          {activeTab === 'opportunities' && (
            <div className="space-y-3">
              {(contact.opportunities ?? []).map((o: any) => (
                <div key={o.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: o.stage?.color ?? '#6366f1' }}>
                    {o.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{o.name}</p>
                    <p className="text-xs text-muted-foreground">{o.stage?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">${Number(o.value).toLocaleString()}</p>
                    <Badge variant={o.status === 'won' ? 'success' : o.status === 'lost' ? 'danger' : 'default'} className="capitalize text-xs">{o.status}</Badge>
                  </div>
                </div>
              ))}
              {!contact.opportunities?.length && <div className="text-center py-8 text-muted-foreground text-sm">No opportunities yet</div>}
            </div>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <textarea
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  rows={3}
                  placeholder="Add a note..."
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button onClick={handleAddNote} disabled={!noteContent.trim()}
                    className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Save Note
                  </button>
                </div>
              </div>
              {(contact.crmNotes ?? []).map((n: any) => (
                <div key={n.id} className="bg-card border border-border rounded-xl p-4">
                  {n.isPinned && <span className="text-xs text-amber-500 font-medium mb-2 block">📌 Pinned</span>}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {!contact.crmNotes?.length && <div className="text-center py-8 text-muted-foreground text-sm">No notes yet</div>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* AI Scores */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Signals</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> Lead Score</span>
              <span className="font-semibold">{contact.leadScore ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-red-500" /> Churn Risk</span>
              <span className="font-semibold">{contact.churnRisk != null ? `${(Number(contact.churnRisk) * 100).toFixed(0)}%` : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lifetime Value</span>
              <span className="font-semibold">{contact.customerLifetimeValue != null ? `$${Number(contact.customerLifetimeValue).toLocaleString()}` : '—'}</span>
            </div>
          </div>

          {/* Communication Prefs */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
            <div className="text-sm space-y-2">
              {contact.preferredChannel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel</span>
                  <span className="capitalize">{contact.preferredChannel}</span>
                </div>
              )}
              {contact.timezone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="text-xs">{contact.timezone}</span>
                </div>
              )}
              {contact.lastContactedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span className="text-xs">{new Date(contact.lastContactedAt).toLocaleDateString()}</span>
                </div>
              )}
              {contact.nextFollowUpAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Follow Up</span>
                  <span className={`text-xs ${new Date(contact.nextFollowUpAt) < new Date() ? 'text-red-500' : ''}`}>
                    {new Date(contact.nextFollowUpAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Do Not Email</span>
                <span className={contact.doNotEmail ? 'text-red-500' : 'text-green-500'}>{contact.doNotEmail ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Open Deals</span>
              <span className="font-medium">{contact.opportunities?.filter((o: any) => o.status === 'open').length ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Activities</span>
              <span className="font-medium">{contact._count?.activities ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Added</span>
              <span className="font-medium text-xs">{new Date(contact.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
