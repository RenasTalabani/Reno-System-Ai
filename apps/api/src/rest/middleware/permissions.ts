import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@reno/database'
import { RenoError, ErrorCode } from '@reno/core'

export function requirePermission(module: string, resource: string, action: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.userId || !request.tenantId) {
      throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required', 401)
    }

    // Admin role bypasses all permission checks
    if (request.roles?.includes('admin') || request.roles?.includes('super_admin')) {
      return
    }

    // Check user-specific permission override first (highest priority)
    const override = await prisma.coreUserPermissionOverride.findFirst({
      where: {
        userId: request.userId,
        tenantId: request.tenantId,
        isActive: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        permission: { module, resource, action },
      },
      include: { permission: true },
    })

    if (override) {
      if (!override.granted) {
        throw new RenoError(ErrorCode.FORBIDDEN, `Permission denied: ${module}:${resource}:${action}`, 403)
      }
      return
    }

    // Check role-based permissions
    const userRoles = await prisma.coreUserRole.findMany({
      where: {
        userId: request.userId,
        tenantId: request.tenantId,
        isActive: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                isActive: true,
                deletedAt: null,
                tenantId: request.tenantId,
              },
              include: { permission: true },
            },
          },
        },
      },
    })

    const hasPermission = userRoles.some((ur) =>
      ur.role.rolePermissions.some(
        (rp) =>
          rp.granted &&
          rp.permission.module === module &&
          rp.permission.resource === resource &&
          rp.permission.action === action,
      ),
    )

    if (!hasPermission) {
      throw new RenoError(ErrorCode.FORBIDDEN, `Permission denied: ${module}:${resource}:${action}`, 403)
    }
  }
}
