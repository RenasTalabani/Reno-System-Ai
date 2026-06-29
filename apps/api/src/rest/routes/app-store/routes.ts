import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function appStoreRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/apps', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const apps = await prisma.mktApp.findMany({
      where: { tenantId, ...(q.category ? { category: q.category } : {}), ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as never } } : {}) },
      include: { installedBy: { where: { tenantId }, select: { id: true, status: true } } },
      orderBy: { installs: 'desc' },
    })
    return { success: true, data: apps }
  })

  app.post('/apps', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const app2 = await prisma.mktApp.create({ data: { tenantId, ...data } as never })
    return { success: true, data: app2 }
  })

  app.post('/apps/:id/install', async (req) => {
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

  app.delete('/apps/:id/install', async (req) => {
    const { tenantId } = req
    const { id: appId } = req.params as { id: string }
    await prisma.mktInstall.update({ where: { tenantId_appId: { tenantId, appId } }, data: { status: 'uninstalled' } })
    return { success: true }
  })

  app.get('/installed', async (req) => {
    const { tenantId } = req
    const installs = await prisma.mktInstall.findMany({ where: { tenantId, status: 'active' }, include: { app: true } })
    return { success: true, data: installs }
  })
}


