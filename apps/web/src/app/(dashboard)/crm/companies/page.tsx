'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Building2, Globe, Phone, Users, TrendingDown, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useForm } from 'react-hook-form'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const statusVariant: Record<string, any> = {
  lead: 'warning',
  prospect: 'info',
  customer: 'success',
  churned: 'danger',
  partner: 'default',
}

export default function CrmCompaniesPage() {
  const { token } = useAuthStore()
  const [companies, setCompanies] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await fetch(`${API}/v1/crm/companies?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) { setCompanies(data.data); setTotal(data.meta?.pagination?.total ?? 0) }
    } finally { setLoading(false) }
  }, [token, search, status])

  useEffect(() => { load() }, [load])

  const onCreate = async (values: any) => {
    setCreating(true)
    try {
      await fetch(`${API}/v1/crm/companies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      setShowCreate(false); reset(); load()
    } finally { setCreating(false) }
  }

  const fmtCurrency = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : v > 0 ? `$${v}` : '—'

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total companies</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Company</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-muted-foreground"
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Customer</option>
          <option value="churned">Churned</option>
          <option value="partner">Partner</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No companies yet</h3>
          <p className="text-muted-foreground text-sm mt-2">Add your first company account</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Add Company</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((co: any) => (
            <div key={co.id} className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/50 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-sm shrink-0">
                    {co.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-indigo-500 transition-colors">{co.name}</h3>
                    {co.industry && <p className="text-xs text-muted-foreground">{co.industry}</p>}
                  </div>
                </div>
                <Badge variant={statusVariant[co.status] ?? 'default'} className="capitalize text-xs">{co.status}</Badge>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                {co.domain && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{co.domain}</span>
                  </div>
                )}
                {co.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{co.phone}</span>
                  </div>
                )}
                {co.employeeCount && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{co.employeeCount.toLocaleString()} employees</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                <div className="flex gap-3">
                  <span>{co._count?.contacts ?? 0} contacts</span>
                  <span>{co._count?.opportunities ?? 0} deals</span>
                </div>
                {co.estimatedRevenue && (
                  <span className="font-medium text-foreground">{fmtCurrency(Number(co.estimatedRevenue))}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset() }} title="New Company" size="lg">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <Input label="Company Name" error={errors.name?.message as string} {...register('name', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Domain" placeholder="example.com" {...register('domain')} />
            <Input label="Website" placeholder="https://..." {...register('website')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Industry</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('industry')}>
                <option value="">Select industry</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="education">Education</option>
                <option value="real_estate">Real Estate</option>
                <option value="consulting">Consulting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('status')}>
                <option value="prospect">Prospect</option>
                <option value="lead">Lead</option>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" type="tel" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Country" {...register('country')} />
            <Input label="City" {...register('city')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Company</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
