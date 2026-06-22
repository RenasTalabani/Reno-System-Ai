import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '@reno/auth'
import { RenoError, ErrorCode } from '@reno/core'
import { prisma } from '@reno/database'

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string
    userId: string
    sessionId: string
    roles: string[]
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers['authorization']

  // Check API key first
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

  // Verify tenant is active
  const tenant = await prisma.coreTenant.findFirst({
    where: { id: payload.tid, deletedAt: null },
  })

  if (!tenant) {
    throw new RenoError(ErrorCode.AUTH_TENANT_SUSPENDED, 'Tenant not found', 401)
  }

  if (tenant.status === 'suspended') {
    throw new RenoError(ErrorCode.AUTH_TENANT_SUSPENDED, 'Tenant account is suspended', 403)
  }

  // Verify user is active
  const user = await prisma.coreUser.findFirst({
    where: { id: payload.sub, tenantId: payload.tid, deletedAt: null },
  })

  if (!user || user.status === 'suspended' || user.status === 'inactive') {
    throw new RenoError(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'User account is inactive', 403)
  }

  request.tenantId = payload.tid
  request.userId = payload.sub
  request.sessionId = payload.sid
  request.roles = payload.roles
}

async function validateApiKey(key: string, request: FastifyRequest) {
  const prefix = key.slice(0, 12)
  const apiKey = await prisma.sysApiKey.findFirst({
    where: { keyPrefix: prefix, isActive: true, deletedAt: null, revokedAt: null },
  })

  if (!apiKey) {
    throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid API key', 401)
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new RenoError(ErrorCode.AUTH_TOKEN_EXPIRED, 'API key has expired', 401)
  }

  // Update last used
  await prisma.sysApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  request.tenantId = apiKey.tenantId
  request.userId = 'api-key'
  request.sessionId = apiKey.id
  request.roles = ['api_client']
}
