import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function publishingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalTitles, published, inProduction] = await Promise.all([
      prisma.pubTitle.count({ where: { tenantId } }),
      prisma.pubTitle.count({ where: { tenantId, status: 'published' } }),
      prisma.pubPrintRun.count({ where: { title: { tenantId }, status: 'printing' } }),
    ])
    return { success: true, data: { totalTitles, published, inProduction } }
  })

  app.get('/titles', async (req) => {
    const { tenantId } = req
    const titles = await prisma.pubTitle.findMany({
      where: { tenantId },
      include: { _count: { select: { printRuns: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: titles }
  })

  app.post('/titles', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const title = await prisma.pubTitle.create({ data: { tenantId, ...data } as never })
    return { success: true, data: title }
  })

  app.post('/titles/:id/print-runs', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const run = await prisma.pubPrintRun.create({ data: { titleId: id, ...data } as never })
    return { success: true, data: run }
  })

  app.patch('/titles/:id/publish', async (req) => {
    const { id } = req.params as { id: string }
    const title = await prisma.pubTitle.update({ where: { id }, data: { status: 'published', publishedDate: new Date() } })
    return { success: true, data: title }
  })
}
