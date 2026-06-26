import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { runBackupJob, verifyBackup } from '../../../backup/backup.service.js'

export async function backupJobRoutes(app: FastifyInstance) {
  // GET /v1/backup/jobs — list backup jobs
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { limit = '20', status, jobType } = request.query as { limit?: string; status?: string; jobType?: string }
    const jobs = await prisma.bkpJob.findMany({
      where: {
        deletedAt: null,
        ...(status && { status }),
        ...(jobType && { jobType }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit), 100),
      select: {
        id: true, jobType: true, status: true, tenantId: true,
        sizeBytes: true, compressedBytes: true, integrityHash: true,
        isVerified: true, isImmutable: true, immutableUntil: true,
        durationMs: true, startedAt: true, completedAt: true,
        createdAt: true, errorMessage: true,
        _count: { select: { snapshots: true, restoreTests: true } },
      },
    })

    return reply.send(buildSuccessResponse(jobs.map(j => ({
      ...j,
      sizeBytes: j.sizeBytes?.toString() ?? null,
      compressedBytes: j.compressedBytes?.toString() ?? null,
    }))))
  })

  // POST /v1/backup/jobs — trigger a backup job
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      jobType?: string
      tenantId?: string
      label?: string
      enableReplication?: boolean
      replicationRegions?: string[]
      rpoTargetMins?: number
    }

    const result = await runBackupJob({
      jobType: (body.jobType ?? 'full') as 'full' | 'incremental' | 'pitr' | 'config' | 'tenant',
      tenantId: body.tenantId,
      label: body.label,
      enableReplication: body.enableReplication,
      replicationRegions: body.replicationRegions,
      rpoTargetMins: body.rpoTargetMins,
    })

    return reply.status(201).send(buildSuccessResponse(result))
  })

  // GET /v1/backup/jobs/:id — get specific job
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const job = await prisma.bkpJob.findFirst({
      where: { id, deletedAt: null },
      include: { snapshots: true, restoreTests: true, replications: true },
    })
    if (!job) return reply.status(404).send(buildSuccessResponse(null))
    return reply.send(buildSuccessResponse({
      ...job,
      sizeBytes: job.sizeBytes?.toString() ?? null,
      compressedBytes: job.compressedBytes?.toString() ?? null,
    }))
  })

  // POST /v1/backup/jobs/:id/verify — run integrity verification
  app.post('/:id/verify', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await verifyBackup(id)
    return reply.send(buildSuccessResponse(result))
  })

  // GET /v1/backup/jobs/stats — aggregate statistics
  app.get('/stats', { preHandler: [requireAuth] }, async (_request, reply) => {
    const now = new Date()
    const last7d = new Date(now.getTime() - 7 * 86400000)
    const last24h = new Date(now.getTime() - 86400000)

    const [total, completed, failed, verified, last7dJobs, last24hFailed, lastJob] = await Promise.all([
      prisma.bkpJob.count({ where: { deletedAt: null } }),
      prisma.bkpJob.count({ where: { status: 'completed', deletedAt: null } }),
      prisma.bkpJob.count({ where: { status: 'failed', deletedAt: null } }),
      prisma.bkpJob.count({ where: { isVerified: true, deletedAt: null } }),
      prisma.bkpJob.count({ where: { createdAt: { gte: last7d }, deletedAt: null } }),
      prisma.bkpJob.count({ where: { status: 'failed', createdAt: { gte: last24h } } }),
      prisma.bkpJob.findFirst({ where: { status: { in: ['completed', 'verified'] }, deletedAt: null }, orderBy: { completedAt: 'desc' }, select: { completedAt: true, jobType: true } }),
    ])

    return reply.send(buildSuccessResponse({
      total, completed, failed, verified,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      last7dJobs, last24hFailed,
      lastSuccessfulBackup: lastJob?.completedAt ?? null,
      lastBackupType: lastJob?.jobType ?? null,
    }))
  })
}
