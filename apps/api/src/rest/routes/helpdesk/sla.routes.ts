import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function sdSlaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /helpdesk/sla
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any

    const policies = await prisma.sdSlaPolicy.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { priority: 'asc' },
      include: {
        _count: { select: { tickets: { where: { deletedAt: null } } } },
        escalationRules: { where: { deletedAt: null, isActive: true }, orderBy: { triggerMinutes: 'asc' } },
      },
    })

    return reply.send(buildSuccessResponse(policies))
  })

  // POST /helpdesk/sla
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    // If marking as default, unset others for same priority
    if (body.isDefault) {
      await prisma.sdSlaPolicy.updateMany({
        where: { tenantId, priority: body.priority, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      })
    }

    const policy = await prisma.sdSlaPolicy.create({
      data: {
        tenantId, name: body.name, description: body.description,
        priority: body.priority ?? 'medium',
        firstResponseMinutes: body.firstResponseMinutes ?? 60,
        resolutionMinutes: body.resolutionMinutes ?? 480,
        businessHoursOnly: body.businessHoursOnly ?? true,
        isDefault: body.isDefault ?? false,
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(policy))
  })

  // PUT /helpdesk/sla/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.sdSlaPolicy.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'SLA policy not found', 404)

    if (body.isDefault) {
      await prisma.sdSlaPolicy.updateMany({
        where: { tenantId, priority: body.priority ?? existing.priority, isDefault: true, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.sdSlaPolicy.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /helpdesk/sla/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.sdSlaPolicy.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // ─── Escalation Rules ───────────────────────────────────────────────────────

  // GET /helpdesk/sla/escalation
  app.get('/escalation', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null }
    if (q.slaPolicyId) where.slaPolicyId = q.slaPolicyId

    const rules = await prisma.sdEscalationRule.findMany({
      where, orderBy: { triggerMinutes: 'asc' },
      include: { slaPolicy: { select: { id: true, name: true } } },
    })

    return reply.send(buildSuccessResponse(rules))
  })

  // POST /helpdesk/sla/escalation
  app.post('/escalation', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const rule = await prisma.sdEscalationRule.create({
      data: {
        tenantId, slaPolicyId: body.slaPolicyId,
        name: body.name,
        triggerType: body.triggerType ?? 'sla_breach',
        triggerMinutes: body.triggerMinutes ?? 60,
        priority: body.priority ?? 'high',
        action: body.action ?? 'notify',
        targetUserId: body.targetUserId,
        notifyEmails: body.notifyEmails ?? [],
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(rule))
  })

  // PUT /helpdesk/sla/escalation/:ruleId
  app.put('/escalation/:ruleId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { ruleId } = request.params as any
    const body = request.body as any

    const existing = await prisma.sdEscalationRule.findFirst({ where: { id: ruleId, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Escalation rule not found', 404)

    const updated = await prisma.sdEscalationRule.update({
      where: { id: ruleId },
      data: { ...body, updatedBy: undefined },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /helpdesk/sla/escalation/:ruleId
  app.delete('/escalation/:ruleId', async (request, reply) => {
    const { tenantId } = request as any
    const { ruleId } = request.params as any

    await prisma.sdEscalationRule.updateMany({
      where: { id: ruleId, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    })

    return reply.send(buildSuccessResponse({ id: ruleId }))
  })
}
