import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function taskBoardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [boards, openTasks, completedTasks, activeSprints] = await Promise.all([
      prisma.tskBoard.count({ where: { tenantId, isActive: true } }),
      prisma.tskTask.count({ where: { board: { tenantId }, completedAt: null } }),
      prisma.tskTask.count({ where: { board: { tenantId }, completedAt: { not: null } } }),
      prisma.tskSprint.count({ where: { board: { tenantId }, status: 'active' } }),
    ])
    return { success: true, data: { boards, openTasks, completedTasks, activeSprints } }
  })

  app.get('/boards', async (req) => {
    const { tenantId } = req
    const boards = await prisma.tskBoard.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { tasks: true, columns: true, sprints: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: boards }
  })

  app.post('/boards', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const board = await prisma.tskBoard.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: board }
  })

  app.get('/boards/:id', async (req) => {
    const { id } = req.params as { id: string }
    const board = await prisma.tskBoard.findUnique({
      where: { id },
      include: {
        columns: { orderBy: { order: 'asc' } },
        sprints: { where: { status: { in: ['planned', 'active'] } }, orderBy: { startsAt: 'asc' } },
        tasks: { include: { column: { select: { name: true } } }, orderBy: [{ columnId: 'asc' }, { order: 'asc' }], take: 200 },
      },
    })
    return { success: true, data: board }
  })

  app.post('/boards/:id/columns', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const col = await prisma.tskColumn.create({ data: { boardId: id, ...data } as never })
    return { success: true, data: col }
  })

  app.post('/boards/:id/sprints', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const sprint = await prisma.tskSprint.create({ data: { boardId: id, ...data } as never })
    return { success: true, data: sprint }
  })

  app.post('/tasks', async (req) => {
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const task = await prisma.tskTask.create({ data: { reporterId: userId, ...data } as never })
    return { success: true, data: task }
  })

  app.patch('/tasks/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const task = await prisma.tskTask.update({ where: { id }, data: data as never })
    return { success: true, data: task }
  })

  app.patch('/tasks/:id/complete', async (req) => {
    const { id } = req.params as { id: string }
    const task = await prisma.tskTask.update({ where: { id }, data: { completedAt: new Date() } })
    return { success: true, data: task }
  })

  app.patch('/tasks/:id/move', async (req) => {
    const { id } = req.params as { id: string }
    const { columnId, order } = req.body as { columnId: string; order?: number }
    const task = await prisma.tskTask.update({ where: { id }, data: { columnId, order: order ?? 0 } })
    return { success: true, data: task }
  })
}