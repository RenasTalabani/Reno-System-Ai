import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function aiStudioRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/workflows', async (req) => {
    const { tenantId } = req
    const workflows = await prisma.aiStudioWorkflow.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } })
    return { success: true, data: workflows }
  })

  app.post('/workflows', async (req) => {
    const { tenantId, id: createdBy } = req.user as { tenantId: string; id: string }
    const data = req.body as Record<string, unknown>
    const wf = await prisma.aiStudioWorkflow.create({ data: { tenantId, createdBy, ...data } as never })
    return { success: true, data: wf }
  })

  app.get('/workflows/:id', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const wf = await prisma.aiStudioWorkflow.findFirst({ where: { id, tenantId }, include: { runs: { take: 10, orderBy: { startedAt: 'desc' } } } })
    return { success: true, data: wf }
  })

  app.put('/workflows/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const wf = await prisma.aiStudioWorkflow.update({ where: { id }, data: data as never })
    return { success: true, data: wf }
  })

  app.post('/workflows/:id/activate', async (req) => {
    const { id } = req.params as { id: string }
    const wf = await prisma.aiStudioWorkflow.update({ where: { id }, data: { isActive: true, status: 'active' } })
    return { success: true, data: wf }
  })

  app.post('/workflows/:id/deactivate', async (req) => {
    const { id } = req.params as { id: string }
    const wf = await prisma.aiStudioWorkflow.update({ where: { id }, data: { isActive: false, status: 'draft' } })
    return { success: true, data: wf }
  })

  app.post('/workflows/:id/run', async (req) => {
    const { tenantId, id: triggeredBy } = req.user as { tenantId: string; id: string }
    const { id: workflowId } = req.params as { id: string }
    const { input } = req.body as { input?: Record<string, unknown> }
    const run = await prisma.aiStudioRun.create({
      data: { tenantId, workflowId, triggeredBy, input: input ?? {}, status: 'running', startedAt: new Date() },
    })
    await prisma.aiStudioWorkflow.update({ where: { id: workflowId }, data: { lastRunAt: new Date(), runCount: { increment: 1 } } })
    setTimeout(async () => {
      await prisma.aiStudioRun.update({ where: { id: run.id }, data: { status: 'completed', finishedAt: new Date(), durationMs: 1200 } })
    }, 1200)
    return { success: true, data: run }
  })

  app.get('/runs', async (req) => {
    const { tenantId } = req
    const runs = await prisma.aiStudioRun.findMany({ where: { tenantId }, include: { workflow: { select: { name: true } } }, orderBy: { startedAt: 'desc' }, take: 50 })
    return { success: true, data: runs }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, active, runsToday] = await Promise.all([
      prisma.aiStudioWorkflow.count({ where: { tenantId } }),
      prisma.aiStudioWorkflow.count({ where: { tenantId, isActive: true } }),
      prisma.aiStudioRun.count({ where: { tenantId, startedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    ])
    return { success: true, data: { total, active, runsToday } }
  })
}


