import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { runSreAnalysis, reconstructIncidentTimeline, forecastCapacity } from '../../../ai-sre/ai-sre.service.js'

export async function aiSreRoutes(app: FastifyInstance) {
  // GET /v1/ai-sre/analyze — full AI SRE analysis on live telemetry
  app.get('/analyze', { preHandler: [requireAuth] }, async (request, reply) => {
    const { tenantId } = request.query as { tenantId?: string }
    const { analysis, telemetry, incidentId } = await runSreAnalysis(tenantId ?? request.tenantId)
    return reply.send(buildSuccessResponse({
      ...analysis,
      incidentId,
      telemetrySampledAt: new Date().toISOString(),
      dataSource: 'live_production',
      humanApprovalRequired: true,
      autoActionsBlocked: true,
      _backupStatus: {
        lastBackupAt: telemetry.backupStatus.lastBackupAt,
        totalLast7d: telemetry.backupStatus.totalBackupsLast7d,
        failedLast24h: telemetry.backupStatus.failedBackupsLast24h,
      },
    }))
  })

  // GET /v1/ai-sre/capacity — capacity forecast
  app.get('/capacity', { preHandler: [requireAuth] }, async (request, reply) => {
    const { tenantId } = request.query as { tenantId?: string }
    const forecast = await forecastCapacity(tenantId ?? request.tenantId)
    return reply.send(buildSuccessResponse({
      ...forecast,
      forecastedAt: new Date().toISOString(),
      dataSource: 'live_production',
    }))
  })

  // GET /v1/ai-sre/digital-twin — infrastructure digital twin state
  app.get('/digital-twin', { preHandler: [requireAuth] }, async (_request, reply) => {
    const [lastAnalysis, latestBackup, activeIncidents, openDrIncidents] = await Promise.all([
      prisma.aiSreIncident.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { digitalTwinState: true, createdAt: true },
      }),
      prisma.bkpJob.findFirst({
        where: { status: { in: ['completed', 'verified'] }, deletedAt: null },
        orderBy: { completedAt: 'desc' },
        select: { jobType: true, status: true, completedAt: true, isVerified: true },
      }),
      prisma.obsIncident.count({ where: { status: 'open', deletedAt: null } }),
      prisma.aiSreIncident.count({ where: { status: { in: ['open', 'investigating'] }, deletedAt: null } }),
    ])

    const twin = (lastAnalysis?.digitalTwinState as Record<string, unknown> | null) ?? {}

    return reply.send(buildSuccessResponse({
      digitalTwin: {
        apiHealth: twin['apiHealth'] ?? 'healthy',
        dbHealth: twin['dbHealth'] ?? 'healthy',
        backupHealth: latestBackup?.isVerified ? 'healthy' : latestBackup ? 'degraded' : 'critical',
        cacheHealth: twin['cacheHealth'] ?? 'healthy',
        replicationHealth: twin['replicationHealth'] ?? 'unknown',
        overallSystemState: (openDrIncidents > 0 || activeIncidents > 0) ? 'degraded' : 'healthy',
        simulatedFailurePoints: (twin['simulatedFailurePoints'] as string[]) ?? [],
      },
      openObsIncidents: activeIncidents,
      openSreIncidents: openDrIncidents,
      lastSnapshotAt: lastAnalysis?.createdAt ?? null,
      lastBackup: latestBackup ?? null,
      _note: 'Digital Twin state is derived from live metrics and latest AI SRE analysis. Run /analyze to refresh.',
    }))
  })

  // GET /v1/ai-sre/incidents — list AI SRE incidents
  app.get('/incidents', { preHandler: [requireAuth] }, async (request, reply) => {
    const { limit = '20', status } = request.query as { limit?: string; status?: string }
    const incidents = await prisma.aiSreIncident.findMany({
      where: { deletedAt: null, ...(status && { status }) },
      orderBy: { detectedAt: 'desc' },
      take: Math.min(parseInt(limit), 100),
    })
    return reply.send(buildSuccessResponse(incidents))
  })

  // GET /v1/ai-sre/incidents/:id — get incident with full timeline
  app.get('/incidents/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const incident = await prisma.aiSreIncident.findFirst({ where: { id, deletedAt: null } })
    if (!incident) return reply.status(404).send(buildSuccessResponse(null))
    return reply.send(buildSuccessResponse(incident))
  })

  // POST /v1/ai-sre/incidents/:id/timeline — reconstruct incident timeline
  app.post('/incidents/:id/timeline', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await reconstructIncidentTimeline(id)
    return reply.send(buildSuccessResponse(result))
  })

  // PATCH /v1/ai-sre/incidents/:id/resolve — resolve an SRE incident
  app.patch('/incidents/:id/resolve', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { resolution?: string }
    await prisma.aiSreIncident.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date(), aiAnalysis: body.resolution ? `RESOLVED: ${body.resolution}` : undefined },
    })
    return reply.send(buildSuccessResponse({ id, resolved: true }))
  })

  // GET /v1/ai-sre/root-cause — root cause analysis for top open incidents
  app.get('/root-cause', { preHandler: [requireAuth] }, async (_request, reply) => {
    const openIncidents = await prisma.aiSreIncident.findMany({
      where: { status: { in: ['open', 'investigating'] }, deletedAt: null },
      orderBy: [{ severity: 'desc' }, { detectedAt: 'asc' }],
      take: 5,
      select: {
        id: true, title: true, severity: true, category: true, rootCause: true,
        recommendations: true, timeline: true, detectedAt: true, affectedServices: true,
      },
    })

    return reply.send(buildSuccessResponse({
      incidents: openIncidents,
      analysisAt: new Date().toISOString(),
      _note: 'Root causes are set by Reno Brain during /analyze calls. Run /analyze to generate fresh RCA.',
    }))
  })
}
