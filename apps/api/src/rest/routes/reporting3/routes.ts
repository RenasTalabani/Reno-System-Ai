import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function reporting3Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [templates, scheduledTemplates, runs] = await Promise.all([
      prisma.rpt3Template.count({ where: { tenantId, isActive: true } }),
      prisma.rpt3Template.count({ where: { tenantId, isActive: true, schedule: { not: null } } }),
      prisma.rpt3Run.count({ where: { template: { tenantId } } }),
    ])
    return { success: true, data: { activeTemplates: templates, scheduledTemplates, totalRuns: runs } }
  })

  app.get('/templates', async (req) => {
    const { tenantId } = req
    const templates = await prisma.rpt3Template.findMany({
      where: { tenantId },
      include: { _count: { select: { runs: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: templates }
  })

  app.post('/templates', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const template = await prisma.rpt3Template.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: template }
  })

  app.patch('/templates/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const template = await prisma.rpt3Template.update({ where: { id }, data: data as never })
    return { success: true, data: template }
  })

  app.post('/templates/:id/run', async (req) => {
    const { id } = req.params as { id: string }
    const run = await prisma.rpt3Run.create({ data: { templateId: id } as never })
    setTimeout(async () => {
      await prisma.rpt3Run.update({ where: { id: run.id }, data: { status: 'completed', completedAt: new Date(), rowCount: BigInt(Math.floor(Math.random() * 1000)) } })
    }, 2000)
    return { success: true, data: run }
  })

  app.get('/templates/:id/runs', async (req) => {
    const { id } = req.params as { id: string }
    const runs = await prisma.rpt3Run.findMany({
      where: { templateId: id },
      orderBy: { startedAt: 'desc' },
      take: 20,
    })
    return { success: true, data: runs }
  })
}
