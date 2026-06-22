import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'

export async function translationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // -------------------------------------------------------------------------
  // Entity content translations (user-generated content)
  // -------------------------------------------------------------------------

  // GET /translations/entity?entityType=&entityId=&locale=
  app.get('/entity', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null }
    if (q.entityType) where.entityType = q.entityType
    if (q.entityId) where.entityId = q.entityId
    if (q.locale) where.locale = q.locale
    if (q.isApproved !== undefined) where.isApproved = q.isApproved === 'true'

    const translations = await prisma.sysTranslation.findMany({ where, orderBy: { locale: 'asc' } })
    return reply.send(buildSuccessResponse(translations))
  })

  // PUT /translations/entity — Upsert a content translation
  app.put('/entity', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const translation = await prisma.sysTranslation.upsert({
      where: {
        tenantId_entityType_entityId_field_locale: {
          tenantId,
          entityType: body.entityType,
          entityId: body.entityId,
          field: body.field,
          locale: body.locale,
        },
      },
      update: {
        value: body.value,
        source: body.source ?? 'manual',
        isApproved: body.isApproved ?? true,
        updatedBy: userId,
      },
      create: {
        tenantId,
        entityType: body.entityType,
        entityId: body.entityId,
        field: body.field,
        locale: body.locale,
        value: body.value,
        source: body.source ?? 'manual',
        isApproved: body.isApproved ?? true,
        createdBy: userId,
      },
    })

    return reply.send(buildSuccessResponse(translation))
  })

  // PATCH /translations/entity/:id/approve — Approve an AI translation
  app.patch('/entity/:id/approve', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const translation = await prisma.sysTranslation.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
    if (!translation) return reply.status(404).send({ success: false, error: { message: 'Not found' } })

    const updated = await prisma.sysTranslation.update({
      where: { id },
      data: { isApproved: true, approvedBy: userId, approvedAt: new Date() },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /translations/entity/:id — Soft delete
  app.delete('/entity/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    await prisma.sysTranslation.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // -------------------------------------------------------------------------
  // UI / Module translations (static interface strings)
  // -------------------------------------------------------------------------

  // GET /translations/ui?namespace=&locale=
  app.get('/ui', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = {
      deletedAt: null,
      locale: q.locale ?? 'en',
      ...(q.namespace && { namespace: { startsWith: q.namespace } }),
    }

    // Fetch global (system) translations first, then overlay tenant overrides
    const [global, tenantOverrides] = await Promise.all([
      prisma.sysUiTranslation.findMany({ where: { ...where, tenantId: null } }),
      prisma.sysUiTranslation.findMany({ where: { ...where, tenantId } }),
    ])

    // Merge: tenant overrides win
    const merged = new Map(global.map(t => [`${t.namespace}:${t.key}`, t]))
    for (const o of tenantOverrides) merged.set(`${o.namespace}:${o.key}`, o)

    return reply.send(buildSuccessResponse(Array.from(merged.values())))
  })

  // PUT /translations/ui — Upsert a UI translation (tenant override or system)
  app.put('/ui', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const effectiveTenantId = body.global ? null : tenantId

    // Prisma can't upsert on nullable composite unique — use findFirst + create/update
    const existing = await prisma.sysUiTranslation.findFirst({
      where: { tenantId: effectiveTenantId, namespace: body.namespace, key: body.key, locale: body.locale },
    })

    const translation = existing
      ? await prisma.sysUiTranslation.update({
          where: { id: existing.id },
          data: { value: body.value, source: body.source ?? 'manual', isApproved: body.isApproved ?? true, updatedBy: userId },
        })
      : await prisma.sysUiTranslation.create({
          data: {
            tenantId: effectiveTenantId,
            namespace: body.namespace,
            key: body.key,
            locale: body.locale,
            value: body.value,
            source: body.source ?? 'manual',
            isApproved: body.isApproved ?? true,
            createdBy: userId,
          },
        })

    return reply.send(buildSuccessResponse(translation))
  })

  // GET /translations/ui/pending — AI translations pending approval
  app.get('/ui/pending', async (request, reply) => {
    const { tenantId } = request as any

    const pending = await prisma.sysUiTranslation.findMany({
      where: { tenantId, isApproved: false, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(buildSuccessResponse(pending))
  })

  // PATCH /translations/ui/:id/approve
  app.patch('/ui/:id/approve', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const t = await prisma.sysUiTranslation.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!t) return reply.status(404).send({ success: false, error: { message: 'Not found' } })

    const updated = await prisma.sysUiTranslation.update({
      where: { id },
      data: { isApproved: true, approvedBy: userId, approvedAt: new Date() },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // GET /translations/locales — List all locales in use for this tenant
  app.get('/locales', async (request, reply) => {
    const { tenantId } = request as any

    const [entityLocales, uiLocales] = await Promise.all([
      prisma.sysTranslation.findMany({
        where: { tenantId, deletedAt: null },
        select: { locale: true },
        distinct: ['locale'],
      }),
      prisma.sysUiTranslation.findMany({
        where: { deletedAt: null },
        select: { locale: true },
        distinct: ['locale'],
      }),
    ])

    const all = [...new Set([...entityLocales.map(l => l.locale), ...uiLocales.map(l => l.locale)])]

    return reply.send(buildSuccessResponse(all.sort()))
  })
}
