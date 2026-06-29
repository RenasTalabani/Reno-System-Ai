import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function etlRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [connectors, activeJobs, failedJobs] = await Promise.all([
      prisma.etlConnector.count({ where: { tenantId, status: 'active' } }),
      prisma.etlJob.count({ where: { connector: { tenantId }, status: 'running' } }),
      prisma.etlJob.count({ where: { connector: { tenantId }, lastRunStatus: 'failed' } }),
    ])
    return { success: true, data: { activeConnectors: connectors, activeJobs, failedJobs } }
  })

  app.get('/connectors', async (req) => {
    const { tenantId } = req
    const connectors = await prisma.etlConnector.findMany({
      where: { tenantId },
      include: { _count: { select: { jobs: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: connectors }
  })

  app.post('/connectors', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const connector = await prisma.etlConnector.create({ data: { tenantId, ...data } as never })
    return { success: true, data: connector }
  })

  app.patch('/connectors/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const connector = await prisma.etlConnector.update({ where: { id }, data: data as never })
    return { success: true, data: connector }
  })

  app.get('/jobs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { connector: { tenantId } }
    if (q.connectorId) where.connectorId = q.connectorId
    const jobs = await prisma.etlJob.findMany({
      where: where as never,
      include: { connector: { select: { name: true, type: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })
    return { success: true, data: jobs }
  })

  app.post('/jobs', async (req) => {
    const data = req.body as Record<string, unknown>
    const job = await prisma.etlJob.create({ data: data as never })
    return { success: true, data: job }
  })

  app.post('/jobs/:id/run', async (req) => {
    const { id } = req.params as { id: string }
    const job = await prisma.etlJob.update({
      where: { id },
      data: { status: 'running', lastRunAt: new Date(), lastRunStatus: null, errorMessage: null },
    })
    return { success: true, data: job }
  })

  app.patch('/jobs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const job = await prisma.etlJob.update({ where: { id }, data: data as never })
    return { success: true, data: job }
  })
}
