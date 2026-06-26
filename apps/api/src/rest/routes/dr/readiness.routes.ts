import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { getRtoPtoStatus, computeDrReadinessScore, getDrReadinessHistory } from '../../../dr/rto-rpo.monitor.js'

export async function drReadinessRoutes(app: FastifyInstance) {
  // GET /v1/dr/readiness/score — current DR readiness score
  app.get('/score', { preHandler: [requireAuth] }, async (_request, reply) => {
    const score = await computeDrReadinessScore()
    const rtoRpo = await getRtoPtoStatus()

    return reply.send(buildSuccessResponse({
      score,
      grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
      status: score >= 80 ? 'ready' : score >= 60 ? 'partial' : 'not_ready',
      rtoRpo,
      scoredAt: new Date().toISOString(),
    }))
  })

  // GET /v1/dr/readiness/history — score trend over time
  app.get('/history', { preHandler: [requireAuth] }, async (request, reply) => {
    const { days = '30' } = request.query as { days?: string }
    const history = await getDrReadinessHistory(parseInt(days))
    return reply.send(buildSuccessResponse(history))
  })

  // GET /v1/dr/readiness/rto-rpo — live RTO/RPO status
  app.get('/rto-rpo', { preHandler: [requireAuth] }, async (_request, reply) => {
    const status = await getRtoPtoStatus()
    return reply.send(buildSuccessResponse(status))
  })

  // GET /v1/dr/readiness/dashboard — full disaster readiness dashboard
  app.get('/dashboard', { preHandler: [requireAuth] }, async (_request, reply) => {
    const [score, rtoRpo, history, playbooks, recentJobs, recentTests, activeSchedules, openIncidents] = await Promise.all([
      computeDrReadinessScore(),
      getRtoPtoStatus(),
      getDrReadinessHistory(7),
      prisma.drPlaybook.count({ where: { isActive: true, deletedAt: null } }),
      prisma.bkpJob.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, jobType: true, status: true, sizeBytes: true, completedAt: true, isVerified: true },
      }),
      prisma.bkpRestoreTest.findMany({
        orderBy: { testedAt: 'desc' },
        take: 5,
        select: { id: true, testType: true, status: true, rtoActualMins: true, testedAt: true },
      }),
      prisma.bkpSchedule.count({ where: { isActive: true, deletedAt: null } }),
      prisma.aiSreIncident.count({ where: { status: { in: ['open', 'investigating'] }, deletedAt: null } }),
    ])

    return reply.send(buildSuccessResponse({
      readiness: {
        score,
        grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
        status: score >= 80 ? 'ready' : score >= 60 ? 'partial' : 'not_ready',
        trend: history,
      },
      rtoRpo,
      inventory: {
        activePlaybooks: playbooks,
        activeSchedules,
        openSreIncidents: openIncidents,
      },
      recentBackups: recentJobs.map(j => ({
        ...j,
        sizeBytes: j.sizeBytes?.toString() ?? null,
      })),
      recentRestoreTests: recentTests,
      checkedAt: new Date().toISOString(),
    }))
  })
}
