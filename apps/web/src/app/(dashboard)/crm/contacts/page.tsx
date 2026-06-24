'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, User, Phone, Mail, Building2, Star, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useForm } from 'react-hook-form'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const typeVariant: Record<string, any> = {
  lead: 'warning',
  prospect: 'info',
  customer: 'success',
  churned: 'danger',
}

const statusColor: Record<string, string> = {
  new: 'text-blue-500',
  contacted: 'text-amber-500',
  qualified: 'text-indigo-500',
  active: 'text-green-500',
  inactive: 'text-muted-foreground',
  lost: 'text-red-500',
}

export default function CrmContactsPage() {
  const { token } = useAuthStore()
  const [contacts, setContacts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [contactType, setContactType] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      if (contactType) params.set('contactType', contactType)
      if (status) params.set('status', status)
      const res = await fetch(`${API}/v1/crm/contacts?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) { setContacts(data.data); setTotal(data.meta?.pagination?.total ?? 0) }
    } finally { setLoading(false) }
  }, [token, search, contactType, status])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!token || !showCreate) return
    fetch(`${API}/v1/crm/companies?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setCompanies(d.data) })
  }, [token, showCreate])

  const onCreate = async (values: any) => {
    setCreating(true)
    try {
      await fetch(`${API}/v1/crm/contacts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, companyId: values.companyId || undefined }),
      })
      setShowCreate(false); reset(); load()
    } finally { setCreating(false) }
  }

  const getInitials = (first: string, last: string) => `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total contacts</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Contact</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-muted-foreground"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          value={contactType}
          onChange={e => setContactType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="lead">Leads</option>
          <option value="prospect">Prospects</option>
          <option value="customer">Customers</option>
          <option value="churned">Churned</option>
        </select>
        <select
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20">
          <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No contacts yet</h3>
          <p className="text-muted-foreground text-sm mt-2">Add your first contact to get started</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lead Score</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deals</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-500 shrink-0">
                        {getInitials(c.firstName, c.lastName)}
                      </div>
                      <div>
                        <Link href={`/crm/contacts/${c.id}`} className="font-medium text-foreground hover:text-indigo-500 transition-colors">
                          {c.firstName} {c.lastName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.jobTitle ?? c.email ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.company ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[140px]">{c.company.name}</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={typeVariant[c.contactType] ?? 'default'} className="capitalize text-xs">{c.contactType}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${statusColor[c.status] ?? ''}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.leadScore != null ? (
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-medium tabular-nums">{c.leadScore}</span>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{c._count?.opportunities ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/crm/contacts/${c.id}`} className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors">
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="New Contact" size="lg">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" error={errors.firstName?.message as string} {...register('firstName', { required: 'Required' })} />
            <Input label="Last Name" error={errors.lastName?.message as string} {...register('lastName', { required: 'Required' })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" {...register('email')} />
            <Input label="Phone" type="tel" {...register('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Job Title" {...register('jobTitle')} />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Company</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('companyId')}>
                <option value="">No company</option>
                {companies.map((co: any) => <option key={co.id} value={co.id}>{co.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('contactType')}>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Source</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('source')}>
                <option value="">Unknown</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="email">Email Campaign</option>
                <option value="event">Event</option>
                <option value="cold_call">Cold Call</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Contact</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
