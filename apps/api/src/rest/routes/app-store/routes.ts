import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

export async function appStoreRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/apps', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const q = req.query as Record<string, string>
    const apps = await prisma.mktApp.findMany({
      where: { tenantId, ...(q.category ? { category: q.category } : {}), ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as never } } : {}) },
      include: { installedBy: { where: { tenantId }, select: { id: true, status: true } } },
      orderBy: { installs: 'desc' },
    })
    return { success: true, data: apps }
  })

  app.post('/apps', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const data = req.body as Record<string, unknown>
    const app2 = await prisma.mktApp.create({ data: { tenantId, ...data } as never })
    return { success: true, data: app2 }
  })

  app.post('/apps/:id/install', auth, async (req) => {
    const { tenantId, id: userId } = req.user as { tenantId: string; id: string }
    const { id: appId } = req.params as { id: string }
    const install = await prisma.mktInstall.upsert({
      where: { tenantId_appId: { tenantId, appId } },
      create: { tenantId, appId, installedBy: userId, status: 'active' },
      update: { status: 'active' },
    })
    await prisma.mktApp.update({ where: { id: appId }, data: { installs: { increment: 1 } } })
    return { success: true, data: install }
  })

  app.delete('/apps/:id/install', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const { id: appId } = req.params as { id: string }
    await prisma.mktInstall.update({ where: { tenantId_appId: { tenantId, appId } }, data: { status: 'uninstalled' } })
    return { success: true }
  })

  app.get('/installed', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const installs = await prisma.mktInstall.findMany({ where: { tenantId, status: 'active' }, include: { app: true } })
    return { success: true, data: installs }
  })
}
