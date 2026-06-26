import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function backupSnapshotRoutes(app: FastifyInstance) {
  // GET /v1/backup/snapshots — list snapshots
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { limit = '30', tenantId, snapshotType } = request.query as {
      limit?: string; tenantId?: string; snapshotType?: string
    }

    const snapshots = await prisma.bkpSnapshot.findMany({
      where: {
        deletedAt: null,
        ...(tenantId && { tenantId }),
        ...(snapshotType && { snapshotType }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit), 200),
      select: {
        id: true, tenantId: true, snapshotType: true, label: true,
        pitrTimestamp: true, sizeBytes: true, integrityHash: true,
        isVerified: true, verifiedAt: true, expiresAt: true,
        createdAt: true, jobId: true,
      },
    })

    return reply.send(buildSuccessResponse(snapshots.map(s => ({
      ...s,
      sizeBytes: s.sizeBytes?.toString() ?? null,
    }))))
  })

  // GET /v1/backup/snapshots/pitr — snapshots available for PITR
  app.get('/pitr', { preHandler: [requireAuth] }, async (request, reply) => {
    const { tenantId, from, to } = request.query as { tenantId?: string; from?: string; to?: string }
    const snapshots = await prisma.bkpSnapshot.findMany({
      where: {
        deletedAt: null,
        snapshotType: { in: ['full', 'incremental', 'wal'] },
        ...(tenantId && { tenantId }),
        ...(from && { pitrTimestamp: { gte: new Date(from) } }),
        ...(to && { pitrTimestamp: { lte: new Date(to) } }),
      },
      orderBy: { pitrTimestamp: 'desc' },
      take: 100,
      select: { id: true, snapshotType: true, pitrTimestamp: true, label: true, sizeBytes: true, isVerified: true },
    })
    return reply.send(buildSuccessResponse(snapshots.map(s => ({ ...s, sizeBytes: s.sizeBytes?.toString() ?? null }))))
  })

  // GET /v1/backup/snapshots/:id — get specific snapshot
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const snapshot = await prisma.bkpSnapshot.findFirst({
      where: { id, deletedAt: null },
      include: { job: { select: { jobType: true, status: true, completedAt: true, storageLocation: true } } },
    })
    if (!snapshot) return reply.status(404).send(buildSuccessResponse(null))
    return reply.send(buildSuccessResponse({
      ...snapshot,
      sizeBytes: snapshot.sizeBytes?.toString() ?? null,
    }))
  })
}
