'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Target, DollarSign, TrendingUp, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useForm } from 'react-hook-form'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export default function OpportunitiesPage() {
  const { token } = useAuthStore()
  const [pipelineView, setPipelineView] = useState<any>(null)
  const [pipelines, setPipelines] = useState<any[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState('')
  const [contacts, setContacts] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [allOpps, setAllOpps] = useState<any[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const loadPipelines = useCallback(async () => {
    if (!token) return
    const res = await fetch(`${API}/v1/crm/pipelines`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) {
      setPipelines(data.data)
      if (!selectedPipeline && data.data.length > 0) {
        const def = data.data.find((p: any) => p.isDefault) ?? data.data[0]
        setSelectedPipeline(def.id)
      }
    }
  }, [token])

  const loadPipelineView = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedPipeline) params.set('pipelineId', selectedPipeline)
      const [viewRes, listRes] = await Promise.all([
        fetch(`${API}/v1/crm/opportunities/pipeline-view?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/v1/crm/opportunities?limit=200${selectedPipeline ? `&pipelineId=${selectedPipeline}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [viewData, listData] = await Promise.all([viewRes.json(), listRes.json()])
      if (viewData.success) setPipelineView(viewData.data)
      if (listData.success) setAllOpps(listData.data)
    } finally { setLoading(false) }
  }, [token, selectedPipeline])

  useEffect(() => { loadPipelines() }, [loadPipelines])
  useEffect(() => { if (selectedPipeline || pipelines.length > 0) loadPipelineView() }, [selectedPipeline, loadPipelineView])

  useEffect(() => {
    if (!token || !showCreate) return
    Promise.all([
      fetch(`${API}/v1/crm/contacts?limit=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/crm/companies?limit=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([c, co]) => {
      if (c.success) setContacts(c.data)
      if (co.success) setCompanies(co.data)
    })
  }, [token, showCreate])

  const onCreate = async (values: any) => {
    setCreating(true)
    try {
      await fetch(`${API}/v1/crm/opportunities`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          pipelineId: selectedPipeline || undefined,
          value: parseFloat(values.value) || 0,
          contactId: values.contactId || undefined,
          companyId: values.companyId || undefined,
        }),
      })
      setShowCreate(false); reset(); loadPipelineView()
    } finally { setCreating(false) }
  }

  const handleMoveStage = async (oppId: string, stageId: string) => {
    await fetch(`${API}/v1/crm/opportunities/${oppId}/move`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId }),
    })
    loadPipelineView()
  }

  const fmtCurrency = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`
  const totalPipelineValue = pipelineView?.stages?.reduce((sum: number, s: any) => sum + (s.totalValue ?? 0), 0) ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales Pipeline</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>{allOpps.filter(o => o.status === 'open').length} open deals</span>
              <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{fmtCurrency(totalPipelineValue)} pipeline</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Pipeline selector */}
            {pipelines.length > 1 && (
              <select
                className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none"
                value={selectedPipeline}
                onChange={e => setSelectedPipeline(e.target.value)}
              >
                {pipelines.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {/* View toggle */}
            <div className="flex bg-muted rounded-lg p-0.5">
              <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Kanban</button>
              <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>List</button>
            </div>
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-72 h-96 bg-card border border-border rounded-xl animate-pulse shrink-0" />)}
          </div>
        ) : view === 'kanban' ? (
          <div className="p-6 flex gap-4 overflow-x-auto min-h-full">
            {(pipelineView?.stages ?? []).map((stage: any) => (
              <div key={stage.id} className="flex flex-col w-72 shrink-0">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{stage.opportunities?.length ?? 0}</span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{fmtCurrency(stage.totalValue ?? 0)}</span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 flex-1">
                  {(stage.opportunities ?? []).map((opp: any) => (
                    <div key={opp.id} className="bg-card border border-border rounded-xl p-3 hover:border-indigo-500/50 transition-all">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-foreground leading-snug">{opp.name}</p>
                        <span className="text-xs text-indigo-500 font-semibold tabular-nums shrink-0">{fmtCurrency(Number(opp.value))}</span>
                      </div>
                      {(opp.company || opp.contact) && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {opp.company?.name ?? `${opp.contact?.firstName} ${opp.contact?.lastName}`}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{opp.probability}% chance</span>
                        {opp.expectedCloseDate && (
                          <span className={`text-xs ${new Date(opp.expectedCloseDate) < new Date() ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {new Date(opp.expectedCloseDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {/* Stage mover */}
                      <div className="mt-2 pt-2 border-t border-border">
                        <select
                          className="w-full text-[11px] bg-transparent border-0 text-muted-foreground focus:outline-none cursor-pointer"
                          value={opp.stageId}
                          onChange={e => handleMoveStage(opp.id, e.target.value)}
                        >
                          {pipelineView?.stages?.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {(!stage.opportunities?.length) && (
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-xs text-muted-foreground/50">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!pipelineView?.stages?.length) && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p>No pipeline configured yet</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* List view */
          <div className="p-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deal</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact / Company</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Close Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allOpps.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No opportunities yet</td></tr>
                  ) : allOpps.map((o: any) => (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{o.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {o.company?.name ?? (o.contact ? `${o.contact.firstName} ${o.contact.lastName}` : '—')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: o.stage?.color ?? '#6366f1' }} />
                          <span className="text-sm">{o.stage?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-indigo-500">{fmtCurrency(Number(o.value))}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={o.status === 'won' ? 'success' : o.status === 'lost' ? 'danger' : 'default'} className="capitalize text-xs">{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset() }} title="New Opportunity" size="lg">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <Input label="Deal Name" error={errors.name?.message as string} {...register('name', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Value" type="number" step="0.01" placeholder="0.00" error={errors.value?.message as string} {...register('value')} />
            <Input label="Expected Close Date" type="date" {...register('expectedCloseDate')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Contact</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('contactId')}>
                <option value="">No contact</option>
                {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
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
              <label className="block text-sm font-medium text-foreground mb-1.5">Probability %</label>
              <input type="number" min="0" max="100" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                {...register('probability')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Source</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...register('source')}>
                <option value="">Unknown</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
                <option value="referral">Referral</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" rows={2} {...register('description')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Deal</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
