'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Plus, Building2, GitBranch, FolderOpen, UsersRound, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

type Tab = 'companies' | 'branches' | 'departments' | 'teams'

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'departments', label: 'Departments', icon: FolderOpen },
  { id: 'teams', label: 'Teams', icon: UsersRound },
]

const companySchema = z.object({
  name: z.string().min(1, 'Required'),
  legalName: z.string().optional(),
  registrationNumber: z.string().optional(),
  currency: z.string().default('USD'),
  timezone: z.string().default('UTC'),
})
type CompanyForm = z.input<typeof companySchema>

const deptSchema = z.object({ name: z.string().min(1, 'Required'), code: z.string().optional() })
type DeptForm = z.infer<typeof deptSchema>

export default function OrganizationPage() {
  const [tab, setTab] = useState<Tab>('companies')
  const [showModal, setShowModal] = useState(false)
  const qc = useQueryClient()

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/org/companies').then(r => r.data.data ?? []),
  })

  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/org/branches').then(r => r.data.data ?? []),
  })

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/org/departments').then(r => r.data.data ?? []),
  })

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/org/teams').then(r => r.data.data ?? []),
  })

  const createCompany = useMutation({
    mutationFn: (data: CompanyForm) => api.post('/org/companies', data),
    onSuccess: () => { toast.success('Company created'); qc.invalidateQueries({ queryKey: ['companies'] }); setShowModal(false); companyForm.reset() },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  })

  const createDept = useMutation({
    mutationFn: (data: DeptForm) => api.post('/org/departments', data),
    onSuccess: () => { toast.success('Department created'); qc.invalidateQueries({ queryKey: ['departments'] }); setShowModal(false); deptForm.reset() },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  })

  const companyForm = useForm<CompanyForm>({ resolver: zodResolver(companySchema) })
  const deptForm = useForm<DeptForm>({ resolver: zodResolver(deptSchema) })

  const isLoading = loadingCompanies || loadingBranches || loadingDepts || loadingTeams

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Organization</h2>
          <p className="text-sm text-muted-foreground">Manage your company structure</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          {tab === 'companies' ? 'New Company' : tab === 'branches' ? 'New Branch' : tab === 'departments' ? 'New Department' : 'New Team'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={4} cols={3} /></div>
        ) : (
          <>
            {tab === 'companies' && (
              <CompanyList companies={companies ?? []} />
            )}
            {tab === 'branches' && (
              <BranchList branches={branches ?? []} />
            )}
            {tab === 'departments' && (
              <DeptList departments={departments ?? []} />
            )}
            {tab === 'teams' && (
              <TeamList teams={teams ?? []} />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {tab === 'companies' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); companyForm.reset() }} title="New Company" size="md">
          <form onSubmit={companyForm.handleSubmit((d) => createCompany.mutate(d))} className="space-y-4">
            <Input label="Company Name" required placeholder="Acme Corp" {...companyForm.register('name')} error={companyForm.formState.errors.name?.message} />
            <Input label="Legal Name" placeholder="Acme Corporation Ltd." {...companyForm.register('legalName')} />
            <Input label="Registration Number" placeholder="Optional" {...companyForm.register('registrationNumber')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Currency" defaultValue="USD" {...companyForm.register('currency')} />
              <Input label="Timezone" defaultValue="UTC" {...companyForm.register('timezone')} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={createCompany.isPending}>Create</Button>
            </div>
          </form>
        </Modal>
      )}

      {tab === 'departments' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); deptForm.reset() }} title="New Department" size="sm">
          <form onSubmit={deptForm.handleSubmit((d) => createDept.mutate(d))} className="space-y-4">
            <Input label="Department Name" required placeholder="Engineering" {...deptForm.register('name')} error={deptForm.formState.errors.name?.message} />
            <Input label="Code" placeholder="ENG" {...deptForm.register('code')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={createDept.isPending}>Create</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function CompanyList({ companies }: { companies: any[] }) {
  if (!companies.length) return <Empty label="No companies yet" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/30">
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Legal Name</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody>
        {companies.map((c) => (
          <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
            <td className="px-4 py-3 text-muted-foreground">{c.legalName ?? '—'}</td>
            <td className="px-4 py-3 text-muted-foreground">{c.currency}</td>
            <td className="px-4 py-3">
              {c.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BranchList({ branches }: { branches: any[] }) {
  if (!branches.length) return <Empty label="No branches yet" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/30">
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Branch</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Main</th>
        </tr>
      </thead>
      <tbody>
        {branches.map((b) => (
          <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-medium text-foreground">{b.name}</td>
            <td className="px-4 py-3 text-muted-foreground">{b.code ?? '—'}</td>
            <td className="px-4 py-3">
              {b.isMain ? <Badge variant="info">Main</Badge> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DeptList({ departments }: { departments: any[] }) {
  if (!departments.length) return <Empty label="No departments yet" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/30">
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
        </tr>
      </thead>
      <tbody>
        {departments.map((d) => (
          <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
              {d.parentId && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              {d.name}
            </td>
            <td className="px-4 py-3 text-muted-foreground">{d.code ?? '—'}</td>
            <td className="px-4 py-3 text-muted-foreground">{d.parent?.name ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TeamList({ teams }: { teams: any[] }) {
  if (!teams.length) return <Empty label="No teams yet" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/30">
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((t) => (
          <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
            <td className="px-4 py-3 text-muted-foreground">{t.department?.name ?? '—'}</td>
            <td className="px-4 py-3">
              {t.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="px-4 py-12 text-center text-muted-foreground text-sm">{label}</div>
  )
}
