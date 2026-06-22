'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Save, Palette, Flag, Key, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'

type Tab = 'branding' | 'feature-flags' | 'general'

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
  { id: 'general', label: 'General', icon: Globe },
]

const brandingSchema = z.object({
  appName: z.string().min(1, 'Required'),
  primaryColor: z.string(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal('')),
  supportUrl: z.string().url().optional().or(z.literal('')),
})
type BrandingForm = z.infer<typeof brandingSchema>

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('branding')
  const qc = useQueryClient()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your tenant preferences</p>
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

      {tab === 'branding' && <BrandingTab qc={qc} />}
      {tab === 'feature-flags' && <FeatureFlagsTab qc={qc} />}
      {tab === 'general' && <GeneralTab qc={qc} />}
    </div>
  )
}

function BrandingTab({ qc }: { qc: any }) {
  const { data: branding, isLoading } = useQuery({
    queryKey: ['branding'],
    queryFn: () => api.get('/settings/branding').then(r => r.data.data),
  })

  const mutation = useMutation({
    mutationFn: (data: BrandingForm) => api.put('/settings/branding', data),
    onSuccess: () => { toast.success('Branding saved'); qc.invalidateQueries({ queryKey: ['branding'] }) },
    onError: () => toast.error('Failed to save branding'),
  })

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    values: branding ? {
      appName: branding.appName ?? 'Reno System',
      primaryColor: branding.primaryColor ?? '#6366f1',
      secondaryColor: branding.secondaryColor ?? '',
      fontFamily: branding.fontFamily ?? '',
      supportEmail: branding.supportEmail ?? '',
      supportUrl: branding.supportUrl ?? '',
    } : undefined,
  })

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Identity</h3>
        <Input label="App Name" required placeholder="Reno System" {...register('appName')} error={errors.appName?.message} />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Primary Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" {...register('primaryColor')} className="h-9 w-14 rounded-lg border border-border cursor-pointer" />
              <Input className="flex-1" {...register('primaryColor')} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Secondary Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" {...register('secondaryColor')} className="h-9 w-14 rounded-lg border border-border cursor-pointer" />
              <Input className="flex-1" {...register('secondaryColor')} />
            </div>
          </div>
        </div>
        <Input label="Font Family" placeholder="Inter, sans-serif" {...register('fontFamily')} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Support</h3>
        <Input label="Support Email" type="email" placeholder="support@company.com" {...register('supportEmail')} error={errors.supportEmail?.message} />
        <Input label="Support URL" placeholder="https://help.company.com" {...register('supportUrl')} error={errors.supportUrl?.message} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending} disabled={!isDirty} icon={<Save className="w-4 h-4" />}>
          Save Branding
        </Button>
      </div>
    </form>
  )
}

function FeatureFlagsTab({ qc }: { qc: any }) {
  const { data: flags, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => api.get('/settings/feature-flags').then(r => r.data.data ?? []),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ module, feature, enabled }: { module: string; feature: string; enabled: boolean }) =>
      api.patch(`/settings/feature-flags/${module}/${feature}`, { enabled }),
    onSuccess: () => { toast.success('Feature flag updated'); qc.invalidateQueries({ queryKey: ['feature-flags'] }) },
    onError: () => toast.error('Failed to update flag'),
  })

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>

  const grouped = (flags ?? []).reduce((acc: Record<string, any[]>, f: any) => {
    if (!acc[f.module]) acc[f.module] = []
    acc[f.module].push(f)
    return acc
  }, {})

  return (
    <div className="max-w-2xl space-y-4">
      {Object.entries(grouped).map(([module, moduleFlags]) => (
        <div key={module} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground capitalize">{module}</p>
          </div>
          <div className="divide-y divide-border">
            {(moduleFlags as any[]).map((flag) => (
              <div key={flag.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{flag.feature}</p>
                  <p className="text-xs text-muted-foreground">{flag.rolloutPercentage < 100 ? `${flag.rolloutPercentage}% rollout` : 'Full rollout'}</p>
                </div>
                <button
                  onClick={() => toggleMutation.mutate({ module: flag.module, feature: flag.feature, enabled: !flag.isEnabled })}
                  disabled={toggleMutation.isPending}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    flag.isEnabled ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', flag.isEnabled ? 'translate-x-4' : 'translate-x-1')} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GeneralTab({ qc }: { qc: any }) {
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys-list'],
    queryFn: () => api.get('/settings').then(r => r.data),
    retry: false,
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">API Keys</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          API keys allow external services to access Reno System on behalf of this tenant. API key management will be fully available in the API Keys module.
        </p>
        <Badge variant="info">API Key management coming in Phase 0.1</Badge>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Danger Zone</h3>
        <div className="border border-red-200 dark:border-red-900 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Suspend Tenant</p>
            <p className="text-xs text-muted-foreground">Temporarily disable all access to this tenant</p>
          </div>
          <Button variant="danger" size="sm">Suspend</Button>
        </div>
      </div>
    </div>
  )
}
