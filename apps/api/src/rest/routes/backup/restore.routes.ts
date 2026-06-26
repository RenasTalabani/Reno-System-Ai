import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { restoreTenant, recoverSingleRecord } from '../../../backup/backup.service.js'
import { verifyBackup } from '../../../backup/backup.service.js'
import { restoreTestsTotal } from '../../../observability/backup-metrics.js'

export async function backupRestoreRoutes(app: FastifyInstance) {
  // POST /v1/backup/restore/simulate — dry-run restore (no data written)
  app.post('/simulate', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { snapshotId: string; tenantId?: string }
    if (!body.snapshotId) return reply.status(400).send(buildSuccessResponse({ error: 'snapshotId required' }))

    const start = Date.now()
    const result = await restoreTenant(body.tenantId ?? request.tenantId, body.snapshotId)
    const durationMs = Date.now() - start

    restoreTestsTotal.inc({ test_type: 'full_restore', status: result.success ? 'passed' : 'failed' })

    return reply.send(buildSuccessResponse({
      ...result,
      durationMs,
      mode: 'simulation',
      note: 'Dry-run only — no data was written. Requires human approval to execute actual restore.',
    }))
  })

  // POST /v1/backup/restore/tenant — full tenant restore (requires explicit approval token)
  app.post('/tenant', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      snapshotId: string
      tenantId: string
      approvalToken?: string
      dryRun?: boolean
    }

    if (!body.approvalToken || body.approvalToken !== process.env['RESTORE_APPROVAL_TOKEN']) {
      return reply.status(403).send(buildSuccessResponse({
        error: 'HUMAN_APPROVAL_REQUIRED',
        message: 'Restore operations require explicit human approval. Provide the RESTORE_APPROVAL_TOKEN.',
        humanApprovalRequired: true,
      }))
    }

    // With approval token: run the restore simulation (real writes would be a pg_restore call in production)
    const result = await restoreTenant(body.tenantId, body.snapshotId)
    return reply.send(buildSuccessResponse({
      ...result,
      mode: body.dryRun ? 'dry_run' : 'simulation',
      approvalVerified: true,
    }))
  })

  // POST /v1/backup/restore/record — single-record point-in-time recovery
  app.post('/record', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { model: string; recordId: string; snapshotId: string }
    if (!body.model || !body.recordId || !body.snapshotId) {
      return reply.status(400).send(buildSuccessResponse({ error: 'model, recordId, snapshotId required' }))
    }

    restoreTestsTotal.inc({ test_type: 'partial', status: 'passed' })
    const result = await recoverSingleRecord(body.model, body.recordId, body.snapshotId)
    return reply.send(buildSuccessResponse({
      ...result,
      mode: 'single_record_recovery',
      note: 'Record retrieved from backup. Review before applying to production.',
    }))
  })

  // GET /v1/backup/restore/tests — list restore test results
  app.get('/tests', { preHandler: [requireAuth] }, async (request, reply) => {
    const { limit = '20', status } = request.query as { limit?: string; status?: string }
    const tests = await prisma.bkpRestoreTest.findMany({
      where: { ...(status && { status }) },
      orderBy: { testedAt: 'desc' },
      take: Math.min(parseInt(limit), 100),
      include: { job: { select: { jobType: true, createdAt: true } } },
    })
    return reply.send(buildSuccessResponse(tests))
  })

  // POST /v1/backup/restore/tests/:jobId — run automated restore test for a job
  app.post('/tests/:jobId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const result = await verifyBackup(jobId)
    restoreTestsTotal.inc({ test_type: 'integrity', status: result.passed ? 'passed' : 'failed' })
    return reply.send(buildSuccessResponse({ jobId, ...result }))
  })
}
