'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Plus, Shield, Lock, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'

const roleSchema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required').regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscores only'),
  description: z.string().optional(),
  color: z.string().optional(),
})
type RoleForm = z.infer<typeof roleSchema>

export default function RolesPage() {
  const [selected, setSelected] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles-full'],
    queryFn: () => api.get('/roles').then(r => r.data.data ?? []),
  })

  const { data: allPerms } = useQuery({
    queryKey: ['all-perms'],
    queryFn: () => api.get('/roles/permissions/all').then(r => r.data.data ?? []),
  })

  const { data: rolePerms } = useQuery({
    queryKey: ['role-perms', selected?.id],
    queryFn: () => api.get(`/roles/${selected.id}`).then(r => r.data.data?.permissions ?? []),
    enabled: !!selected,
  })

  const createMutation = useMutation({
    mutationFn: (data: RoleForm) => api.post('/roles', data),
    onSuccess: () => {
      toast.success('Role created')
      qc.invalidateQueries({ queryKey: ['roles-full'] })
      setShowCreate(false)
      reset()
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to create role'),
  })

  const updatePermsMutation = useMutation({
    mutationFn: ({ roleId, permIds }: { roleId: string; permIds: string[] }) =>
      api.put(`/roles/${roleId}/permissions`, { permissionIds: permIds }),
    onSuccess: () => {
      toast.success('Permissions updated')
      qc.invalidateQueries({ queryKey: ['role-perms', selected?.id] })
    },
    onError: () => toast.error('Failed to update permissions'),
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
  })

  const nameVal = watch('name')
  const autoSlug = nameVal?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') ?? ''

  const groupedPerms = (allPerms ?? []).reduce((acc: Record<string, any[]>, p: any) => {
    const key = p.module
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const grantedIds = new Set((rolePerms ?? []).filter((p: any) => p.granted).map((p: any) => p.permissionId))

  const togglePerm = (permId: string) => {
    if (!selected || selected.isSystem) return
    const next = new Set(grantedIds)
    if (next.has(permId)) next.delete(permId)
    else next.add(permId)
    updatePermsMutation.mutate({ roleId: selected.id, permIds: Array.from(next) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">Define what each role can do in the system</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">Roles ({roles?.length ?? 0})</p>
          </div>
          {isLoading ? (
            <div className="p-4"><TableSkeleton rows={6} cols={1} /></div>
          ) : (
            <div className="divide-y divide-border">
              {(roles ?? []).map((role: any) => (
                <button
                  key={role.id}
                  onClick={() => setSelected(role)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors',
                    selected?.id === role.id && 'bg-primary/5 border-r-2 border-primary'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: role.color ?? '#6366f1' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{role.name}</p>
                    <p className="text-xs text-muted-foreground">{role.slug}</p>
                  </div>
                  {role.isSystem && (
                    <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Permissions panel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
              <Shield className="w-10 h-10 opacity-30" />
              <p className="text-sm">Select a role to manage its permissions</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color ?? '#6366f1' }} />
                  <p className="font-medium text-foreground">{selected.name}</p>
                  {selected.isSystem && <Badge variant="warning"><Lock className="w-2.5 h-2.5 inline mr-1" />System</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{grantedIds.size} permissions granted</p>
              </div>
              <div className="overflow-y-auto max-h-[500px] divide-y divide-border">
                {Object.entries(groupedPerms).map(([module, perms]) => (
                  <div key={module}>
                    <button
                      onClick={() => setExpandedModule(expandedModule === module ? null : module)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <p className="text-sm font-medium text-foreground capitalize">{module}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(perms as any[]).filter(p => grantedIds.has(p.id)).length}/{(perms as any[]).length}
                        </span>
                        {expandedModule === module
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                    </button>
                    {expandedModule === module && (
                      <div className="pb-2 px-2">
                        {(perms as any[]).map((p) => (
                          <label
                            key={p.id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors',
                              selected.isSystem && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={grantedIds.has(p.id)}
                              onChange={() => togglePerm(p.id)}
                              disabled={selected.isSystem || updatePermsMutation.isPending}
                              className="w-4 h-4 accent-primary"
                            />
                            <div>
                              <p className="text-sm text-foreground">{p.resource} · {p.action}</p>
                              <p className="text-xs text-muted-foreground">{p.scope}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Create Role" size="md">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input
            label="Role Name"
            required
            placeholder="e.g. Finance Manager"
            {...register('name')}
            onChange={(e) => {
              register('name').onChange(e)
              setValue('slug', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
            }}
            error={errors.name?.message}
          />
          <Input
            label="Slug"
            required
            placeholder="finance_manager"
            {...register('slug')}
            error={errors.slug?.message}
            hint="Unique identifier, auto-generated from name"
          />
          <Input label="Description" placeholder="Optional description" {...register('description')} />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className="w-6 h-6 rounded-full border-2 transition"
                  style={{ backgroundColor: c, borderColor: watch('color') === c ? c : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => { setShowCreate(false); reset() }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Role</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
