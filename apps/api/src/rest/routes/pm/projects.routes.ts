import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function pmProjectRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /pm/projects
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '20'))

    const where: any = { tenantId, deletedAt: null }
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' }
    if (q.status) where.status = q.status
    if (q.priority) where.priority = q.priority
    if (q.ownerId) where.ownerId = q.ownerId

    const [total, projects] = await Promise.all([
      prisma.pmProject.count({ where }),
      prisma.pmProject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          members: { where: { deletedAt: null }, select: { userId: true, role: true } },
          _count: { select: { tasks: { where: { deletedAt: null } }, milestones: { where: { deletedAt: null } } } },
        },
      }),
    ])

    return reply.send(buildSuccessResponse(projects, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /pm/projects/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const project = await prisma.pmProject.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        members: { where: { deletedAt: null } },
        milestones: { where: { deletedAt: null }, orderBy: { dueDate: 'asc' } },
        boards: { where: { deletedAt: null }, include: { columns: { where: { deletedAt: null }, orderBy: { position: 'asc' } } } },
        labels: { where: { deletedAt: null } },
        _count: { select: { tasks: { where: { deletedAt: null } }, allocations: { where: { deletedAt: null } } } },
      },
    })

    if (!project) throw new RenoError(ErrorCode.NOT_FOUND, 'Project not found', 404)
    return reply.send(buildSuccessResponse(project))
  })

  // POST /pm/projects
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    // Auto-generate project code if not provided
    const count = await prisma.pmProject.count({ where: { tenantId } })
    const code = body.code ?? `PRJ-${String(count + 1).padStart(4, '0')}`

    const project = await prisma.pmProject.create({
      data: {
        tenantId, companyId: body.companyId, name: body.name, code,
        description: body.description, status: body.status ?? 'planning',
        priority: body.priority ?? 'medium', visibility: body.visibility ?? 'internal',
        ownerId: body.ownerId ?? userId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        color: body.color ?? '#6366f1', icon: body.icon, tags: body.tags ?? [],
        budget: body.budget, currency: body.currency ?? 'USD',
        estimatedHours: body.estimatedHours,
        createdBy: userId,
      },
    })

    // Auto-add creator as project owner
    await prisma.pmProjectMember.create({
      data: { tenantId, projectId: project.id, userId, role: 'owner', createdBy: userId },
    })

    // Create default kanban board
    const board = await prisma.pmBoard.create({
      data: { tenantId, projectId: project.id, name: 'Main Board', boardType: 'kanban', isDefault: true, createdBy: userId },
    })
    const defaultColumns = [
      { name: 'Backlog', color: '#64748b', position: 0, taskStatus: 'backlog' },
      { name: 'To Do', color: '#6366f1', position: 1, taskStatus: 'todo', isDefault: true },
      { name: 'In Progress', color: '#f59e0b', position: 2, taskStatus: 'in_progress' },
      { name: 'In Review', color: '#8b5cf6', position: 3, taskStatus: 'in_review' },
      { name: 'Done', color: '#22c55e', position: 4, taskStatus: 'done' },
    ]
    await prisma.pmBoardColumn.createMany({
      data: defaultColumns.map(c => ({ tenantId, boardId: board.id, ...c, createdBy: userId })),
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE_PROJECT', module: 'pm', entityType: 'pm_projects', entityId: project.id, newValues: { name: body.name, code }, ipAddress: request.ip },
    })

    await prisma.pmActivityLog.create({
      data: { tenantId, projectId: project.id, actorId: userId, action: 'PROJECT_CREATED', entityType: 'pm_projects', entityId: project.id, changes: { name: body.name } },
    })

    return reply.status(201).send(buildSuccessResponse(project))
  })

  // PUT /pm/projects/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.pmProject.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Project not found', 404)

    const updated = await prisma.pmProject.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : undefined,
        updatedBy: userId,
      },
    })

    await prisma.pmActivityLog.create({
      data: { tenantId, projectId: id, actorId: userId, action: 'PROJECT_UPDATED', entityType: 'pm_projects', entityId: id, changes: body },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /pm/projects/:id/status
  app.patch('/:id/status', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { status } = request.body as any

    const existing = await prisma.pmProject.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Project not found', 404)

    const updated = await prisma.pmProject.update({
      where: { id },
      data: {
        status,
        actualEndDate: status === 'completed' ? new Date() : undefined,
        updatedBy: userId,
      },
    })

    await prisma.pmActivityLog.create({
      data: { tenantId, projectId: id, actorId: userId, action: 'PROJECT_STATUS_CHANGED', entityType: 'pm_projects', entityId: id, changes: { from: existing.status, to: status } },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /pm/projects/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.pmProject.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE_PROJECT', module: 'pm', entityType: 'pm_projects', entityId: id, ipAddress: request.ip },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // -------------------------------------------------------------------------
  // Project Members
  // -------------------------------------------------------------------------

  // GET /pm/projects/:id/members
  app.get('/:id/members', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const members = await prisma.pmProjectMember.findMany({
      where: { projectId: id, tenantId, deletedAt: null },
      orderBy: { joinedAt: 'asc' },
    })

    return reply.send(buildSuccessResponse(members))
  })

  // POST /pm/projects/:id/members
  app.post('/:id/members', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.pmProjectMember.findFirst({
      where: { projectId: id, userId: body.userId, tenantId, deletedAt: null },
    })
    if (existing) throw new RenoError(ErrorCode.CONFLICT, 'User is already a project member', 409)

    const member = await prisma.pmProjectMember.create({
      data: { tenantId, projectId: id, userId: body.userId, role: body.role ?? 'member', createdBy: userId },
    })

    await prisma.pmActivityLog.create({
      data: { tenantId, projectId: id, actorId: userId, action: 'MEMBER_ADDED', entityType: 'pm_project_members', entityId: member.id, changes: { userId: body.userId, role: body.role } },
    })

    return reply.status(201).send(buildSuccessResponse(member))
  })

  // PATCH /pm/projects/:id/members/:memberId/role
  app.patch('/:id/members/:memberId/role', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { memberId } = request.params as any
    const { role } = request.body as any

    const updated = await prisma.pmProjectMember.update({
      where: { id: memberId },
      data: { role, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /pm/projects/:id/members/:memberId
  app.delete('/:id/members/:memberId', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { memberId } = request.params as any

    await prisma.pmProjectMember.updateMany({
      where: { id: memberId, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id: memberId }))
  })

  // -------------------------------------------------------------------------
  // Project Activity Log
  // -------------------------------------------------------------------------
  app.get('/:id/activity', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(50, parseInt(q.limit ?? '20'))

    const [total, activities] = await Promise.all([
      prisma.pmActivityLog.count({ where: { projectId: id, tenantId, deletedAt: null } }),
      prisma.pmActivityLog.findMany({
        where: { projectId: id, tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return reply.send(buildSuccessResponse(activities, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })
}
