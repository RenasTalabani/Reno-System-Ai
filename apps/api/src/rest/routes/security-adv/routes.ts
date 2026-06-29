import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

export async function secAdvRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/sessions', auth, async (req) => {
    const { tenantId, id: userId } = req.user as { tenantId: string; id: string }
    const sessions = await prisma.secSession.findMany({ where: { tenantId, userId, revokedAt: null }, orderBy: { lastActiveAt: 'desc' } })
    return { success: true, data: sessions }
  })

  app.delete('/sessions/:id', auth, async (req) => {
    const { id } = req.params as { id: string }
    await prisma.secSession.update({ where: { id }, data: { revokedAt: new Date() } })
    return { success: true }
  })

  app.get('/2fa/status', auth, async (req) => {
    const { tenantId, id: userId } = req.user as { tenantId: string; id: string }
    const record = await prisma.secTwoFaSecret.findUnique({ where: { tenantId_userId: { tenantId, userId } } })
    return { success: true, data: { enabled: record?.isEnabled ?? false } }
  })

  app.get('/ip-rules', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const rules = await prisma.secIpRule.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: rules }
  })

  app.post('/ip-rules', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const data = req.body as Record<string, unknown>
    const rule = await prisma.secIpRule.create({ data: { tenantId, ...data } as never })
    return { success: true, data: rule }
  })

  app.delete('/ip-rules/:id', auth, async (req) => {
    const { id } = req.params as { id: string }
    await prisma.secIpRule.delete({ where: { id } })
    return { success: true }
  })

  app.get('/summary', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const [activeSessions, ipRules, twoFaEnabled] = await Promise.all([
      prisma.secSession.count({ where: { tenantId, revokedAt: null } }),
      prisma.secIpRule.count({ where: { tenantId, isActive: true } }),
      prisma.secTwoFaSecret.count({ where: { tenantId, isEnabled: true } }),
    ])
    return { success: true, data: { activeSessions, ipRules, twoFaEnabled } }
  })
}
