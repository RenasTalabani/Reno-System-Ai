import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'

export async function brainActionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /brain/actions — list pending actions
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, module, riskLevel, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (status) where.status = status
    else where.status = { in: ['pending', 'approved', 'rejected', 'executed'] }
    if (module) where.module = module
    if (riskLevel) where.riskLevel = riskLevel

    const [items, total] = await Promise.all([
      prisma.brainAction.findMany({
        where,
        include: {
          conversation: { select: { id: true, title: true } },
          message: { select: { id: true, content: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.brainAction.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /brain/actions/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const action = await prisma.brainAction.findFirst({
      where: { id, tenantId },
      include: { conversation: true, message: true },
    })

    if (!action) return reply.code(404).send({ success: false, error: 'Action not found' })
    return reply.send({ success: true, data: action })
  })

  // POST /brain/actions — propose an AI action
  app.post('/', async (req, reply) => {
    const { tenantId } = req as any
    const body = req.body as any

    const action = await prisma.brainAction.create({
      data: {
        tenantId,
        conversationId: body.conversationId,
        messageId: body.messageId,
        type: body.type,
        module: body.module,
        title: body.title,
        description: body.description,
        payload: body.payload,
        riskLevel: body.riskLevel ?? 'low',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    return reply.code(201).send({ success: true, data: action })
  })

  // POST /brain/actions/:id/approve
  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const action = await prisma.brainAction.findFirst({ where: { id, tenantId, status: 'pending' } })
    if (!action) return reply.code(404).send({ success: false, error: 'Action not found or not pending' })

    const result = await executeAction(tenantId, action)

    const updated = await prisma.brainAction.update({
      where: { id },
      data: {
        status: result.success ? 'executed' : 'approved',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNote: body.note,
        executedAt: result.success ? new Date() : undefined,
        result: result.data,
      },
    })

    // Audit log
    await prisma.brainAuditLog.create({
      data: {
        tenantId,
        userId,
        conversationId: action.conversationId,
        action: 'action_approved',
        module: action.module,
        entityType: action.type,
        entityId: result.entityId,
        description: `Approved AI action: ${action.title}`,
        metadata: { actionId: action.id, result: result.data },
      },
    })

    return reply.send({ success: true, data: updated })
  })

  // POST /brain/actions/:id/reject
  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const action = await prisma.brainAction.findFirst({ where: { id, tenantId, status: 'pending' } })
    if (!action) return reply.code(404).send({ success: false, error: 'Action not found or not pending' })

    const updated = await prisma.brainAction.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNote: body.reason,
      },
    })

    await prisma.brainAuditLog.create({
      data: {
        tenantId,
        userId,
        conversationId: action.conversationId,
        action: 'action_rejected',
        module: action.module,
        description: `Rejected AI action: ${action.title}. Reason: ${body.reason ?? 'No reason given'}`,
        metadata: { actionId: action.id },
      },
    })

    return reply.send({ success: true, data: updated })
  })
}

async function executeAction(tenantId: string, action: any): Promise<{ success: boolean; data?: any; entityId?: string }> {
  // Action executor — handles low-risk AI actions
  // High-risk actions (marked with requiresApproval on agent) are still tracked but not auto-executed
  const { type, payload } = action

  try {
    // For Phase 10 — action execution stubs
    // Each action type maps to a specific module operation
    // Full implementation would call the respective module's service layer

    switch (type) {
      case 'inventory.create_reorder': {
        // Create procurement requisition for low-stock item
        return { success: true, data: { message: 'Reorder action recorded. Create requisition manually to confirm.' } }
      }
      case 'analytics.generate_insights': {
        return { success: true, data: { message: 'Insights generation queued.' } }
      }
      default: {
        // Unknown action type — mark as needing manual execution
        return { success: false, data: { message: `Action type ${type} requires manual execution.` } }
      }
    }
  } catch (err: any) {
    return { success: false, data: { error: err.message } }
  }
}
