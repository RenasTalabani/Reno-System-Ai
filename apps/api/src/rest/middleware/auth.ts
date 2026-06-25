import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '@reno/auth'
import { RenoError, ErrorCode } from '@reno/core'
import { prisma } from '@reno/database'
import { withCache, cacheDel, CacheKey, TTL } from '../../cache/index.js'

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string
    userId: string
    sessionId: string
    roles: string[]
  }
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers['authorization']
  const apiKey = request.headers['x-api-key'] as string | undefined

  if (apiKey) {
    await validateApiKey(apiKey, request)
    return
  }

  if (!authHeader?.startsWith('Bearer ')) {
    throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Authorization required', 401)
  }

  const token = authHeader.slice(7)
  const payload = verifyAccessToken(token)

  // Verify tenant is active — cached for 5 minutes
  const tenant = await withCache(
    CacheKey.tenantById(payload.tid),
    TTL.TENANT,
    () => prisma.coreTenant.findFirst({
      where: { id: payload.tid, deletedAt: null },
      select: { id: true, status: true },
    }),
  )

  if (!tenant) {
    throw new RenoError(ErrorCode.AUTH_TENANT_SUSPENDED, 'Tenant not found', 401)
  }

  if (tenant.status === 'suspended') {
    throw new RenoError(ErrorCode.AUTH_TENANT_SUSPENDED, 'Tenant account is suspended', 403)
  }

  // Verify user is active — cached for 1 minute (short TTL for security)
  const user = await withCache(
    CacheKey.user(payload.tid, payload.sub),
    TTL.USER_AUTH,
    () => prisma.coreUser.findFirst({
      where: { id: payload.sub, tenantId: payload.tid, deletedAt: null },
      select: { id: true, status: true },
    }),
  )

  if (!user || user.status === 'suspended' || user.status === 'inactive') {
    throw new RenoError(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'User account is inactive', 403)
  }

  request.tenantId = payload.tid
  request.userId = payload.sub
  request.sessionId = payload.sid
  request.roles = payload.roles
}

async function validateApiKey(key: string, request: FastifyRequest) {
  const prefix = key.slice(0, 20)
  const apiKey = await prisma.sysApiKey.findFirst({
    where: { keyPrefix: prefix, isActive: true, deletedAt: null, revokedAt: null },
  })

  if (!apiKey) {
    throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid API key', 401)
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new RenoError(ErrorCode.AUTH_TOKEN_EXPIRED, 'API key has expired', 401)
  }

  await prisma.sysApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  request.tenantId = apiKey.tenantId
  request.userId = 'api-key'
  request.sessionId = apiKey.id
  request.roles = ['api_client']
}

// ─── Cache Invalidation Helpers ───────────────────────────────────────────────
// Call these whenever tenant/user data changes.

export async function invalidateTenantCache(tenantId: string, slug?: string) {
  const keys = [CacheKey.tenantById(tenantId)]
  if (slug) keys.push(CacheKey.tenant(slug))
  await cacheDel(...keys)
}

export async function invalidateUserCache(tenantId: string, userId: string) {
  await cacheDel(
    CacheKey.user(tenantId, userId),
    CacheKey.userRoles(tenantId, userId),
  )
}
