import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function pmMilestoneRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /pm/milestones?projectId=
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null }
    if (q.projectId) where.projectId = q.projectId
    if (q.status) where.status = q.status

    const milestones = await prisma.pmMilestone.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
    })

    return reply.send(buildSuccessResponse(milestones))
  })

  // GET /pm/milestones/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const milestone = await prisma.pmMilestone.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null }, orderBy: { position: 'asc' }, select: { id: true, title: true, status: true, priority: true, assigneeId: true, dueDate: true } },
      },
    })

    if (!milestone) throw new RenoError(ErrorCode.NOT_FOUND, 'Milestone not found', 404)
    return reply.send(buildSuccessResponse(milestone))
  })

  // POST /pm/milestones
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const milestone = await prisma.pmMilestone.create({
      data: {
        tenantId, projectId: body.projectId, name: body.name,
        description: body.description, dueDate: new Date(body.dueDate),
        status: 'open', color: body.color ?? '#6366f1', createdBy: userId,
      },
    })

    await prisma.pmActivityLog.create({
      data: { tenantId, projectId: body.projectId, actorId: userId, action: 'MILESTONE_CREATED', entityType: 'pm_milestones', entityId: milestone.id, changes: { name: body.name } },
    })

    return reply.status(201).send(buildSuccessResponse(milestone))
  })

  // PUT /pm/milestones/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.pmMilestone.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Milestone not found', 404)

    const updated = await prisma.pmMilestone.update({
      where: { id },
      data: {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        completedAt: body.status === 'completed' && existing.status !== 'completed' ? new Date() : undefined,
        updatedBy: userId,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /pm/milestones/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.pmMilestone.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })
}
