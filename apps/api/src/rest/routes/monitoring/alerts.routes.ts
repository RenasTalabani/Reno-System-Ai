import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

const CreateAlertSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  category: z.string().min(1),
  condition: z.record(z.unknown()),
})

const ResolveIncidentSchema = z.object({
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
})

export async function alertRoutes(app: FastifyInstance) {
  // GET /v1/monitoring/alerts — list alert rules
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const alerts = await prisma.obsAlert.findMany({
      where: { OR: [{ tenantId: request.tenantId }, { tenantId: null }], deletedAt: null },
      orderBy: [{ severity: 'desc' }, { firedAt: 'desc' }],
    })
    return reply.send(buildSuccessResponse(alerts))
  })

  // POST /v1/monitoring/alerts — create alert rule
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = CreateAlertSchema.parse(request.body)
    const alert = await prisma.obsAlert.create({
      data: {
        tenantId: request.tenantId,
        name: body.name,
        description: body.description,
        severity: body.severity,
        category: body.category,
        condition: body.condition as object,
      },
    })
    return reply.status(201).send(buildSuccessResponse(alert))
  })

  // DELETE /v1/monitoring/alerts/:id
  app.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.obsAlert.updateMany({
      where: { id, tenantId: request.tenantId },
      data: { deletedAt: new Date() },
    })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // GET /v1/monitoring/alerts/incidents — list all incidents
  app.get('/incidents', { preHandler: [requireAuth] }, async (request, reply) => {
    const { status, severity, limit = '20', offset = '0' } = request.query as Record<string, string>

    const incidents = await prisma.obsIncident.findMany({
      where: {
        OR: [{ tenantId: request.tenantId }, { tenantId: null }],
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
      },
      orderBy: { detectedAt: 'desc' },
      take: Math.min(parseInt(limit), 100),
      skip: parseInt(offset),
    })

    const total = await prisma.obsIncident.count({
      where: {
        OR: [{ tenantId: request.tenantId }, { tenantId: null }],
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
      },
    })

    return reply.send(buildSuccessResponse({ incidents, total, limit: parseInt(limit), offset: parseInt(offset) }))
  })

  // POST /v1/monitoring/alerts/incidents — create incident
  app.post('/incidents', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      title: string
      description: string
      severity?: string
      category: string
      affectedArea?: string
      metrics?: Record<string, unknown>
    }

    const incident = await prisma.obsIncident.create({
      data: {
        tenantId: request.tenantId,
        title: body.title,
        description: body.description,
        severity: body.severity ?? 'warning',
        category: body.category,
        affectedArea: body.affectedArea,
        metrics: (body.metrics ?? {}) as object,
      },
    })
    return reply.status(201).send(buildSuccessResponse(incident))
  })

  // PATCH /v1/monitoring/alerts/incidents/:id/resolve
  app.patch('/incidents/:id/resolve', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = ResolveIncidentSchema.parse(request.body)

    const incident = await prisma.obsIncident.findFirst({
      where: { id, OR: [{ tenantId: request.tenantId }, { tenantId: null }], deletedAt: null },
    })

    if (!incident) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'Incident not found', 404)

    const updated = await prisma.obsIncident.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: request.userId,
        rootCause: body.rootCause,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // GET /v1/monitoring/alerts/incidents/summary — open incidents summary
  app.get('/incidents/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const [open, resolved24h, critical, bySeverity] = await Promise.all([
      prisma.obsIncident.count({ where: { OR: [{ tenantId: request.tenantId }, { tenantId: null }], status: 'open', deletedAt: null } }),
      prisma.obsIncident.count({ where: { OR: [{ tenantId: request.tenantId }, { tenantId: null }], status: 'resolved', resolvedAt: { gte: new Date(Date.now() - 86400000) }, deletedAt: null } }),
      prisma.obsIncident.count({ where: { OR: [{ tenantId: request.tenantId }, { tenantId: null }], status: 'open', severity: 'critical', deletedAt: null } }),
      prisma.obsIncident.groupBy({ by: ['severity'], where: { OR: [{ tenantId: request.tenantId }, { tenantId: null }], status: 'open', deletedAt: null }, _count: true }),
    ])

    return reply.send(buildSuccessResponse({
      open, critical, resolvedLast24h: resolved24h,
      bySeverity: Object.fromEntries(bySeverity.map(r => [r.severity, r._count])),
    }))
  })
}
