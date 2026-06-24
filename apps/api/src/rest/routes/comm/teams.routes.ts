import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function commTeamRoutes(app: FastifyInstance) {
  // GET /comm/teams
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { page = 1, limit = 50 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const [teams, total] = await Promise.all([
      prisma.commTeam.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          _count: { select: { members: true, channels: true } },
          members: { where: { userId }, take: 1 },
        },
        orderBy: { name: 'asc' },
        skip, take: Number(limit),
      }),
      prisma.commTeam.count({ where: { tenantId, deletedAt: null } }),
    ])

    return reply.send({ success: true, data: teams, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /comm/teams
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, description, avatarUrl, isPrivate } = req.body as any
    if (!name) return reply.code(400).send({ success: false, error: 'name required' })

    const team = await prisma.commTeam.create({
      data: { tenantId, name, description, avatarUrl, isPrivate: isPrivate ?? false, createdBy: userId },
    })

    await prisma.commTeamMember.create({ data: { tenantId, teamId: team.id, userId, role: 'admin' } })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'comm', entityType: 'CommTeam', entityId: team.id, newValues: { name } } })
    return reply.code(201).send({ success: true, data: team })
  })

  // GET /comm/teams/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const team = await prisma.commTeam.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count: { select: { members: true, channels: true } },
        channels: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
      },
    })
    if (!team) return reply.code(404).send({ success: false, error: 'Team not found' })
    return reply.send({ success: true, data: team })
  })

  // PUT /comm/teams/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { name, description, avatarUrl, isPrivate, isArchived } = req.body as any

    const team = await prisma.commTeam.update({
      where: { id },
      data: { name, description, avatarUrl, isPrivate, isArchived, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'comm', entityType: 'CommTeam', entityId: id, newValues: req.body as any } })
    return reply.send({ success: true, data: team })
  })

  // DELETE /comm/teams/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.commTeam.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'comm', entityType: 'CommTeam', entityId: id, newValues: {} } })
    return reply.send({ success: true, data: { deleted: true } })
  })

  // GET /comm/teams/:id/members
  app.get('/:id/members', async (req, reply) => {
    const { id } = req.params as any
    const members = await prisma.commTeamMember.findMany({
      where: { teamId: id },
      orderBy: { joinedAt: 'asc' },
    })
    return reply.send({ success: true, data: members })
  })

  // POST /comm/teams/:id/members
  app.post('/:id/members', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { userId, role } = req.body as any
    if (!userId) return reply.code(400).send({ success: false, error: 'userId required' })

    const member = await prisma.commTeamMember.upsert({
      where: { teamId_userId: { teamId: id, userId } },
      create: { tenantId, teamId: id, userId, role: role ?? 'member' },
      update: { role: role ?? 'member' },
    })
    return reply.code(201).send({ success: true, data: member })
  })

  // DELETE /comm/teams/:id/members/:userId
  app.delete('/:id/members/:userId', async (req, reply) => {
    const { id, userId } = req.params as any
    await prisma.commTeamMember.deleteMany({ where: { teamId: id, userId } })
    return reply.send({ success: true, data: { removed: true } })
  })
}
