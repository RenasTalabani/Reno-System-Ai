import { prisma } from '@reno/database'
import { encryptApiKey, decryptApiKey, maskApiKey, isEncryptionAvailable } from './crypto.service.js'
import { callAI, type ChatMessage, type ChatOptions, type AIResponse } from './provider.js'

export type ProviderSlug = 'reno_brain' | 'claude' | 'openai' | 'google' | string

export interface ResolvedProvider {
  slug: ProviderSlug
  providerType: string
  model: string
  apiKey?: string
  baseUrl?: string
  configId?: string
  isFallback: boolean
  fallbackReason?: string
}

export interface ProviderCallOptions extends ChatOptions {
  tenantId: string
  userId?: string
  module?: string
  requestSummary?: string
}

// Resolve which provider to use for a given tenant (and optional module override)
export async function resolveProvider(
  tenantId: string,
  module?: string
): Promise<ResolvedProvider> {
  // Load tenant's active default provider config
  const config = await prisma.brainProviderConfig.findFirst({
    where: { tenantId, isActive: true, isDefault: true },
  })

  if (!config || config.provider === 'mock' || config.provider === 'reno_brain') {
    return { slug: 'reno_brain', providerType: 'internal', model: 'reno-brain-v1', isFallback: false }
  }

  // Check module-level override if specified
  if (module && config.moduleOverrides) {
    const overrides = config.moduleOverrides as Record<string, string>
    if (overrides[module]) {
      const overrideSlug = overrides[module]
      if (overrideSlug === 'reno_brain') {
        return { slug: 'reno_brain', providerType: 'internal', model: 'reno-brain-v1', isFallback: false }
      }
    }
  }

  // Verify consent for external providers
  const providerSlug = normalizeSlug(config.provider)
  const registryEntry = await prisma.aiProviderRegistry.findUnique({ where: { slug: providerSlug } })

  if (registryEntry?.requiresConsent) {
    const consent = await prisma.tenantAiConsent.findUnique({
      where: { tenantId_providerSlug: { tenantId, providerSlug } },
    })
    if (!consent?.consentGiven || consent.revokedAt) {
      return {
        slug: 'reno_brain',
        providerType: 'internal',
        model: 'reno-brain-v1',
        isFallback: true,
        fallbackReason: `No consent given for ${providerSlug}`,
      }
    }
  }

  // Decrypt API key
  let apiKey: string | undefined
  if (config.encryptedApiKey) {
    try {
      apiKey = decryptApiKey(config.encryptedApiKey)
    } catch {
      return {
        slug: 'reno_brain',
        providerType: 'internal',
        model: 'reno-brain-v1',
        isFallback: true,
        fallbackReason: 'Failed to decrypt API key',
      }
    }
  } else if (config.apiKey) {
    // Legacy plaintext key — use but flag for migration
    apiKey = config.apiKey
  }

  if (!apiKey) {
    return {
      slug: 'reno_brain',
      providerType: 'internal',
      model: 'reno-brain-v1',
      isFallback: true,
      fallbackReason: 'No API key configured',
    }
  }

  return {
    slug: providerSlug,
    providerType: registryEntry?.providerType ?? config.provider,
    model: config.model,
    apiKey,
    baseUrl: config.baseUrl ?? undefined,
    configId: config.id,
    isFallback: false,
  }
}

// Call AI using resolved provider — with automatic fallback to Reno Brain
export async function callWithProvider(
  messages: ChatMessage[],
  options: ProviderCallOptions
): Promise<AIResponse & { providerSlug: string; isFallback: boolean }> {
  const { tenantId, userId, module, requestSummary, ...chatOptions } = options
  const resolved = await resolveProvider(tenantId, module)

  if (resolved.isFallback) {
    // Log the fallback event
    await logProviderAudit({
      tenantId,
      userId,
      providerSlug: resolved.slug,
      action: 'fallback',
      status: 'fallback',
      module,
      requestSummary,
      fallbackTo: 'reno_brain',
      metadata: { reason: resolved.fallbackReason },
    })
  }

  // For Reno Brain (internal), delegate to existing callAI with mock config
  const providerConfig = resolved.slug === 'reno_brain'
    ? { provider: 'mock' as const, model: 'reno-brain-v1' }
    : {
        provider: resolved.providerType as 'anthropic' | 'openai' | 'google' | 'mock',
        apiKey: resolved.apiKey,
        baseUrl: resolved.baseUrl,
        model: resolved.model,
      }

  const start = Date.now()
  let aiResponse: AIResponse
  let status: 'success' | 'error' = 'success'
  let errorMessage: string | undefined

  try {
    aiResponse = await callAI(messages, chatOptions, providerConfig)
  } catch (err: any) {
    status = 'error'
    errorMessage = err.message

    // Fallback to Reno Brain on error if fallback is enabled
    const cfg = resolved.configId
      ? await prisma.brainProviderConfig.findUnique({ where: { id: resolved.configId } })
      : null
    const fallbackEnabled = cfg?.fallbackEnabled ?? true

    if (fallbackEnabled && resolved.slug !== 'reno_brain') {
      await logProviderAudit({
        tenantId, userId,
        providerSlug: resolved.slug,
        action: 'fallback',
        status: 'fallback',
        module,
        errorMessage,
        fallbackTo: 'reno_brain',
        latencyMs: Date.now() - start,
      })
      aiResponse = await callAI(messages, chatOptions, { provider: 'mock', model: 'reno-brain-v1' })
      await logProviderAudit({
        tenantId, userId,
        providerSlug: 'reno_brain',
        action: 'call',
        status: 'success',
        module,
        requestSummary,
        tokensUsed: aiResponse.totalTokens,
        latencyMs: aiResponse.latencyMs,
      })
      return { ...aiResponse, providerSlug: 'reno_brain', isFallback: true }
    }
    throw err
  }

  // Log successful call
  await logProviderAudit({
    tenantId, userId,
    providerSlug: resolved.slug,
    action: 'call',
    status,
    module,
    requestSummary,
    tokensUsed: aiResponse.totalTokens,
    latencyMs: aiResponse.latencyMs,
    errorMessage,
  })

  return { ...aiResponse, providerSlug: resolved.slug, isFallback: resolved.isFallback }
}

