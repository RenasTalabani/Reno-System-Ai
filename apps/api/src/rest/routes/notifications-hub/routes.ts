import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [templates, sentToday, failed] = await Promise.all([
      prisma.ntfTemplate.count({ where: { tenantId, isActive: true } }),
      prisma.ntfLog.count({ where: { tenantId, status: 'sent', sentAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.ntfLog.count({ where: { tenantId, status: 'failed' } }),
    ])
    const deliveryRate = sentToday + failed > 0 ? Math.round((sentToday / (sentToday + failed)) * 100) : 100
    return { success: true, data: { activeTemplates: templates, sentToday, failedCount: failed, deliveryRate } }
  })

  app.get('/templates', async (req) => {
    const { tenantId } = req
    const templates = await prisma.ntfTemplate.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: templates }
  })

  app.post('/templates', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const tmpl = await prisma.ntfTemplate.create({ data: { tenantId, ...data } as never })
    return { success: true, data: tmpl }
  })

  app.patch('/templates/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const tmpl = await prisma.ntfTemplate.update({ where: { id }, data: data as never })
    return { success: true, data: tmpl }
  })

  app.post('/send', async (req) => {
    const { tenantId } = req
    const { templateId, recipient, variables } = req.body as { templateId?: string; recipient: string; variables?: Record<string, string> }
    let subject: string | undefined
    let body = ''
    let channel = 'email'
    if (templateId) {
      const tmpl = await prisma.ntfTemplate.findUnique({ where: { id: templateId } })
      if (tmpl) {
        channel = tmpl.channel
        subject = tmpl.subject ?? undefined
        body = tmpl.body
        if (variables) {
          Object.entries(variables).forEach(([k, v]) => { body = body.split('{{' + k + '}}').join(v) })
        }
      }
    }
    const log = await prisma.ntfLog.create({
      data: { tenantId, templateId: templateId ?? null, channel, recipient, subject, body, status: 'sent', sentAt: new Date() },
    })
    return { success: true, data: log }
  })

  app.get('/logs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.channel) where.channel = q.channel
    const logs = await prisma.ntfLog.findMany({
      where: where as never,
      include: { template: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: logs }
  })
}