import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function secAdvRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/sessions', async (req) => {
    const { tenantId, id: userId } = req.user as { tenantId: string; id: string }
    const sessions = await prisma.secSession.findMany({ where: { tenantId, userId, revokedAt: null }, orderBy: { lastActiveAt: 'desc' } })
    return { success: true, data: sessions }
  })

  app.delete('/sessions/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.secSession.update({ where: { id }, data: { revokedAt: new Date() } })
    return { success: true }
  })

  app.get('/2fa/status', async (req) => {
    const { tenantId, id: userId } = req.user as { tenantId: string; id: string }
    const record = await prisma.secTwoFaSecret.findUnique({ where: { tenantId_userId: { tenantId, userId } } })
    return { success: true, data: { enabled: record?.isEnabled ?? false } }
  })

  app.get('/ip-rules', async (req) => {
    const { tenantId } = req
    const rules = await prisma.secIpRule.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: rules }
  })

  app.post('/ip-rules', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const rule = await prisma.secIpRule.create({ data: { tenantId, ...data } as never })
    return { success: true, data: rule }
  })

  app.delete('/ip-rules/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.secIpRule.delete({ where: { id } })
    return { success: true }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeSessions, ipRules, twoFaEnabled] = await Promise.all([
      prisma.secSession.count({ where: { tenantId, revokedAt: null } }),
      prisma.secIpRule.count({ where: { tenantId, isActive: true } }),
      prisma.secTwoFaSecret.count({ where: { tenantId, isEnabled: true } }),
    ])
    return { success: true, data: { activeSessions, ipRules, twoFaEnabled } }
  })
}


