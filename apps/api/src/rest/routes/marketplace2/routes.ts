import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function marketplace2Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [apps, installs, plugins, reviews] = await Promise.all([
      prisma.mktApp.count({ where: { isPublished: true } }),
      prisma.mktInstall.count({ where: { tenantId } }),
      prisma.mktPlugin.count({ where: { status: 'published' } }),
      prisma.mktReview.count({ where: { tenantId } }),
    ])
    return { success: true, data: { availableApps: apps, installedApps: installs, availablePlugins: plugins, myReviews: reviews } }
  })

  app.get('/apps', async (req) => {
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { isPublished: true }
    if (q.category) where.category = q.category
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' }
    const apps = await prisma.mktApp.findMany({
      where: where as never,
      orderBy: { installs: 'desc' },
      take: 50,
    })
    return { success: true, data: apps }
  })

  app.get('/apps/:id', async (req) => {
    const { id } = req.params as { id: string }
    const app2 = await prisma.mktApp.findUnique({ where: { id } })
    return { success: true, data: app2 }
  })

  app.post('/apps/:id/install', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    const existing = await prisma.mktInstall.findFirst({ where: { tenantId, appId: id } })
    if (existing) return { success: false, error: 'Already installed' }
    const install = await prisma.mktInstall.create({ data: { tenantId, appId: id, installedBy: userId } as never })
    await prisma.mktApp.update({ where: { id }, data: { installs: { increment: 1 } } })
    return { success: true, data: install }
  })

  app.get('/installed', async (req) => {
    const { tenantId } = req
    const installs = await prisma.mktInstall.findMany({
      where: { tenantId },
      include: { app: true },
      orderBy: { installedAt: 'desc' },
    })
    return { success: true, data: installs }
  })

  app.get('/plugins', async (req) => {
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { status: 'published' }
    if (q.category) where.category = q.category
    const plugins = await prisma.mktPlugin.findMany({
      where: where as never,
      include: { developer: { select: { companyName: true } } },
      orderBy: { installCount: 'desc' },
      take: 50,
    })
    return { success: true, data: plugins }
  })

  app.post('/reviews', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const review = await prisma.mktReview.create({ data: { tenantId, userId, ...data } as never })
    return { success: true, data: review }
  })
}