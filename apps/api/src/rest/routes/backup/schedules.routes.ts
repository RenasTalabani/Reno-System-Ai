import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function backupScheduleRoutes(app: FastifyInstance) {
  // GET /v1/backup/schedules
  app.get('/', { preHandler: [requireAuth] }, async (_request, reply) => {
    const schedules = await prisma.bkpSchedule.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send(buildSuccessResponse(schedules))
  })

  // POST /v1/backup/schedules
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      name: string; jobType: string; cronExpression: string;
      rpoTargetMins?: number; rtoTargetMins?: number; retentionDays?: number;
      enableReplication?: boolean; replicationRegions?: string[];
      tenantId?: string;
    }

    const schedule = await prisma.bkpSchedule.create({
      data: {
        name: body.name,
        jobType: body.jobType,
        cronExpression: body.cronExpression,
        tenantId: body.tenantId ?? null,
        rpoTargetMins: body.rpoTargetMins ?? 60,
        rtoTargetMins: body.rtoTargetMins ?? 240,
        retentionDays: body.retentionDays ?? 30,
        enableReplication: body.enableReplication ?? false,
        replicationRegions: (body.replicationRegions ?? []) as object,
        nextRunAt: new Date(Date.now() + 3600000),
      },
    })
    return reply.status(201).send(buildSuccessResponse(schedule))
  })

  // PATCH /v1/backup/schedules/:id
  app.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { isActive?: boolean; cronExpression?: string; retentionDays?: number }
    const schedule = await prisma.bkpSchedule.update({ where: { id }, data: body })
    return reply.send(buildSuccessResponse(schedule))
  })

  // DELETE /v1/backup/schedules/:id
  app.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.bkpSchedule.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    return reply.status(204).send()
  })
}
