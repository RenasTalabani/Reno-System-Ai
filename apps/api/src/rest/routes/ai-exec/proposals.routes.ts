import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function aiExecProposalsRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, proposalType, limit = 20, offset = 0 } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (proposalType) where.proposalType = proposalType
    const [items, total] = await Promise.all([
      prisma.aiExecProposal.findMany({ where, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], take: Number(limit), skip: Number(offset) }),
      prisma.aiExecProposal.count({ where }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.aiExecProposal.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!item) return reply.status(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: item })
  })

  // Human approves a proposal
  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { notes } = req.body as any

    const proposal = await prisma.aiExecProposal.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!proposal) return reply.status(404).send({ success: false, error: 'Not found' })
    if (proposal.status !== 'pending_approval') return reply.status(400).send({ success: false, error: 'Only pending proposals can be approved' })

    const updated = await prisma.aiExecProposal.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date(), approvalNote: notes },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'approve_proposal', module: 'ai_executive', entityType: 'proposal', entityId: id, metadata: { notes } as any },
    })

    return reply.send({ success: true, data: updated })
  })

  // Human rejects a proposal
  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any

    const proposal = await prisma.aiExecProposal.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!proposal) return reply.status(404).send({ success: false, error: 'Not found' })
    if (proposal.status !== 'pending_approval') return reply.status(400).send({ success: false, error: 'Only pending proposals can be rejected' })

    const updated = await prisma.aiExecProposal.update({
      where: { id },
      data: { status: 'rejected', rejectedBy: userId, rejectedAt: new Date(), approvalNote: reason },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'reject_proposal', module: 'ai_executive', entityType: 'proposal', entityId: id, metadata: { reason } as any },
    })

    return reply.send({ success: true, data: updated })
  })

  // Execute an approved proposal — routes through AutoWorkflow or direct task creation
  app.post('/:id/execute', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const proposal = await prisma.aiExecProposal.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!proposal) return reply.status(404).send({ success: false, error: 'Not found' })
    if (proposal.status !== 'approved') return reply.status(400).send({ success: false, error: 'Only approved proposals can be executed' })

    const payload = proposal.proposedPayload as any
    let executionResult: any = { type: proposal.proposalType }

    if (proposal.proposalType === 'task' && payload?.projectId) {
      const task = await prisma.pmTask.create({
        data: {
          tenantId,
          projectId: payload.projectId,
          title: proposal.title,
          description: proposal.description,
          status: 'todo',
          priority: 'high',
          createdBy: userId,
          updatedBy: userId,
        },
      }).catch(() => null)
      executionResult = { type: 'task', taskId: task?.id }
    } else if (proposal.proposalType === 'workflow') {
      // Create a one-off workflow from the proposal payload
      const slug = `ai-proposal-${id.slice(0, 8)}-${Date.now()}`
      const workflow = await prisma.autoWorkflow.create({
        data: {
          tenantId, slug,
          name: proposal.title,
          description: proposal.description,
          triggerType: 'manual',
          triggerConfig: payload as any,
          steps: (payload?.steps ?? []) as any,
          createdBy: userId,
        },
      }).catch(() => null)
      executionResult = { type: 'workflow', workflowId: workflow?.id }
    }

    await prisma.aiExecProposal.update({
      where: { id },
      data: { status: 'executed', executedAt: new Date(), executionResult: executionResult as any },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'execute_proposal', module: 'ai_executive', entityType: 'proposal', entityId: id, metadata: executionResult as any },
    })

    return reply.send({ success: true, data: { id, status: 'executed', executionResult } })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    await prisma.aiExecProposal.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } })
    return reply.send({ success: true })
  })
}
