import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function pmTaskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /pm/tasks — cross-project task query (my tasks, overdue, by project)
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '20'))

    const where: any = { tenantId, deletedAt: null, parentId: null }
    if (q.projectId) where.projectId = q.projectId
    if (q.assigneeId) where.assigneeId = q.assigneeId
    if (q.status) where.status = q.status
    if (q.priority) where.priority = q.priority
    if (q.milestoneId) where.milestoneId = q.milestoneId
    if (q.taskType) where.taskType = q.taskType
    if (q.overdue === 'true') where.dueDate = { lt: new Date() }
    if (q.dueSoon === 'true') {
      const in7d = new Date(); in7d.setDate(in7d.getDate() + 7)
      where.dueDate = { gte: new Date(), lte: in7d }
    }

    const [total, tasks] = await Promise.all([
      prisma.pmTask.count({ where }),
      prisma.pmTask.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { position: 'asc' }],
        include: {
          project: { select: { id: true, name: true, color: true, code: true } },
          milestone: { select: { id: true, name: true } },
          _count: { select: { subtasks: { where: { deletedAt: null } }, comments: { where: { deletedAt: null } }, attachments: { where: { deletedAt: null } } } },
        },
      }),
    ])

    return reply.send(buildSuccessResponse(tasks, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /pm/tasks/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const task = await prisma.pmTask.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, code: true, color: true } },
        milestone: { select: { id: true, name: true } },
        parent: { select: { id: true, title: true } },
        subtasks: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        comments: { where: { deletedAt: null, parentId: null }, orderBy: { createdAt: 'asc' }, include: { replies: { where: { deletedAt: null } } } },
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        timeLogs: { where: { deletedAt: null }, orderBy: { startTime: 'desc' }, take: 10 },
        dependsOn: { where: { deletedAt: null }, include: { dependsOn: { select: { id: true, title: true, status: true } } } },
        dependedOnBy: { where: { deletedAt: null }, include: { task: { select: { id: true, title: true, status: true } } } },
      },
    })

    if (!task) throw new RenoError(ErrorCode.NOT_FOUND, 'Task not found', 404)
    return reply.send(buildSuccessResponse(task))
  })

  // POST /pm/tasks
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    // Get max position for ordering
    const maxPos = await prisma.pmTask.aggregate({
      where: { tenantId, projectId: body.projectId, parentId: body.parentId ?? null, deletedAt: null },
      _max: { position: true },
    })

    const task = await prisma.pmTask.create({
      data: {
        tenantId, projectId: body.projectId, milestoneId: body.milestoneId,
        parentId: body.parentId, title: body.title, description: body.description,
        status: body.status ?? 'todo', priority: body.priority ?? 'medium',
        taskType: body.taskType ?? 'task',
        assigneeId: body.assigneeId, reporterId: body.reporterId ?? userId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        estimatedHours: body.estimatedHours, storyPoints: body.storyPoints,
        labels: body.labels ?? [],
        position: (maxPos._max.position ?? -1) + 1,
        createdBy: userId,
      },
    })

    await prisma.pmActivityLog.create({
      data: { tenantId, projectId: body.projectId, taskId: task.id, actorId: userId, action: 'TASK_CREATED', entityType: 'pm_tasks', entityId: task.id, changes: { title: body.title, status: task.status } },
    })

    // Update project progress
    await recalculateProjectProgress(tenantId, body.projectId)

    return reply.status(201).send(buildSuccessResponse(task))
  })

  // PUT /pm/tasks/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.pmTask.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Task not found', 404)

    const updated = await prisma.pmTask.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        completedAt: body.status === 'done' && existing.status !== 'done' ? new Date() : (body.status && body.status !== 'done' ? null : undefined),
        updatedBy: userId,
      },
    })

    if (body.status && body.status !== existing.status) {
      await prisma.pmActivityLog.create({
        data: { tenantId, projectId: existing.projectId, taskId: id, actorId: userId, action: 'TASK_STATUS_CHANGED', entityType: 'pm_tasks', entityId: id, changes: { from: existing.status, to: body.status } },
      })
      await recalculateProjectProgress(tenantId, existing.projectId)
    }

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /pm/tasks/:id/position — drag-drop reorder
  app.patch('/:id/position', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { position, status } = request.body as any

    await prisma.pmTask.update({ where: { id }, data: { position, status, updatedBy: userId } })
    return reply.send(buildSuccessResponse({ id, position, status }))
  })

  // DELETE /pm/tasks/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const task = await prisma.pmTask.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!task) throw new RenoError(ErrorCode.NOT_FOUND, 'Task not found', 404)

    await prisma.pmTask.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    await recalculateProjectProgress(tenantId, task.projectId)

    return reply.send(buildSuccessResponse({ id }))
  })

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------
  app.get('/:id/comments', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const comments = await prisma.pmTaskComment.findMany({
      where: { taskId: id, tenantId, deletedAt: null, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: { replies: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    })

    return reply.send(buildSuccessResponse(comments))
  })

  app.post('/:id/comments', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const task = await prisma.pmTask.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!task) throw new RenoError(ErrorCode.NOT_FOUND, 'Task not found', 404)

    const comment = await prisma.pmTaskComment.create({
      data: { tenantId, taskId: id, authorId: userId, parentId: body.parentId, content: body.content, createdBy: userId },
    })

    await prisma.pmActivityLog.create({
      data: { tenantId, projectId: task.projectId, taskId: id, actorId: userId, action: 'TASK_COMMENTED', entityType: 'pm_task_comments', entityId: comment.id },
    })

    return reply.status(201).send(buildSuccessResponse(comment))
  })

  app.put('/:id/comments/:commentId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { commentId } = request.params as any
    const { content } = request.body as any

    const updated = await prisma.pmTaskComment.update({
      where: { id: commentId },
      data: { content, isEdited: true, editedAt: new Date(), updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  app.delete('/:id/comments/:commentId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { commentId } = request.params as any

    await prisma.pmTaskComment.updateMany({
      where: { id: commentId, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id: commentId }))
  })

  // -------------------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------------------
  app.get('/:id/attachments', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const attachments = await prisma.pmTaskAttachment.findMany({
      where: { taskId: id, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(buildSuccessResponse(attachments))
  })

  app.post('/:id/attachments', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const attachment = await prisma.pmTaskAttachment.create({
      data: { tenantId, taskId: id, uploadedBy: userId, fileName: body.fileName, fileUrl: body.fileUrl, fileMimeType: body.fileMimeType, fileSizeBytes: body.fileSizeBytes, createdBy: userId },
    })

    return reply.status(201).send(buildSuccessResponse(attachment))
  })

  app.delete('/:id/attachments/:attachmentId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { attachmentId } = request.params as any

    await prisma.pmTaskAttachment.updateMany({
      where: { id: attachmentId, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id: attachmentId }))
  })

  // -------------------------------------------------------------------------
  // Time Logs
  // -------------------------------------------------------------------------
  app.get('/:id/time-logs', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const logs = await prisma.pmTimeLog.findMany({
      where: { taskId: id, tenantId, deletedAt: null },
      orderBy: { startTime: 'desc' },
    })

    return reply.send(buildSuccessResponse(logs))
  })

  app.post('/:id/time-logs', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const task = await prisma.pmTask.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!task) throw new RenoError(ErrorCode.NOT_FOUND, 'Task not found', 404)

    const startTime = new Date(body.startTime)
    const endTime = body.endTime ? new Date(body.endTime) : undefined
    const durationMinutes = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : body.durationMinutes

    const log = await prisma.pmTimeLog.create({
      data: {
        tenantId, projectId: task.projectId, taskId: id, userId,
        description: body.description, startTime, endTime,
        durationMinutes, isBillable: body.isBillable ?? false,
        hourlyRate: body.hourlyRate, currency: body.currency ?? 'USD',
        createdBy: userId,
      },
    })

    // Update task actual hours
    if (durationMinutes) {
      await prisma.pmTask.update({
        where: { id },
        data: { actualHours: { increment: durationMinutes / 60 }, updatedBy: userId },
      })
    }

    return reply.status(201).send(buildSuccessResponse(log))
  })

  // -------------------------------------------------------------------------
  // Dependencies
  // -------------------------------------------------------------------------
  app.post('/:id/dependencies', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const dep = await prisma.pmTaskDependency.create({
      data: { tenantId, taskId: id, dependsOnId: body.dependsOnId, dependencyType: body.dependencyType ?? 'finish_to_start', createdBy: userId },
    })

    return reply.status(201).send(buildSuccessResponse(dep))
  })

  app.delete('/:id/dependencies/:depId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { depId } = request.params as any

    await prisma.pmTaskDependency.updateMany({
      where: { id: depId, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id: depId }))
  })
}

async function recalculateProjectProgress(tenantId: string, projectId: string) {
  const [total, done] = await Promise.all([
    prisma.pmTask.count({ where: { tenantId, projectId, deletedAt: null, parentId: null } }),
    prisma.pmTask.count({ where: { tenantId, projectId, deletedAt: null, parentId: null, status: 'done' } }),
  ])
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  await prisma.pmProject.update({ where: { id: projectId }, data: { progress } })
}
