'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Key,
  Activity,
  ChevronRight,
  Info,
} from 'lucide-react'

const API = '/api/v1/admin/ai'

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  return j.data
}

export default function AiProvidersPage() {
  const qc = useQueryClient()

  const { data: status, isLoading } = useQuery({
    queryKey: ['ai-provider-status'],
    queryFn: () => fetchJson(`${API}/status`),
  })

  const { data: registry = [] } = useQuery({
    queryKey: ['ai-registry'],
    queryFn: () => fetchJson(`${API}/registry`),
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['ai-provider-audit'],
    queryFn: () => fetchJson(`${API}/audit?limit=10`),
  })

  const [keyModal, setKeyModal] = useState<{ id: string; name: string } | null>(null)
  const [consentModal, setConsentModal] = useState<{ slug: string; name: string } | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [consentAgreed, setConsentAgreed] = useState(false)

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/providers/${id}/test`, { method: 'POST', credentials: 'include' })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.data?.status === 'connected') {
        toast.success(`Connected — model: ${data.data.model}, ${data.data.latencyMs}ms`)
      } else {
        toast.error(data.data?.message ?? 'Connection failed')
      }
    },
  })

  const keyMutation = useMutation({
    mutationFn: async ({ id, key }: { id: string; key: string }) => {
      const res = await fetch(`${API}/providers/${id}/key`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success('API key saved and encrypted.')
      qc.invalidateQueries({ queryKey: ['ai-provider-status'] })
      setKeyModal(null)
      setApiKeyInput('')
    },
  })

  const consentMutation = useMutation({
    mutationFn: async ({ slug }: { slug: string }) => {
      const res = await fetch(`${API}/consent`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerSlug: slug,
          consentText: "I acknowledge that data will be sent to this external AI provider and I accept the provider's terms of service.",
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success('Consent granted. You can now configure this provider.')
      qc.invalidateQueries({ queryKey: ['ai-provider-status'] })
      setConsentModal(null)
      setConsentAgreed(false)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`${API}/consent/${slug}`, { method: 'DELETE', credentials: 'include' })
      return res.json()
    },
    onSuccess: () => {
      toast.success('Consent revoked. Provider disabled.')
      qc.invalidateQueries({ queryKey: ['ai-provider-status'] })
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const configs: any[] = status?.configs ?? []
  const consents: any[] = status?.consents ?? []
  const available: any[] = registry

  function getConsentStatus(slug: string) {
    return consents.find((c: any) => c.providerSlug === slug && c.consentGiven && !c.revokedAt)
  }

  function getConfig(providerSlug: string) {
    const apiProvider = providerSlug === 'claude' ? 'anthropic' : providerSlug
    return configs.find((c: any) => c.provider === apiProvider || c.provider === providerSlug)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">AI Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reno Brain is your default AI — always on, no setup required. External providers are optional and require explicit consent.
        </p>
      </div>

      {/* Active Provider Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Active Provider: {status?.activeProviderName}
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
            All AI requests are handled by this provider.
          </p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {available.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading providers...</p>
        )}
        {available.map((provider: any) => {
          const isBuiltIn = provider.isBuiltIn
          const consent = getConsentStatus(provider.slug)
          const config = getConfig(provider.slug)
          const hasKey = config?.keyHint
          const isActive = config?.isActive && config?.isDefault

          return (
            <div key={provider.slug} className={`rounded-xl border bg-card p-5 space-y-4 ${isActive ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{provider.name}</h3>
                    {isBuiltIn && <Badge variant="info">Built-in</Badge>}
                    {isActive && <Badge variant="success">Active</Badge>}
                    {provider.requiresConsent && !isBuiltIn && (
                      <Badge variant="warning">
                        <Shield className="h-3 w-3 mr-1 inline" />Requires Consent
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.capabilities?.map((cap: string) => (
                      <span key={cap} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{cap}</span>
                    ))}
                  </div>
                </div>
                {!isBuiltIn && config && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => testMutation.mutate(config.id)}
                    className="shrink-0"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />Test
                  </Button>
                )}
              </div>

              {isBuiltIn && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  Always available — no API key or consent required. Data stays on your server.
                </p>
              )}

              {!isBuiltIn && (
                <div className="space-y-2 border-t border-border pt-3">
                  {/* Consent row */}
                  {provider.requiresConsent && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>Consent:</span>
                        {consent ? (
                          <span className="text-emerald-600 font-medium">Granted</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Not given</span>
                        )}
                      </div>
                      {consent ? (
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-600 hover:text-red-700 text-xs"
                          onClick={() => revokeMutation.mutate(provider.slug)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setConsentModal({ slug: provider.slug, name: provider.name })}
                        >
                          Grant Consent
                        </Button>
                      )}
                    </div>
                  )}

                  {/* API Key row */}
                  {provider.requiresApiKey && consent && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span>API Key:</span>
                        {hasKey ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{config.keyHint}</code>
                        ) : (
                          <span className="text-amber-600">Not configured</span>
                        )}
                      </div>
                      {config && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setKeyModal({ id: config.id, name: provider.name })}
                        >
                          {hasKey ? 'Update' : 'Add Key'}
                        </Button>
                      )}
                    </div>
                  )}

                  {!consent && provider.requiresConsent && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      Grant consent first to configure and enable this provider.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Audit Log */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4" />Recent Provider Activity
        </h2>
        {(auditLogs as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {(auditLogs as any[]).slice(0, 8).map((log: any) => (
              <div key={log.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : log.status === 'error' ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="font-medium">{log.providerSlug}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{log.action}</span>
                  {log.tokensUsed != null && (
                    <span className="text-xs text-muted-foreground">({log.tokensUsed} tokens)</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.occurredAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Key Modal */}
      <Modal
        open={!!keyModal}
        onClose={() => { setKeyModal(null); setApiKeyInput('') }}
        title={`Set API Key — ${keyModal?.name}`}
        description="Your API key will be encrypted with AES-256 before storage. It is never returned to the frontend."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="api-key" className="text-sm font-medium">API Key</label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-ant-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300 flex gap-2">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            Key is encrypted at rest using AES-256-GCM. After saving, only a masked hint is displayed.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setKeyModal(null); setApiKeyInput('') }}>Cancel</Button>
            <Button
              disabled={!apiKeyInput.trim() || keyMutation.isPending}
              onClick={() => keyModal && keyMutation.mutate({ id: keyModal.id, key: apiKeyInput })}
              loading={keyMutation.isPending}
            >
              Save Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Consent Modal */}
      <Modal
        open={!!consentModal}
        onClose={() => { setConsentModal(null); setConsentAgreed(false) }}
        title={`Grant Consent — ${consentModal?.name}`}
        description="Before enabling this provider, confirm that business data may be sent to an external AI service."
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-4 w-4" />Data Privacy Notice
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc pl-4">
              <li>Business context (metrics, summaries) will be sent to {consentModal?.name}</li>
              <li>Only minimum required data is included in each request</li>
              <li>Raw customer PII is never included unless you explicitly send it</li>
              <li>You can revoke consent at any time from this settings page</li>
              <li>Review the provider&apos;s data processing agreement before proceeding</li>
            </ul>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAgreed}
              onChange={(e) => setConsentAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="text-sm">
              I understand and consent to sending business data to {consentModal?.name}
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setConsentModal(null); setConsentAgreed(false) }}>Cancel</Button>
            <Button
              disabled={!consentAgreed || consentMutation.isPending}
              onClick={() => consentModal && consentMutation.mutate({ slug: consentModal.slug })}
              loading={consentMutation.isPending}
            >
              Grant Consent
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
