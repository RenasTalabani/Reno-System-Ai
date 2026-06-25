import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@reno/database'
import { hashPassword } from '@reno/auth'
import { RenoError, ErrorCode, buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permissions.js'
import { logger } from '@reno/logger'

const PolicyUpdateSchema = z.object({
  passwordMinLength: z.number().int().min(8).max(64).optional(),
  passwordRequireUpper: z.boolean().optional(),
  passwordRequireLower: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSymbol: z.boolean().optional(),
  passwordExpiryDays: z.number().int().min(0).max(365).optional(),
  passwordHistoryCount: z.number().int().min(0).max(24).optional(),
  maxFailedAttempts: z.number().int().min(3).max(20).optional(),
  lockoutDurationMins: z.number().int().min(5).max(1440).optional(),
  sessionTimeoutMins: z.number().int().min(15).max(10080).optional(),
  maxConcurrentSessions: z.number().int().min(1).max(50).optional(),
  mfaRequired: z.boolean().optional(),
  mfaRequiredForAdmins: z.boolean().optional(),
  ipAllowlistEnabled: z.boolean().optional(),
})

const ApiKeyCreateSchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
})

const IpRuleCreateSchema = z.object({
  type: z.enum(['allow', 'block']),
  cidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, 'Must be valid CIDR notation'),
  label: z.string().max(100).optional(),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

const EventResolveSchema = z.object({
  note: z.string().optional(),
})

function generateApiKey(): { key: string; prefix: string; hash: Promise<string> } {
  const key = `rk_live_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
  const prefix = key.slice(0, 20)
  const hash = crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(key))
    .then((buf) => Buffer.from(buf).toString('hex'))
  return { key, prefix, hash }
}

// Anomaly detection thresholds
const ANOMALY_THRESHOLDS = {
  failedAttemptsPerHour: 5,
  uniqueIpsPerDay: 3,
  offHoursStart: 22, // 10 PM
  offHoursEnd: 6,   // 6 AM
  riskWeights: {
    multipleFailedAttempts: 30,
    multipleIps: 20,
    offHoursAccess: 15,
    accountLocked: 40,
    rapidAttempts: 25,
  },
}

async function computeAnomalies(tenantId: string) {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000)

  const attempts = await prisma.secLoginAttempt.findMany({
    where: { tenantId, createdAt: { gte: last24h } },
    orderBy: { createdAt: 'desc' },
  })

  // Group by user
  const byUser = new Map<string, typeof attempts>()
  for (const a of attempts) {
    if (!a.userId) continue
    const list = byUser.get(a.userId) ?? []
    list.push(a)
    byUser.set(a.userId, list)
  }

  const anomalies: Array<{
    userId: string
    email: string
    riskScore: number
    flags: string[]
    details: Record<string, unknown>
  }> = []

  for (const [userId, userAttempts] of byUser) {
    const flags: string[] = []
    let riskScore = 0
    const details: Record<string, unknown> = {}

    const failed = userAttempts.filter((a) => !a.success && a.failReason !== 'mfa_required')
    const uniqueIps = new Set(userAttempts.map((a) => a.ipAddress).filter(Boolean))
    const recentFailed = failed.filter((a) => a.createdAt >= lastHour)
    const email = userAttempts[0]?.email ?? ''

    // Flag: too many failed attempts in 24h
    if (failed.length >= ANOMALY_THRESHOLDS.failedAttemptsPerHour) {
      flags.push('multiple_failed_attempts')
      riskScore += ANOMALY_THRESHOLDS.riskWeights.multipleFailedAttempts
      details['failedAttempts24h'] = failed.length
    }

    // Flag: rapid repeated attempts in last hour
    if (recentFailed.length >= 3) {
      flags.push('rapid_failed_attempts')
      riskScore += ANOMALY_THRESHOLDS.riskWeights.rapidAttempts
      details['failedAttemptsLastHour'] = recentFailed.length
    }

    // Flag: multiple source IPs
    if (uniqueIps.size >= ANOMALY_THRESHOLDS.uniqueIpsPerDay) {
      flags.push('multiple_source_ips')
      riskScore += ANOMALY_THRESHOLDS.riskWeights.multipleIps
      details['uniqueIps'] = Array.from(uniqueIps)
    }

    // Flag: off-hours access (successful login outside normal hours)
    const successfulLogins = userAttempts.filter((a) => a.success && a.failReason == null)
    const offHoursLogins = successfulLogins.filter((a) => {
      const hour = a.createdAt.getHours()
      return hour >= ANOMALY_THRESHOLDS.offHoursStart || hour < ANOMALY_THRESHOLDS.offHoursEnd
    })
    if (offHoursLogins.length > 0) {
      flags.push('off_hours_access')
      riskScore += ANOMALY_THRESHOLDS.riskWeights.offHoursAccess
      details['offHoursLogins'] = offHoursLogins.length
    }

    // Flag: account currently locked
    const lockedUser = await prisma.coreUser.findFirst({
      where: { id: userId, tenantId, lockedUntil: { gt: now } },
    })
    if (lockedUser) {
      flags.push('account_locked')
      riskScore += ANOMALY_THRESHOLDS.riskWeights.accountLocked
      details['lockedUntil'] = lockedUser.lockedUntil
    }

    if (flags.length > 0) {
      anomalies.push({
        userId,
        email,
        riskScore: Math.min(riskScore, 100),
        flags,
        details,
      })
    }
  }

  // Sort by risk score descending
  anomalies.sort((a, b) => b.riskScore - a.riskScore)

  return anomalies
}

export async function securityRoutes(app: FastifyInstance) {
  // All security routes require authentication
  app.addHook('preHandler', requireAuth)

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      failedLoginsToday,
      successfulLoginsToday,
      activeSessions,
      lockedAccounts,
      openSecurityEvents,
      eventsBySeverity,
      apiKeyCount,
      ipRuleCount,
      recentHighSeverityEvents,
    ] = await Promise.all([
      prisma.secLoginAttempt.count({
        where: { tenantId, success: false, failReason: { not: 'mfa_required' }, createdAt: { gte: last24h } },
      }),
      prisma.secLoginAttempt.count({
        where: { tenantId, success: true, failReason: null, createdAt: { gte: last24h } },
      }),
      prisma.coreSession.count({
        where: { tenantId, isActive: true, revokedAt: null, deletedAt: null, expiresAt: { gt: now } },
      }),
      prisma.coreUser.count({
        where: { tenantId, lockedUntil: { gt: now }, deletedAt: null },
      }),
      prisma.secSecurityEvent.count({
        where: { tenantId, resolved: false },
      }),
      prisma.secSecurityEvent.groupBy({
        by: ['severity'],
        where: { tenantId, createdAt: { gte: last7d } },
        _count: { id: true },
      }),
      prisma.sysApiKey.count({
        where: { tenantId, isActive: true, deletedAt: null, revokedAt: null },
      }),
      prisma.secIpRule.count({
        where: { tenantId, isActive: true },
      }),
      prisma.secSecurityEvent.findMany({
        where: { tenantId, resolved: false, severity: { in: ['critical', 'high'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, eventType: true, severity: true, title: true, createdAt: true, ipAddress: true },
      }),
    ])

    const severityMap: Record<string, number> = {}
    for (const s of eventsBySeverity) {
      severityMap[s.severity] = s._count.id
    }

    return reply.send(buildSuccessResponse({
      overview: {
        failedLoginsToday,
        successfulLoginsToday,
        activeSessions,
        lockedAccounts,
        openSecurityEvents,
        apiKeyCount,
        ipRuleCount,
      },
      securityEvents: {
        critical: severityMap['critical'] ?? 0,
        high: severityMap['high'] ?? 0,
        medium: severityMap['medium'] ?? 0,
        low: severityMap['low'] ?? 0,
        info: severityMap['info'] ?? 0,
      },
      recentHighSeverityEvents,
      generatedAt: now.toISOString(),
    }))
  })

  // ─── Security Policy ──────────────────────────────────────────────────────────

  app.get('/policy', async (request, reply) => {
    const policy = await prisma.coreTenantSecurityPolicy.findUnique({
      where: { tenantId: request.tenantId },
    })

    // Return defaults if no policy exists yet
    if (!policy) {
      return reply.send(buildSuccessResponse({
        tenantId: request.tenantId,
        passwordMinLength: 12,
        passwordRequireUpper: true,
        passwordRequireLower: true,
        passwordRequireNumber: true,
        passwordRequireSymbol: true,
        passwordExpiryDays: 0,
        passwordHistoryCount: 5,
        maxFailedAttempts: 5,
        lockoutDurationMins: 15,
        sessionTimeoutMins: 480,
        maxConcurrentSessions: 10,
        mfaRequired: false,
        mfaRequiredForAdmins: false,
        ipAllowlistEnabled: false,
        isDefault: true,
      }))
    }

    return reply.send(buildSuccessResponse({ ...policy, isDefault: false }))
  })

  app.put('/policy', { preHandler: [requirePermission('security', 'policy', 'update')] }, async (request, reply) => {
    const body = PolicyUpdateSchema.parse(request.body)

    const policy = await prisma.coreTenantSecurityPolicy.upsert({
      where: { tenantId: request.tenantId },
      create: { tenantId: request.tenantId, ...body },
      update: body,
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: 'security.policy.updated',
        module: 'security',
        entityType: 'core_tenant_security_policies',
        entityId: policy.id,
        newValues: body as object,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse(policy))
  })

  // ─── API Keys ─────────────────────────────────────────────────────────────────

  app.get('/api-keys', async (request, reply) => {
    const keys = await prisma.sysApiKey.findMany({
      where: { tenantId: request.tenantId, deletedAt: null, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        createdBy: true,
      },
    })

    return reply.send(buildSuccessResponse(keys))
  })

  app.post('/api-keys', { preHandler: [requirePermission('security', 'api-keys', 'create')] }, async (request, reply) => {
    const body = ApiKeyCreateSchema.parse(request.body)
    const { key, prefix, hash: hashPromise } = generateApiKey()
    const keyHash = await hashPromise

    const apiKey = await prisma.sysApiKey.create({
      data: {
        tenantId: request.tenantId,
        name: body.name,
        keyHash,
        keyPrefix: prefix,
        scopes: body.scopes,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        createdBy: request.userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: 'security.api_key.created',
        module: 'security',
        entityType: 'sys_api_keys',
        entityId: apiKey.id,
        newValues: { name: body.name, scopes: body.scopes },
        ipAddress: request.ip,
      },
    })

    // Return the full key ONCE — it cannot be retrieved again
    return reply.status(201).send(buildSuccessResponse({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      key, // Full key — only returned at creation
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    }))
  })

  app.delete('/api-keys/:id', { preHandler: [requirePermission('security', 'api-keys', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const apiKey = await prisma.sysApiKey.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
    })

    if (!apiKey) {
      throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'API key not found', 404)
    }

    await prisma.sysApiKey.update({
      where: { id },
      data: { revokedAt: new Date(), isActive: false },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: 'security.api_key.revoked',
        module: 'security',
        entityType: 'sys_api_keys',
        entityId: id,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ revoked: true }))
  })

  // ─── IP Rules ─────────────────────────────────────────────────────────────────

  app.get('/ip-rules', async (request, reply) => {
    const rules = await prisma.secIpRule.findMany({
      where: { tenantId: request.tenantId },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(buildSuccessResponse(rules))
  })

  app.post('/ip-rules', { preHandler: [requirePermission('security', 'ip-rules', 'create')] }, async (request, reply) => {
    const body = IpRuleCreateSchema.parse(request.body)

    const rule = await prisma.secIpRule.create({
      data: {
        tenantId: request.tenantId,
        type: body.type,
        cidr: body.cidr,
        label: body.label,
        reason: body.reason,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: `security.ip_rule.${body.type}_added`,
        module: 'security',
        entityType: 'sec_ip_rules',
        entityId: rule.id,
        newValues: body as object,
        ipAddress: request.ip,
      },
    })

    return reply.status(201).send(buildSuccessResponse(rule))
  })

  app.delete('/ip-rules/:id', { preHandler: [requirePermission('security', 'ip-rules', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const rule = await prisma.secIpRule.findFirst({
      where: { id, tenantId: request.tenantId },
    })

    if (!rule) {
      throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'IP rule not found', 404)
    }

    await prisma.secIpRule.update({
      where: { id },
      data: { isActive: false },
    })

    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // ─── Security Events ──────────────────────────────────────────────────────────

  app.get('/events', async (request, reply) => {
    const query = request.query as {
      severity?: string
      resolved?: string
      page?: string
      limit?: string
    }
    const page = Math.max(1, parseInt(query.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)))
    const offset = (page - 1) * limit

    const where = {
      tenantId: request.tenantId,
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.resolved !== undefined ? { resolved: query.resolved === 'true' } : {}),
    }

    const [events, total] = await Promise.all([
      prisma.secSecurityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.secSecurityEvent.count({ where }),
    ])

    return reply.send(buildSuccessResponse({
      items: events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }))
  })

  app.post('/events/:id/resolve', { preHandler: [requirePermission('security', 'events', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = EventResolveSchema.parse(request.body ?? {})

    const event = await prisma.secSecurityEvent.findFirst({
      where: { id, tenantId: request.tenantId },
    })

    if (!event) {
      throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'Security event not found', 404)
    }

    const updated = await prisma.secSecurityEvent.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: request.userId,
        metadata: {
          ...(event.metadata as object),
          resolvedNote: body.note,
        },
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // ─── Login Attempts ───────────────────────────────────────────────────────────

  app.get('/login-attempts', async (request, reply) => {
    const query = request.query as { page?: string; limit?: string; success?: string }
    const page = Math.max(1, parseInt(query.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)))
    const offset = (page - 1) * limit

    const where = {
      tenantId: request.tenantId,
      ...(query.success !== undefined ? { success: query.success === 'true' } : {}),
    }

    const [attempts, total] = await Promise.all([
      prisma.secLoginAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          userId: true,
          email: true,
          ipAddress: true,
          success: true,
          failReason: true,
          createdAt: true,
        },
      }),
      prisma.secLoginAttempt.count({ where }),
    ])

    return reply.send(buildSuccessResponse({
      items: attempts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }))
  })

  // ─── Locked Accounts ──────────────────────────────────────────────────────────

  app.get('/locked-accounts', async (request, reply) => {
    const now = new Date()

    const locked = await prisma.coreUser.findMany({
      where: { tenantId: request.tenantId, lockedUntil: { gt: now }, deletedAt: null },
      select: {
        id: true,
        email: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    })

    return reply.send(buildSuccessResponse(locked))
  })

  app.post('/locked-accounts/:userId/unlock', { preHandler: [requirePermission('security', 'accounts', 'update')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string }

    const user = await prisma.coreUser.findFirst({
      where: { id: userId, tenantId: request.tenantId, deletedAt: null },
    })

    if (!user) {
      throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)
    }

    await prisma.coreUser.update({
      where: { id: userId },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    })

    await prisma.secSecurityEvent.create({
      data: {
        tenantId: request.tenantId,
        userId,
        eventType: 'account_unlocked',
        severity: 'info',
        title: 'Account Unlocked by Admin',
        description: `Account ${user.email} unlocked by admin ${request.userId}`,
        metadata: { unlockedBy: request.userId },
      },
    })

    return reply.send(buildSuccessResponse({ unlocked: true }))
  })

  // ─── AI Security Intelligence ─────────────────────────────────────────────────

  app.get('/ai', async (request, reply) => {
    const { tenantId } = request
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [anomalies, recentAttempts, dailyStats] = await Promise.all([
      computeAnomalies(tenantId),
      prisma.secLoginAttempt.findMany({
        where: { tenantId, createdAt: { gte: last24h } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // Group attempts by hour for the last 24h
      prisma.secLoginAttempt.groupBy({
        by: ['success'],
        where: { tenantId, createdAt: { gte: last24h } },
        _count: { id: true },
      }),
    ])

    // Compute overall tenant risk score
    const maxAnomalyScore = anomalies[0]?.riskScore ?? 0
    const openCriticalEvents = await prisma.secSecurityEvent.count({
      where: { tenantId, resolved: false, severity: { in: ['critical', 'high'] } },
    })
    const lockedAccounts = await prisma.coreUser.count({
      where: { tenantId, lockedUntil: { gt: now }, deletedAt: null },
    })

    let tenantRiskScore = 0
    if (maxAnomalyScore > 0) tenantRiskScore += Math.min(40, maxAnomalyScore * 0.4)
    if (openCriticalEvents > 0) tenantRiskScore += Math.min(40, openCriticalEvents * 10)
    if (lockedAccounts > 0) tenantRiskScore += Math.min(20, lockedAccounts * 5)

    const failedCount = dailyStats.find((d) => !d.success)?._count.id ?? 0
    const successCount = dailyStats.find((d) => d.success)?._count.id ?? 0

    // AI recommendations based on findings
    const recommendations: string[] = []
    if (anomalies.length > 0) {
      recommendations.push(`${anomalies.length} user(s) show anomalous login behavior — review flagged accounts`)
    }
    if (openCriticalEvents > 0) {
      recommendations.push(`${openCriticalEvents} unresolved high/critical security events require attention`)
    }
    if (lockedAccounts > 0) {
      recommendations.push(`${lockedAccounts} account(s) are currently locked due to failed attempts`)
    }
    if (failedCount > successCount * 0.2) {
      recommendations.push(`Failed login rate (${failedCount}) is elevated — consider enabling MFA`)
    }

    return reply.send(buildSuccessResponse({
      tenantRiskScore: Math.min(Math.round(tenantRiskScore), 100),
      riskLevel: tenantRiskScore < 20 ? 'low' : tenantRiskScore < 50 ? 'medium' : tenantRiskScore < 75 ? 'high' : 'critical',
      anomalousUsers: anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        highRiskUsers: anomalies.filter((a) => a.riskScore >= 50).length,
        failedLoginsToday: failedCount,
        successfulLoginsToday: successCount,
        openCriticalEvents,
        lockedAccounts,
      },
      recommendations,
      analyzedAt: now.toISOString(),
      analysisWindow: '24h',
    }))
  })
}
