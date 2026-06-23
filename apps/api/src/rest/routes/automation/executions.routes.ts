import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { runWorkflow, resumeExecution } from '../../../automation/engine.js'

export async function autoExecutionRoutes(app: FastifyInstance) {
  // GET /automation/executions
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { workflowId, status, page = '1', limit = '25' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (workflowId) where.workflowId = workflowId
    if (status) where.status = status

    const [items, total] = await Promise.all([
      prisma.autoExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          workflow: { select: { name: true, slug: true, category: true } },
          _count: { select: { stepResults: true } },
        },
      }),
      prisma.autoExecution.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /automation/executions/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const execution = await prisma.autoExecution.findFirst({
      where: { id, tenantId },
      include: {
        workflow: { select: { name: true, slug: true, steps: true } },
        stepResults: { orderBy: { stepIndex: 'asc' } },
        approvalGates: { orderBy: { requestedAt: 'desc' } },
      },
    })
    if (!execution) return reply.code(404).send({ success: false, error: 'Execution not found' })

    return reply.send({ success: true, data: execution })
  })

  // POST /automation/executions/:id/cancel
  app.post('/:id/cancel', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    await prisma.autoExecution.updateMany({
      where: { id, tenantId, status: { in: ['pending', 'running', 'waiting_approval'] } },
      data: { status: 'cancelled', completedAt: new Date() },
    })

    return reply.send({ success: true })
  })

  // POST /automation/executions/:id/retry
  app.post('/:id/retry', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const execution = await prisma.autoExecution.findFirst({ where: { id, tenantId } })
    if (!execution) return reply.code(404).send({ success: false, error: 'Execution not found' })
    if (execution.status !== 'failed') return reply.code(400).send({ success: false, error: 'Only failed executions can be retried' })

    const result = await runWorkflow(
      execution.workflowId,
      execution.triggerType,
      userId,
      execution.triggerData as any ?? {},
      tenantId,
    )

    return reply.send({ success: true, data: result })
  })
}
