import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function brainProposalsRoutes(app: FastifyInstance) {
  // GET /brain/proposals — list proposals for this tenant (pending by default)
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { status = 'pending_approval', page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (status !== 'all') where.status = status

    const [items, total] = await Promise.all([
      prisma.aiExecProposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, proposalType: true, title: true, description: true,
          priority: true, status: true, createdAt: true, updatedAt: true,
          approvedAt: true, rejectedAt: true, executedAt: true,
          proposedPayload: true,
        },
      }),
      prisma.aiExecProposal.count({ where }),
    ])

    return reply.send({
      success: true,
      data: items,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })

  // GET /brain/proposals/:id — get proposal details
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const proposal = await prisma.aiExecProposal.findFirst({
      where: { id, tenantId },
    })

    if (!proposal) return reply.code(404).send({ success: false, error: 'Proposal not found' })
    return reply.send({ success: true, data: proposal })
  })

  // POST /brain/proposals/:id/approve — approve a proposal
  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { note } = (req.body as any) ?? {}

    const proposal = await prisma.aiExecProposal.findFirst({ where: { id, tenantId } })
    if (!proposal) return reply.code(404).send({ success: false, error: 'Proposal not found' })
    if (proposal.status !== 'pending_approval') {
      return reply.code(400).send({ success: false, error: `Proposal is already ${proposal.status}` })
    }

    const updated = await prisma.aiExecProposal.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        approvalNote: note,
      },
    })

    return reply.send({ success: true, data: updated })
  })

  // POST /brain/proposals/:id/reject — reject a proposal
  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = (req.body as any) ?? {}

    const proposal = await prisma.aiExecProposal.findFirst({ where: { id, tenantId } })
    if (!proposal) return reply.code(404).send({ success: false, error: 'Proposal not found' })
    if (proposal.status !== 'pending_approval') {
      return reply.code(400).send({ success: false, error: `Proposal is already ${proposal.status}` })
    }

    const updated = await prisma.aiExecProposal.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
      },
    })

    return reply.send({ success: true, data: updated })
  })

  // GET /brain/proposals/tool-calls — tool call audit log
  app.get('/tool-calls', async (req, reply) => {
    const { tenantId } = req as any
    const { toolName, status: statusFilter, page = '1', limit = '50' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (toolName) where.toolName = toolName
    if (statusFilter) where.status = statusFilter

    const [logs, total] = await Promise.all([
      prisma.claudeToolCall.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, toolName: true, status: true,
          durationMs: true, errorMessage: true, proposalId: true, occurredAt: true,
          toolInput: true,
        },
      }),
      prisma.claudeToolCall.count({ where }),
    ])

    return reply.send({
      success: true,
      data: logs,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })
}
