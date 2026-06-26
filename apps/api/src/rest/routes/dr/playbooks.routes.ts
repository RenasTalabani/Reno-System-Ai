import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { seedDefaultPlaybooks, executePlaybookStep } from '../../../dr/playbook.service.js'

export async function drPlaybookRoutes(app: FastifyInstance) {
  // GET /v1/dr/playbooks
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { category } = request.query as { category?: string }
    const playbooks = await prisma.drPlaybook.findMany({
      where: { isActive: true, deletedAt: null, ...(category && { category }) },
      orderBy: [{ severity: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { executions: true } } },
    })
    return reply.send(buildSuccessResponse(playbooks))
  })

  // POST /v1/dr/playbooks/seed — initialize default playbooks
  app.post('/seed', { preHandler: [requireAuth] }, async (_request, reply) => {
    await seedDefaultPlaybooks()
    const count = await prisma.drPlaybook.count({ where: { deletedAt: null } })
    return reply.send(buildSuccessResponse({ seeded: true, totalPlaybooks: count }))
  })

  // GET /v1/dr/playbooks/:id
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const playbook = await prisma.drPlaybook.findFirst({
      where: { id, deletedAt: null },
      include: { executions: { orderBy: { startedAt: 'desc' }, take: 10 } },
    })
    if (!playbook) return reply.status(404).send(buildSuccessResponse(null))
    return reply.send(buildSuccessResponse(playbook))
  })

  // POST /v1/dr/playbooks/:id/execute — start a playbook execution
  app.post('/:id/execute', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { triggerReason?: string }

    const playbook = await prisma.drPlaybook.findFirst({ where: { id, deletedAt: null } })
    if (!playbook) return reply.status(404).send(buildSuccessResponse(null))

    const execution = await prisma.drPlaybookExecution.create({
      data: {
        playbookId: id,
        triggeredBy: request.userId,
        triggerReason: body.triggerReason ?? 'Manual execution',
        status: 'running',
        currentStep: 0,
      },
    })

    await prisma.drPlaybook.update({ where: { id }, data: { lastTestedAt: new Date() } })

    return reply.status(201).send(buildSuccessResponse({
      executionId: execution.id,
      playbookId: id,
      status: 'running',
      humanApprovalRequired: true,
      message: 'Playbook execution started. Each step requiring human approval must be manually advanced.',
    }))
  })

  // PATCH /v1/dr/playbooks/executions/:executionId/step — advance a step
  app.patch('/executions/:executionId/step', { preHandler: [requireAuth] }, async (request, reply) => {
    const { executionId } = request.params as { executionId: string }
    const body = request.body as { stepIndex: number; outcome: 'success' | 'failed' | 'skipped'; notes?: string }

    await executePlaybookStep(executionId, body.stepIndex, body.outcome, body.notes)

    const execution = await prisma.drPlaybookExecution.findFirst({ where: { id: executionId } })
    return reply.send(buildSuccessResponse(execution))
  })

  // GET /v1/dr/playbooks/executions — list recent executions
  app.get('/executions', { preHandler: [requireAuth] }, async (_request, reply) => {
    const executions = await prisma.drPlaybookExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { playbook: { select: { name: true, category: true, severity: true } } },
    })
    return reply.send(buildSuccessResponse(executions))
  })
}