// Save API key with encryption
export async function saveProviderApiKey(configId: string, plainKey: string): Promise<{ hint: string }> {
  const hint = maskApiKey(plainKey)

  if (isEncryptionAvailable()) {
    const encrypted = encryptApiKey(plainKey)
    await prisma.brainProviderConfig.update({
      where: { id: configId },
      data: { encryptedApiKey: encrypted, keyHint: hint, apiKey: null },
    })
  } else {
    // Fallback: store plaintext if no encryption key (dev mode)
    await prisma.brainProviderConfig.update({
      where: { id: configId },
      data: { apiKey: plainKey, keyHint: hint },
    })
  }

  return { hint }
}

// List available providers from registry
export async function listProviderRegistry(): Promise<typeof prisma.aiProviderRegistry.findMany extends (...args: any[]) => Promise<infer R> ? R : never> {
  return prisma.aiProviderRegistry.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: 'asc' },
  })
}

// Grant tenant consent for a provider
export async function grantConsent(
  tenantId: string,
  providerSlug: string,
  userId: string,
  consentText: string
): Promise<void> {
  await prisma.tenantAiConsent.upsert({
    where: { tenantId_providerSlug: { tenantId, providerSlug } },
    create: {
      tenantId, providerSlug,
      consentGiven: true,
      consentGivenAt: new Date(),
      consentGivenBy: userId,
      consentText,
    },
    update: {
      consentGiven: true,
      consentGivenAt: new Date(),
      consentGivenBy: userId,
      consentText,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
    },
  })

  await logProviderAudit({ tenantId, userId, providerSlug, action: 'consent', status: 'success' })
}

// Revoke tenant consent for a provider
export async function revokeConsent(
  tenantId: string,
  providerSlug: string,
  userId: string,
  reason?: string
): Promise<void> {
  await prisma.tenantAiConsent.updateMany({
    where: { tenantId, providerSlug },
    data: {
      consentGiven: false,
      revokedAt: new Date(),
      revokedBy: userId,
      revokeReason: reason,
    },
  })

  // Deactivate the provider config so no calls go through
  await prisma.brainProviderConfig.updateMany({
    where: { tenantId, provider: providerSlug },
    data: { isActive: false, status: 'revoked', statusReason: `Consent revoked by user ${userId}` },
  })

  await logProviderAudit({ tenantId, userId, providerSlug, action: 'revoke', status: 'success', metadata: { reason } })
}

// Log a provider audit event
export async function logProviderAudit(params: {
  tenantId: string
  userId?: string
  providerSlug: string
  action: string
  status: string
  module?: string
  requestSummary?: string
  responseStatus?: number
  tokensUsed?: number
  latencyMs?: number
  errorMessage?: string
  fallbackTo?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.aiProviderAuditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        providerSlug: params.providerSlug,
        action: params.action,
        status: params.status,
        module: params.module,
        requestSummary: params.requestSummary,
        responseStatus: params.responseStatus,
        tokensUsed: params.tokensUsed,
        latencyMs: params.latencyMs,
        errorMessage: params.errorMessage,
        fallbackTo: params.fallbackTo,
        metadata: params.metadata as any,
      },
    })
  } catch {
    // Never throw on audit log failures
  }
}

function normalizeSlug(provider: string): ProviderSlug {
  if (provider === 'anthropic') return 'claude'
  if (provider === 'openai') return 'openai'
  if (provider === 'google') return 'google'
  return provider
}
