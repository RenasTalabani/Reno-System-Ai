import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'
import { EventTypes } from '@reno/events'

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request, reply) => {
    const query = request.query as { module?: string }
    const settings = await prisma.sysSetting.findMany({
      where: {
        tenantId: request.tenantId,
        deletedAt: null,
        ...(query.module && { module: query.module }),
      },
    })
    return reply.send(buildSuccessResponse(settings))
  })

  app.put('/:module/:key', async (request, reply) => {
    const { module, key } = request.params as { module: string; key: string }
    const { value } = request.body as { value: unknown }

    const setting = await prisma.sysSetting.upsert({
      where: { tenantId_companyId_module_key: { tenantId: request.tenantId, companyId: null as unknown as string, module, key } },
      update: { value: value as object, updatedBy: request.userId },
      create: { tenantId: request.tenantId, module, key, value: value as object, createdBy: request.userId },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: EventTypes.SETTINGS_UPDATED,
        module: 'core',
        entityType: 'sys_settings',
        entityId: setting.id,
        newValues: { module, key, value },
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse(setting))
  })

  app.get('/branding', async (request, reply) => {
    const branding = await prisma.sysBranding.findFirst({
      where: { tenantId: request.tenantId, deletedAt: null },
    })
    return reply.send(buildSuccessResponse(branding))
  })

  app.put('/branding', async (request, reply) => {
    const body = request.body as Record<string, unknown>

    const branding = await prisma.sysBranding.upsert({
      where: { tenantId: request.tenantId },
      update: { ...body, updatedBy: request.userId },
      create: { tenantId: request.tenantId, ...body, createdBy: request.userId },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        action: EventTypes.BRANDING_UPDATED,
        module: 'core',
        entityType: 'sys_branding',
        entityId: branding.id,
        newValues: body,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse(branding))
  })

  app.get('/feature-flags', async (request, reply) => {
    const flags = await prisma.sysFeatureFlag.findMany({
      where: { tenantId: request.tenantId, deletedAt: null },
    })
    return reply.send(buildSuccessResponse(flags))
  })

  app.patch('/feature-flags/:module/:feature', async (request, reply) => {
    const { module, feature } = request.params as { module: string; feature: string }
    const { enabled } = request.body as { enabled: boolean }

    const flag = await prisma.sysFeatureFlag.upsert({
      where: { tenantId_module_feature: { tenantId: request.tenantId, module, feature } },
      update: { enabled, updatedBy: request.userId },
      create: { tenantId: request.tenantId, module, feature, enabled, createdBy: request.userId },
    })

    return reply.send(buildSuccessResponse(flag))
  })
}
