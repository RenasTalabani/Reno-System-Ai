import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@reno/database'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
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

const MfaLoginSchema = z.object({
  code: z.string().length(6),
  tempToken: z.string().min(1),
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

// Default security policy values
const DEFAULT_POLICY = {
  maxFailedAttempts: 5,
  lockoutDurationMins: 15,
  passwordHistoryCount: 5,
  sessionTimeoutMins: 480,
  maxConcurrentSessions: 10,
  mfaRequired: false,
  ipAllowlistEnabled: false,
}

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    // Strip IPv6 prefix from IPv4-mapped addresses
    const cleanIp = ip.replace(/^::ffff:/, '')
    const parts = cidr.split('/')
    const network = parts[0]
    const mask = parts[1] !== undefined ? parseInt(parts[1], 10) : 32

    if (!network) return false
    const ipParts = cleanIp.split('.')
    const netParts = network.split('.')
    if (ipParts.length !== 4 || netParts.length !== 4) return false

    const ipNum = ipParts.reduce((acc, o) => (acc * 256 + parseInt(o, 10)) >>> 0, 0)
    const netNum = netParts.reduce((acc, o) => (acc * 256 + parseInt(o, 10)) >>> 0, 0)
    const maskNum = mask === 0 ? 0 : ((0xffffffff << (32 - mask)) >>> 0)

    return (ipNum & maskNum) === (netNum & maskNum)
  } catch {
    return false
  }
}

async function getSecurityPolicy(tenantId: string) {
  const policy = await prisma.coreTenantSecurityPolicy.findUnique({
    where: { tenantId },
  })
  return policy ?? { ...DEFAULT_POLICY, tenantId }
}

async function checkIpRules(ip: string, tenantId: string, allowlistEnabled: boolean): Promise<void> {
  const rules = await prisma.secIpRule.findMany({
    where: { tenantId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  })

  const blockRules = rules.filter((r) => r.type === 'block')
  const allowRules = rules.filter((r) => r.type === 'allow')

  // Check blocklist first
  for (const rule of blockRules) {
    if (ipInCidr(ip, rule.cidr)) {
      throw new RenoError(ErrorCode.FORBIDDEN, 'Access denied from your IP address', 403)
    }
  }

  // Check allowlist if enabled
  if (allowlistEnabled && allowRules.length > 0) {
    const allowed = allowRules.some((rule) => ipInCidr(ip, rule.cidr))
    if (!allowed) {
      throw new RenoError(ErrorCode.FORBIDDEN, 'Access denied: IP not in allowlist', 403)
    }
  }
}

async function recordLoginAttempt(data: {
  tenantId: string
  userId?: string
  email: string
  ipAddress: string
  userAgent?: string
  success: boolean
  failReason?: string
}) {
  await prisma.secLoginAttempt.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent?.slice(0, 500),
      success: data.success,
      failReason: data.failReason,
    },
  })
}

async function createSession(
  tenantId: string,
  userId: string,
  roles: string[],
  email: string,
  ip: string,
  userAgent?: string,
) {
  const session = await prisma.coreSession.create({
    data: {
      tenantId,
      userId,
      refreshTokenHash: crypto.randomUUID(),
      deviceName: (userAgent ?? 'Unknown').slice(0, 255),
      deviceType: 'web',
      ipAddress: ip,
      userAgent: userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const accessToken = signAccessToken({ sub: userId, tid: tenantId, sid: session.id, roles, email })
  const refreshToken = signRefreshToken(session.id)

  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(refreshToken))
  const tokenHash = Buffer.from(hashBuffer).toString('hex')

  await prisma.coreSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: tokenHash },
  })

  return { session, accessToken, refreshToken }
}

