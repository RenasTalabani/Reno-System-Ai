import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@reno/database'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyPassword,
  hashPassword,
  generateMfaSecret,
  generateMfaQrCode,
  verifyMfaCode,
  generateBackupCodes,
} from '@reno/auth'
import { RenoError, ErrorCode, buildSuccessResponse } from '@reno/core'
import { eventBus, EventTypes } from '@reno/events'
import { requireAuth } from '../middleware/auth.js'
import { logger } from '@reno/logger'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
})

const RefreshSchema = z.object({
  refreshToken: z.string(),
})

const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(12),
})

const MfaVerifySchema = z.object({
  code: z.string().length(6),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /v1/auth/login
  app.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    // Resolve tenant
    const tenant = await prisma.coreTenant.findFirst({
      where: { slug: body.tenantSlug, deletedAt: null },
    })

    if (!tenant || tenant.status === 'suspended') {
      throw new RenoError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid credentials', 401)
    }

    // Find user
    const user = await prisma.coreUser.findFirst({
      where: { tenantId: tenant.id, email: body.email.toLowerCase(), deletedAt: null },
      include: { profile: true, userRoles: { include: { role: true } } },
    })

    const isValid = user ? await verifyPassword(body.password, user.passwordHash) : false

    if (!user || !isValid) {
      eventBus.publish({
        type: EventTypes.AUTH_USER_LOGIN_FAILED,
        tenantId: tenant.id,
        actorId: null,
        version: '1.0',
        payload: { email: body.email },
        metadata: { sourceModule: 'auth', correlationId: crypto.randomUUID() },
      })
      throw new RenoError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401)
    }

    if (user.status === 'suspended') {
      throw new RenoError(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Your account has been suspended', 403)
    }

    // MFA check
    if (user.mfaEnabled && user.mfaSecret) {
      return reply.send(buildSuccessResponse({
        mfaRequired: true,
        tempToken: signAccessToken({
          sub: user.id,
          tid: tenant.id,
          sid: 'temp',
          roles: [],
          email: user.email,
        }),
        user: null,
        accessToken: '',
        expiresIn: 900,
      }))
    }

    // Create session
    const session = await prisma.coreSession.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        refreshTokenHash: crypto.randomUUID(), // placeholder — replaced below
        deviceName: (request.headers['user-agent'] ?? 'Unknown').slice(0, 255),
        deviceType: 'web',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const roles = user.userRoles.map((ur) => ur.role.slug)
    const accessToken = signAccessToken({
      sub: user.id,
      tid: tenant.id,
      sid: session.id,
      roles,
      email: user.email,
    })
    const refreshToken = signRefreshToken(session.id)

    // Update session with actual refresh token hash
    const { subtle } = crypto
    const encoder = new TextEncoder()
    const hashBuffer = await subtle.digest('SHA-256', encoder.encode(refreshToken))
    const tokenHash = Buffer.from(hashBuffer).toString('hex')

    await prisma.coreSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: tokenHash },
    })

    // Update last login
    await prisma.coreUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: request.ip },
    })

    // Audit log
    await prisma.sysAuditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        sessionId: session.id,
        action: EventTypes.AUTH_USER_LOGIN,
        module: 'auth',
        entityType: 'core_users',
        entityId: user.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    })

    eventBus.publish({
      type: EventTypes.AUTH_USER_LOGIN,
      tenantId: tenant.id,
      actorId: user.id,
      version: '1.0',
      payload: { userId: user.id, sessionId: session.id },
      metadata: { sourceModule: 'auth', correlationId: session.id },
    })

    // Set refresh token as HTTP-only cookie
    reply.setCookie('reno_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/v1/auth',
      maxAge: 7 * 24 * 60 * 60,
    })

    return reply.send(buildSuccessResponse({
      accessToken,
      refreshToken,
      expiresIn: 900,
      mfaRequired: false,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        avatarUrl: user.profile?.avatarUrl,
        roles,
        tenantId: tenant.id,
      },
    }))
  })

  // POST /v1/auth/logout
  app.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    await prisma.coreSession.updateMany({
      where: { id: request.sessionId, tenantId: request.tenantId },
      data: { revokedAt: new Date(), isActive: false },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        sessionId: request.sessionId,
        action: EventTypes.AUTH_USER_LOGOUT,
        module: 'auth',
        entityType: 'core_sessions',
        entityId: request.sessionId,
        ipAddress: request.ip,
      },
    })

    reply.clearCookie('reno_refresh_token', { path: '/v1/auth' })
    return reply.send(buildSuccessResponse({ loggedOut: true }))
  })

  // POST /v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const body = request.body as { refreshToken?: string }
    const cookieToken = request.cookies?.['reno_refresh_token']
    const token = body?.refreshToken ?? cookieToken

    if (!token) {
      throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Refresh token required', 401)
    }

    const { sid } = verifyRefreshToken(token)

    const session = await prisma.coreSession.findFirst({
      where: { id: sid, isActive: true, deletedAt: null },
      include: { user: { include: { userRoles: { include: { role: true } } } } },
    })

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Session expired or revoked', 401)
    }

    const roles = session.user.userRoles.map((ur) => ur.role.slug)
    const newAccessToken = signAccessToken({
      sub: session.userId,
      tid: session.tenantId,
      sid: session.id,
      roles,
      email: session.user.email,
    })
    const newRefreshToken = signRefreshToken(session.id)

    // Rotate refresh token
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(newRefreshToken))
    const tokenHash = Buffer.from(hashBuffer).toString('hex')

    await prisma.coreSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: tokenHash, lastActiveAt: new Date() },
    })

    reply.setCookie('reno_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/v1/auth',
      maxAge: 7 * 24 * 60 * 60,
    })

    return reply.send(buildSuccessResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    }))
  })

  // GET /v1/auth/sessions — list active sessions
  app.get('/sessions', { preHandler: [requireAuth] }, async (request, reply) => {
    const sessions = await prisma.coreSession.findMany({
      where: {
        tenantId: request.tenantId,
        userId: request.userId,
        revokedAt: null,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    })

    return reply.send(buildSuccessResponse(sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: s.id === request.sessionId,
    }))))
  })

  // DELETE /v1/auth/sessions/:id — revoke a session
  app.delete('/sessions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    await prisma.coreSession.updateMany({
      where: {
        id,
        tenantId: request.tenantId,
        userId: request.userId,
      },
      data: { revokedAt: new Date(), isActive: false },
    })

    return reply.send(buildSuccessResponse({ revoked: true }))
  })

  // POST /v1/auth/mfa/setup
  app.post('/mfa/setup', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = await prisma.coreUser.findFirst({
      where: { id: request.userId, tenantId: request.tenantId },
    })

    if (!user) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)

    const { secret, otpauthUrl } = generateMfaSecret(user.email)
    const qrCodeDataUrl = await generateMfaQrCode(otpauthUrl)
    const backupCodes = generateBackupCodes()

    // Store secret temporarily (not activated until verified)
    await prisma.coreUser.update({
      where: { id: user.id },
      data: {
        mfaSecret: secret,
        mfaBackupCodes: JSON.stringify(backupCodes),
      },
    })

    return reply.send(buildSuccessResponse({ secret, qrCodeDataUrl, backupCodes }))
  })

  // POST /v1/auth/mfa/verify
  app.post('/mfa/verify', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = MfaVerifySchema.parse(request.body)

    const user = await prisma.coreUser.findFirst({
      where: { id: request.userId, tenantId: request.tenantId },
    })

    if (!user?.mfaSecret) {
      throw new RenoError(ErrorCode.BUSINESS_RULE_VIOLATION, 'MFA not set up', 400)
    }

    const isValid = verifyMfaCode(user.mfaSecret, body.code)
    if (!isValid) {
      throw new RenoError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid MFA code', 401)
    }

    await prisma.coreUser.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: EventTypes.AUTH_MFA_ENABLED,
        module: 'auth',
        entityType: 'core_users',
        entityId: user.id,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ mfaEnabled: true }))
  })

  // POST /v1/auth/password/change
  app.post('/password/change', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = ChangePasswordSchema.parse(request.body)

    const user = await prisma.coreUser.findFirst({
      where: { id: request.userId, tenantId: request.tenantId },
    })

    if (!user) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)

    const isCurrentValid = await verifyPassword(body.currentPassword, user.passwordHash)
    if (!isCurrentValid) {
      throw new RenoError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Current password is incorrect', 401)
    }

    const newHash = await hashPassword(body.newPassword)

    await prisma.coreUser.update({
      where: { id: user.id },
      data: { passwordHash: newHash, passwordChangedAt: new Date() },
    })

    // Revoke all other sessions
    await prisma.coreSession.updateMany({
      where: { userId: user.id, id: { not: request.sessionId } },
      data: { revokedAt: new Date(), isActive: false },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: EventTypes.AUTH_PASSWORD_CHANGED,
        module: 'auth',
        entityType: 'core_users',
        entityId: user.id,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ passwordChanged: true }))
  })
}
