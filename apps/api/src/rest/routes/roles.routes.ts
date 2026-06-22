import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@reno/database'
import { RenoError, ErrorCode, buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'

const CreateRoleSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9_]+$/),
  description: z.string().optional(),
  color: z.string().optional(),
  scope: z.enum(['own', 'team', 'department', 'branch', 'company', 'tenant']).default('company'),
})

export async function roleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /v1/roles
  app.get('/', async (request, reply) => {
    const roles = await prisma.coreRole.findMany({
      where: { tenantId: request.tenantId, deletedAt: null },
      include: {
        rolePermissions: {
          where: { deletedAt: null },
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    return reply.send(buildSuccessResponse(roles))
  })

  // GET /v1/roles/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const role = await prisma.coreRole.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
      include: {
        rolePermissions: {
          where: { deletedAt: null },
          include: { permission: true },
        },
      },
    })
    if (!role) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404)
    return reply.send(buildSuccessResponse(role))
  })

  // POST /v1/roles
  app.post('/', async (request, reply) => {
    const body = CreateRoleSchema.parse(request.body)

    const existing = await prisma.coreRole.findFirst({
      where: { tenantId: request.tenantId, slug: body.slug, deletedAt: null },
    })
    if (existing) {
      throw new RenoError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'A role with this slug already exists', 409)
    }

    const role = await prisma.coreRole.create({
      data: { tenantId: request.tenantId, ...body, isSystem: false, createdBy: request.userId },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: 'core.role.created',
        module: 'core',
        entityType: 'core_roles',
        entityId: role.id,
        newValues: body,
        ipAddress: request.ip,
      },
    })

    return reply.status(201).send(buildSuccessResponse(role))
  })

  // PUT /v1/roles/:id
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = CreateRoleSchema.partial().parse(request.body)

    const role = await prisma.coreRole.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
    })
    if (!role) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404)
    if (role.isSystem) throw new RenoError(ErrorCode.BUSINESS_RULE_VIOLATION, 'System roles cannot be modified', 400)

    const updated = await prisma.coreRole.update({
      where: { id },
      data: { ...body, updatedBy: request.userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /v1/roles/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const role = await prisma.coreRole.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
    })
    if (!role) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404)
    if (role.isSystem) throw new RenoError(ErrorCode.BUSINESS_RULE_VIOLATION, 'System roles cannot be deleted', 400)

    await prisma.coreRole.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: request.userId },
    })

    return reply.status(204).send()
  })

  // PUT /v1/roles/:id/permissions
  app.put('/:id/permissions', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { permissionIds } = request.body as { permissionIds: string[] }

    // Remove existing permissions
    await prisma.coreRolePermission.updateMany({
      where: { roleId: id, tenantId: request.tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: request.userId },
    })

    // Add new permissions
    if (permissionIds.length > 0) {
      await prisma.coreRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          tenantId: request.tenantId,
          roleId: id,
          permissionId,
          granted: true,
          createdBy: request.userId,
        })),
        skipDuplicates: true,
      })
    }

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: 'core.role.permissions_updated',
        module: 'core',
        entityType: 'core_role_permissions',
        entityId: id,
        newValues: { permissionIds },
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // GET /v1/permissions — all system permissions
  app.get('/permissions/all', async (_request, reply) => {
    const permissions = await prisma.corePermission.findMany({
      orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    })
    return reply.send(buildSuccessResponse(permissions))
  })
}
