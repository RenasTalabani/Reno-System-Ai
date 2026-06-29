import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function identityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [providers, sessions, scimTokens, groups] = await Promise.all([
      prisma.ssoProvider.count({ where: { tenantId, isEnabled: true } }),
      prisma.ssoSession.count({ where: { tenantId } }),
      prisma.scimToken.count({ where: { tenantId, isActive: true } }),
      prisma.dirGroup.count({ where: { tenantId } }),
    ])
    return { success: true, data: { enabledProviders: providers, activeSessions: sessions, scimTokens, directoryGroups: groups } }
  })

  app.get('/providers', async (req) => {
    const { tenantId } = req
    const providers = await prisma.ssoProvider.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: providers }
  })

  app.post('/providers', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const provider = await prisma.ssoProvider.create({ data: { tenantId, ...data } as never })
    return { success: true, data: provider }
  })

  app.patch('/providers/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const provider = await prisma.ssoProvider.update({ where: { id }, data: data as never })
    return { success: true, data: provider }
  })

  app.get('/sessions', async (req) => {
    const { tenantId } = req
    const sessions = await prisma.ssoSession.findMany({
      where: { tenantId },
      include: { provider: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: sessions }
  })

  app.get('/scim/tokens', async (req) => {
    const { tenantId } = req
    const tokens = await prisma.scimToken.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: tokens }
  })

  app.post('/scim/tokens', async (req) => {
    const { tenantId } = req
    const { name, expiresAt } = req.body as { name: string; expiresAt?: string }
    const rawToken = 'scim_' + Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18)
    const tokenHash = Buffer.from(rawToken).toString('base64')
    const token = await prisma.scimToken.create({ data: { tenantId, name, tokenHash, expiresAt: expiresAt ? new Date(expiresAt) : null } as never })
    return { success: true, data: { ...token, rawToken } }
  })

  app.get('/groups', async (req) => {
    const { tenantId } = req
    const groups = await prisma.dirGroup.findMany({ where: { tenantId }, orderBy: { name: 'asc' } })
    return { success: true, data: groups }
  })

  app.post('/groups', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const group = await prisma.dirGroup.create({ data: { tenantId, ...data } as never })
    return { success: true, data: group }
  })

  app.get('/audit-logs', async (req) => {
    const { tenantId } = req
    const logs = await prisma.ssoAuditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: logs }
  })
}