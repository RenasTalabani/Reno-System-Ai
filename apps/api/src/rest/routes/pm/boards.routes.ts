import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function pmBoardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /pm/boards?projectId=
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null }
    if (q.projectId) where.projectId = q.projectId

    const boards = await prisma.pmBoard.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        columns: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
      },
    })

    return reply.send(buildSuccessResponse(boards))
  })

  // GET /pm/boards/:id — board with columns + tasks grouped by column status
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const q = request.query as any

    const board = await prisma.pmBoard.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { columns: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
    })
    if (!board) throw new RenoError(ErrorCode.NOT_FOUND, 'Board not found', 404)

    // Load tasks grouped by status for this project
    const taskWhere: any = { tenantId, projectId: board.projectId, deletedAt: null, parentId: null }
    if (q.assigneeId) taskWhere.assigneeId = q.assigneeId
    if (q.milestoneId) taskWhere.milestoneId = q.milestoneId

    const tasks = await prisma.pmTask.findMany({
      where: taskWhere,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { subtasks: { where: { deletedAt: null } }, comments: { where: { deletedAt: null } }, attachments: { where: { deletedAt: null } } } },
      },
    })

    // Group tasks by column taskStatus
    const grouped: Record<string, any[]> = {}
    for (const col of board.columns) {
      grouped[col.taskStatus ?? col.id] = tasks.filter(t => t.status === col.taskStatus)
    }

    return reply.send(buildSuccessResponse({ ...board, tasksByStatus: grouped }))
  })

  // POST /pm/boards
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const board = await prisma.pmBoard.create({
      data: { tenantId, projectId: body.projectId, name: body.name, description: body.description, boardType: body.boardType ?? 'kanban', isDefault: body.isDefault ?? false, createdBy: userId },
    })

    // Create default columns if none provided
    const columns = body.columns ?? [
      { name: 'Backlog', color: '#64748b', position: 0, taskStatus: 'backlog' },
      { name: 'To Do', color: '#6366f1', position: 1, taskStatus: 'todo', isDefault: true },
      { name: 'In Progress', color: '#f59e0b', position: 2, taskStatus: 'in_progress' },
      { name: 'In Review', color: '#8b5cf6', position: 3, taskStatus: 'in_review' },
      { name: 'Done', color: '#22c55e', position: 4, taskStatus: 'done' },
    ]

    await prisma.pmBoardColumn.createMany({
      data: columns.map((c: any) => ({ tenantId, boardId: board.id, ...c, createdBy: userId })),
    })

    return reply.status(201).send(buildSuccessResponse(board))
  })

  // PUT /pm/boards/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const updated = await prisma.pmBoard.update({ where: { id }, data: { ...body, updatedBy: userId } })
    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /pm/boards/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.pmBoard.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // -------------------------------------------------------------------------
  // Board Columns
  // -------------------------------------------------------------------------

  // POST /pm/boards/:id/columns
  app.post('/:id/columns', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const maxPos = await prisma.pmBoardColumn.aggregate({
      where: { boardId: id, tenantId, deletedAt: null },
      _max: { position: true },
    })

    const column = await prisma.pmBoardColumn.create({
      data: {
        tenantId, boardId: id, name: body.name, color: body.color ?? '#6366f1',
        position: body.position ?? (maxPos._max.position ?? -1) + 1,
        wipLimit: body.wipLimit, taskStatus: body.taskStatus, isDefault: body.isDefault ?? false,
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(column))
  })

  // PUT /pm/boards/:id/columns/:columnId
  app.put('/:id/columns/:columnId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { columnId } = request.params as any
    const body = request.body as any

    const updated = await prisma.pmBoardColumn.update({ where: { id: columnId }, data: { ...body, updatedBy: userId } })
    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /pm/boards/:id/columns/reorder — bulk position update
  app.patch('/:id/columns/reorder', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    if (!Array.isArray(body.columns)) throw new RenoError(ErrorCode.VALIDATION_ERROR, 'columns array required', 400)

    await Promise.all(body.columns.map((c: { id: string; position: number }) =>
      prisma.pmBoardColumn.update({ where: { id: c.id }, data: { position: c.position, updatedBy: userId } })
    ))

    return reply.send(buildSuccessResponse({ reordered: body.columns.length }))
  })

  // DELETE /pm/boards/:id/columns/:columnId
  app.delete('/:id/columns/:columnId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { columnId } = request.params as any

    await prisma.pmBoardColumn.updateMany({
      where: { id: columnId, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id: columnId }))
  })
}
