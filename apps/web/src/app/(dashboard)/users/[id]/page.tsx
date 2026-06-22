'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getInitials, formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Save, Shield, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useEffect } from 'react'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const statusBadge = (status: string) => {
  if (status === 'active') return <Badge variant="success">Active</Badge>
  if (status === 'suspended') return <Badge variant="danger">Suspended</Badge>
  if (status === 'pending') return <Badge variant="warning">Pending</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/users/${id}`).then(r => r.data.data),
  })

  const { data: auditData } = useQuery({
    queryKey: ['user-audit', id],
    queryFn: () =>
      api.get(`/audit-logs?entityId=${id}&limit=10`).then(r => r.data.data ?? []),
  })

  const updateMutation = useMutation({
    mutationFn: (form: FormData) =>
      api.put(`/users/${id}`, {
        profile: {
          firstName: form.firstName,
          lastName: form.lastName,
          displayName: form.displayName,
        },
        membership: { jobTitle: form.jobTitle },
      }),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['user', id] })
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to update'),
  })

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (data) {
      reset({
        firstName: data.profile?.firstName ?? '',
        lastName: data.profile?.lastName ?? '',
        displayName: data.profile?.displayName ?? '',
        jobTitle: data.membership?.jobTitle ?? '',
      })
    }
  }, [data, reset])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-1" />
          <Skeleton className="h-64 col-span-2" />
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-muted-foreground">User not found</div>

  const displayName = data.profile?.displayName
    ?? `${data.profile?.firstName ?? ''} ${data.profile?.lastName ?? ''}`.trim()
    || data.email

  return (
    <div className="space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/users" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {getInitials(data.profile?.firstName ?? data.email, data.profile?.lastName)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">{displayName}</h3>
            <p className="text-sm text-muted-foreground">{data.email}</p>
            {data.membership?.jobTitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.membership.jobTitle}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 w-full">
            {statusBadge(data.status)}
            {data.mfaEnabled && <Badge variant="info">MFA Enabled</Badge>}
          </div>
          <div className="w-full border-t border-border pt-3 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">{formatDate(data.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Updated</span>
              <span className="text-foreground">{formatDate(data.updatedAt)}</span>
            </div>
          </div>

          {/* Roles */}
          {data.roles && data.roles.length > 0 && (
            <div className="w-full border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Roles
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {data.roles.map((r: any) => (
                  <Badge key={r.id} variant="default">{r.role?.name ?? r.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="font-semibold text-foreground mb-4">Profile Information</h4>
            <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  required
                  {...register('firstName')}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  {...register('lastName')}
                />
              </div>
              <Input
                label="Display Name"
                placeholder="How their name appears in the system"
                {...register('displayName')}
              />
              <Input
                label="Job Title"
                placeholder="e.g. Software Engineer"
                {...register('jobTitle')}
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  loading={updateMutation.isPending}
                  disabled={!isDirty}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Recent audit */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </h4>
            {(!auditData || auditData.length === 0) ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {auditData.map((log: any) => (
                  <div key={log.id} className="flex items-start justify-between gap-4 text-sm py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-medium text-foreground">{log.action}</span>
                      <span className="text-muted-foreground ml-2">{log.entityType}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.occurredAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
