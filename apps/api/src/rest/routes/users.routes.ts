import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@reno/database'
import { hashPassword } from '@reno/auth'
import { RenoError, ErrorCode, buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'
import { eventBus, EventTypes } from '@reno/events'

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  locale: z.string().optional().default('en'),
})

const UpdateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
})

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /v1/users
  app.get('/', async (request, reply) => {
    const query = request.query as {
      search?: string
      status?: string
      departmentId?: string
      limit?: string
      cursor?: string
    }

    const limit = Math.min(parseInt(query.limit ?? '50', 10), 200)

    const users = await prisma.coreUser.findMany({
      where: {
        tenantId: request.tenantId,
        deletedAt: null,
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' } },
            { profile: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { profile: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
        memberships: {
          where: { isPrimary: true, deletedAt: null },
          include: { department: true, branch: true },
        },
      },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    })

    const hasMore = users.length > limit
    const nodes = hasMore ? users.slice(0, -1) : users

    return reply.send(buildSuccessResponse(
      nodes.map(formatUser),
      {
        pagination: {
          total: nodes.length,
          page: 1,
          perPage: limit,
          totalPages: 1,
          nextCursor: hasMore ? nodes[nodes.length - 1]?.id : null,
        },
      },
    ))
  })

  // GET /v1/users/me
  app.get('/me', async (request, reply) => {
    const user = await prisma.coreUser.findFirst({
      where: { id: request.userId, tenantId: request.tenantId, deletedAt: null },
      include: {
        profile: true,
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        memberships: { where: { deletedAt: null }, include: { company: true, branch: true, department: true, team: true } },
      },
    })

    if (!user) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)

    return reply.send(buildSuccessResponse(formatUser(user)))
  })

  // GET /v1/users/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await prisma.coreUser.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
        memberships: { where: { deletedAt: null }, include: { company: true, branch: true, department: true, team: true } },
      },
    })

    if (!user) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)

    return reply.send(buildSuccessResponse(formatUser(user)))
  })

  // POST /v1/users
  app.post('/', async (request, reply) => {
    const body = CreateUserSchema.parse(request.body)

    // Check email uniqueness
    const existing = await prisma.coreUser.findFirst({
      where: { tenantId: request.tenantId, email: body.email.toLowerCase(), deletedAt: null },
    })

    if (existing) {
      throw new RenoError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'A user with this email already exists', 409)
    }

    const passwordHash = await hashPassword(body.password)

    const user = await prisma.coreUser.create({
      data: {
        tenantId: request.tenantId,
        email: body.email.toLowerCase(),
        passwordHash,
        emailVerified: false,
        status: 'active',
        locale: body.locale,
        createdBy: request.userId,
      },
    })

    await prisma.coreUserProfile.create({
      data: {
        tenantId: request.tenantId,
        userId: user.id,
        firstName: body.firstName,
        lastName: body.lastName,
        createdBy: request.userId,
      },
    })

    await prisma.coreUserMembership.create({
      data: {
        tenantId: request.tenantId,
        userId: user.id,
        companyId: body.companyId,
        branchId: body.branchId,
        departmentId: body.departmentId,
        teamId: body.teamId,
        jobTitle: body.jobTitle,
        isPrimary: true,
        createdBy: request.userId,
      },
    })

    if (body.roleIds?.length) {
      await prisma.coreUserRole.createMany({
        data: body.roleIds.map((roleId) => ({
          tenantId: request.tenantId,
          userId: user.id,
          roleId,
          createdBy: request.userId,
        })),
      })
    }

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: EventTypes.USER_CREATED,
        module: 'core',
        entityType: 'core_users',
        entityId: user.id,
        newValues: { email: user.email, firstName: body.firstName, lastName: body.lastName },
        ipAddress: request.ip,
      },
    })

    eventBus.publish({
      type: EventTypes.USER_CREATED,
      tenantId: request.tenantId,
      actorId: request.userId,
      version: '1.0',
      payload: { userId: user.id, email: user.email },
      metadata: { sourceModule: 'core', correlationId: user.id },
    })

    return reply.status(201).send(buildSuccessResponse({ id: user.id, email: user.email }))
  })

  // PUT /v1/users/:id
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = UpdateUserSchema.parse(request.body)

    const user = await prisma.coreUser.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
      include: { profile: true },
    })

    if (!user) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)

    const oldValues = {
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      locale: user.locale,
    }

    if (user.profile) {
      await prisma.coreUserProfile.update({
        where: { userId: id },
        data: {
          ...(body.firstName && { firstName: body.firstName }),
          ...(body.lastName && { lastName: body.lastName }),
          ...(body.displayName !== undefined && { displayName: body.displayName }),
          updatedBy: request.userId,
        },
      })
    }

    await prisma.coreUser.update({
      where: { id },
      data: {
        ...(body.phone && { phone: body.phone }),
        ...(body.locale && { locale: body.locale }),
        ...(body.timezone && { timezone: body.timezone }),
        updatedBy: request.userId,
      },
    })

    if (body.departmentId || body.teamId || body.jobTitle) {
      await prisma.coreUserMembership.updateMany({
        where: { userId: id, tenantId: request.tenantId, isPrimary: true, deletedAt: null },
        data: {
          ...(body.departmentId && { departmentId: body.departmentId }),
          ...(body.teamId && { teamId: body.teamId }),
          ...(body.jobTitle && { jobTitle: body.jobTitle }),
          updatedBy: request.userId,
        },
      })
    }

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: 'core.user.updated',
        module: 'core',
        entityType: 'core_users',
        entityId: id,
        oldValues,
        newValues: body,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // PATCH /v1/users/:id/status
  app.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Invalid status value', 400)
    }

    const user = await prisma.coreUser.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
    })

    if (!user) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'User not found', 404)

    await prisma.coreUser.update({
      where: { id },
      data: { status, updatedBy: request.userId },
    })

    if (status === 'suspended') {
      await prisma.coreSession.updateMany({
        where: { userId: id, tenantId: request.tenantId },
        data: { revokedAt: new Date(), isActive: false },
      })
    }

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: status === 'suspended' ? EventTypes.USER_SUSPENDED : 'core.user.activated',
        module: 'core',
        entityType: 'core_users',
        entityId: id,
        oldValues: { status: user.status },
        newValues: { status },
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ status }))
  })

  // DELETE /v1/users/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    if (id === request.userId) {
      throw new RenoError(ErrorCode.BUSINESS_RULE_VIOLATION, 'You cannot delete your own account', 400)
    }

    await prisma.coreUser.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: request.userId },
    })

    // Revoke all sessions
    await prisma.coreSession.updateMany({
      where: { userId: id },
      data: { revokedAt: new Date(), isActive: false },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: 'core.user.deleted',
        module: 'core',
        entityType: 'core_users',
        entityId: id,
        ipAddress: request.ip,
      },
    })

    return reply.status(204).send()
  })

  // POST /v1/users/:id/roles
  app.post('/:id/roles', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { roleId } = request.body as { roleId: string }

    await prisma.coreUserRole.create({
      data: {
        tenantId: request.tenantId,
        userId: id,
        roleId,
        createdBy: request.userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: EventTypes.USER_ROLE_ASSIGNED,
        module: 'core',
        entityType: 'core_user_roles',
        entityId: id,
        newValues: { roleId },
        ipAddress: request.ip,
      },
    })

    return reply.status(201).send(buildSuccessResponse({ assigned: true }))
  })

  // DELETE /v1/users/:id/roles/:roleId
  app.delete('/:id/roles/:roleId', async (request, reply) => {
    const { id, roleId } = request.params as { id: string; roleId: string }

    await prisma.coreUserRole.updateMany({
      where: { userId: id, roleId, tenantId: request.tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: request.userId },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: EventTypes.USER_ROLE_REVOKED,
        module: 'core',
        entityType: 'core_user_roles',
        entityId: id,
        oldValues: { roleId },
        ipAddress: request.ip,
      },
    })

    return reply.status(204).send()
  })
}

function formatUser(user: Parameters<typeof formatUser>[0]) {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    locale: user.locale,
    timezone: user.timezone,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isActive: user.isActive,
    profile: user.profile ? {
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
    } : null,
    roles: 'userRoles' in user
      ? (user.userRoles as Array<{ role: { id: string; name: string; slug: string; color: string | null } }>).map((ur) => ur.role)
      : [],
    memberships: 'memberships' in user ? user.memberships : [],
  }
}