export async function authRoutes(app: FastifyInstance) {
  // POST /v1/auth/login
  app.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)
    const ip = request.ip ?? '0.0.0.0'

    // Resolve tenant
    const tenant = await prisma.coreTenant.findFirst({
      where: { slug: body.tenantSlug, deletedAt: null },
    })

    if (!tenant || tenant.status === 'suspended') {
      throw new RenoError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid credentials', 401)
    }

    // Get security policy and check IP rules
    const policy = await getSecurityPolicy(tenant.id)
    await checkIpRules(ip, tenant.id, policy.ipAllowlistEnabled)

    // Find user
    const user = await prisma.coreUser.findFirst({
      where: { tenantId: tenant.id, email: body.email.toLowerCase(), deletedAt: null },
      include: { profile: true, userRoles: { include: { role: true } } },
    })

    // Check account lockout
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      await recordLoginAttempt({
        tenantId: tenant.id,
        userId: user.id,
        email: body.email,
        ipAddress: ip,
        userAgent: request.headers['user-agent'],
        success: false,
        failReason: 'account_locked',
      })
      throw new RenoError(
        ErrorCode.AUTH_ACCOUNT_SUSPENDED,
        `Account locked. Try again in ${minutesLeft} minute(s).`,
        429,
      )
    }

    const isValid = user ? await verifyPassword(body.password, user.passwordHash) : false

    if (!user || !isValid) {
      // Record failed attempt
      if (user) {
        const newFailedCount = user.failedLoginAttempts + 1
        const shouldLock = newFailedCount >= policy.maxFailedAttempts
        await prisma.coreUser.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newFailedCount,
            lockedUntil: shouldLock
              ? new Date(Date.now() + policy.lockoutDurationMins * 60 * 1000)
              : undefined,
          },
        })

        if (shouldLock) {
          // Log a security event for account lockout
          await prisma.secSecurityEvent.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              eventType: 'account_locked',
              severity: 'high',
              title: 'Account Locked — Too Many Failed Login Attempts',
              description: `Account locked after ${newFailedCount} failed attempts from IP ${ip}`,
              ipAddress: ip,
              metadata: { email: user.email, failedAttempts: newFailedCount },
            },
          })
        }
      }

      await recordLoginAttempt({
        tenantId: tenant.id,
        userId: user?.id,
        email: body.email,
        ipAddress: ip,
        userAgent: request.headers['user-agent'],
        success: false,
        failReason: user ? 'wrong_password' : 'user_not_found',
      })

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

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.coreUser.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    }

    // MFA check — return temp token if MFA is required
    if (user.mfaEnabled && user.mfaSecret) {
      await recordLoginAttempt({
        tenantId: tenant.id,
        userId: user.id,
        email: body.email,
        ipAddress: ip,
        userAgent: request.headers['user-agent'],
        success: true,
        failReason: 'mfa_required',
      })

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

    const roles = user.userRoles.map((ur) => ur.role.slug)
    const { session, accessToken, refreshToken } = await createSession(
      tenant.id,
      user.id,
      roles,
      user.email,
      ip,
      request.headers['user-agent'],
    )

    // Update last login
    await prisma.coreUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    })

    // Record success
    await recordLoginAttempt({
      tenantId: tenant.id,
      userId: user.id,
      email: body.email,
      ipAddress: ip,
      userAgent: request.headers['user-agent'],
      success: true,
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        sessionId: session.id,
        action: EventTypes.AUTH_USER_LOGIN,
        module: 'auth',
        entityType: 'core_users',
        entityId: user.id,
        ipAddress: ip,
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

  // POST /v1/auth/mfa/login — complete login after MFA challenge
  app.post('/mfa/login', async (request, reply) => {
    const body = MfaLoginSchema.parse(request.body)

    let payload: { sub: string; tid: string; sid: string; roles: string[]; email: string }
    try {
      payload = verifyAccessToken(body.tempToken) as typeof payload
    } catch {
      throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired temp token', 401)
    }

    if (payload.sid !== 'temp') {
      throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid temp token', 401)
    }

    const user = await prisma.coreUser.findFirst({
      where: { id: payload.sub, tenantId: payload.tid, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    })

    if (!user?.mfaSecret) {
      throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)
    }

    const isValidCode = verifyMfaCode(user.mfaSecret, body.code)
    if (!isValidCode) {
      throw new RenoError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid MFA code', 401)
    }

    const roles = user.userRoles.map((ur) => ur.role.slug)
    const ip = request.ip ?? '0.0.0.0'
    const { session, accessToken, refreshToken } = await createSession(
      payload.tid,
      user.id,
      roles,
      user.email,
      ip,
      request.headers['user-agent'],
    )

    await prisma.coreUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0, lockedUntil: null },
    })

    await recordLoginAttempt({
      tenantId: payload.tid,
      userId: user.id,
      email: user.email,
      ipAddress: ip,
      userAgent: request.headers['user-agent'],
      success: true,
    })

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
        firstName: null,
        lastName: null,
        roles,
        tenantId: payload.tid,
      },
    }))
  })

  // GET /v1/auth/me
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = await prisma.coreUser.findFirst({
      where: { id: request.userId, tenantId: request.tenantId, deletedAt: null },
      include: { profile: true, userRoles: { include: { role: true } } },
    })

    if (!user) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)

    return reply.send(buildSuccessResponse({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      displayName: user.profile?.displayName,
      avatarUrl: user.profile?.avatarUrl,
      roles: user.userRoles.map((ur) => ur.role.slug),
      status: user.status,
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
      where: { id, tenantId: request.tenantId, userId: request.userId },
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

    await prisma.coreUser.update({
      where: { id: user.id },
      data: { mfaSecret: secret, mfaBackupCodes: JSON.stringify(backupCodes) },
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

    // Check password history
    const policy = await getSecurityPolicy(request.tenantId)
    if (policy.passwordHistoryCount > 0) {
      const history = await prisma.corePasswordHistory.findMany({
        where: { userId: user.id, tenantId: request.tenantId },
        orderBy: { createdAt: 'desc' },
        take: policy.passwordHistoryCount,
      })

      for (const h of history) {
        const reused = await verifyPassword(body.newPassword, h.passwordHash)
        if (reused) {
          throw new RenoError(
            ErrorCode.BUSINESS_RULE_VIOLATION,
            `Cannot reuse any of your last ${policy.passwordHistoryCount} passwords`,
            400,
          )
        }
      }
    }

    const newHash = await hashPassword(body.newPassword)

    // Store old password in history before updating
    await prisma.corePasswordHistory.create({
      data: { tenantId: request.tenantId, userId: user.id, passwordHash: user.passwordHash },
    })

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
