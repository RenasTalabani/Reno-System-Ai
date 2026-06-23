import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { resumeExecution } from '../../../automation/engine.js'

export async function autoApprovalRoutes(app: FastifyInstance) {
  // GET /automation/approvals
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status = 'pending', page = '1', limit = '25' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (status !== 'all') where.status = status

    const [items, total] = await Promise.all([
      prisma.autoApprovalGate.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          workflow: { select: { name: true, slug: true, category: true } },
          execution: { select: { status: true, triggerType: true, startedAt: true } },
        },
      }),
      prisma.autoApprovalGate.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /automation/approvals/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const gate = await prisma.autoApprovalGate.findFirst({
      where: { id, tenantId },
      include: {
        workflow: { select: { name: true, slug: true, steps: true } },
        execution: { include: { stepResults: { orderBy: { stepIndex: 'asc' } } } },
      },
    })
    if (!gate) return reply.code(404).send({ success: false, error: 'Approval gate not found' })

    return reply.send({ success: true, data: gate })
  })

  // POST /automation/approvals/:id/approve
  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { note } = req.body as any ?? {}

    const gate = await prisma.autoApprovalGate.findFirst({ where: { id, tenantId, status: 'pending' } })
    if (!gate) return reply.code(404).send({ success: false, error: 'Approval gate not found or already decided' })

    await prisma.autoApprovalGate.update({
      where: { id },
      data: { status: 'approved', decidedAt: new Date(), decidedBy: userId, decisionNote: note },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'approve', module: 'automation', entityType: 'AutoApprovalGate', entityId: id, newValues: { note } },
    })

    // Resume the execution
    const finalStatus = await resumeExecution(gate.executionId, 'approved', userId)

    return reply.send({ success: true, data: { gateStatus: 'approved', executionStatus: finalStatus } })
  })

  // POST /automation/approvals/:id/reject
  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any ?? {}

    const gate = await prisma.autoApprovalGate.findFirst({ where: { id, tenantId, status: 'pending' } })
    if (!gate) return reply.code(404).send({ success: false, error: 'Approval gate not found or already decided' })

    await prisma.autoApprovalGate.update({
      where: { id },
      data: { status: 'rejected', decidedAt: new Date(), decidedBy: userId, decisionNote: reason },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'reject', module: 'automation', entityType: 'AutoApprovalGate', entityId: id, newValues: { reason } },
    })

    const finalStatus = await resumeExecution(gate.executionId, 'rejected', userId)

    return reply.send({ success: true, data: { gateStatus: 'rejected', executionStatus: finalStatus } })
  })
}
