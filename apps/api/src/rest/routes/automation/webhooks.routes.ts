import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { runWorkflow } from '../../../automation/engine.js'
import { randomBytes } from 'crypto'

export async function autoWebhookRoutes(app: FastifyInstance) {
  // GET /automation/webhooks
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const webhooks = await prisma.autoWebhook.findMany({
      where: { tenantId, isActive: true },
      include: { workflow: { select: { name: true, slug: true, isEnabled: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Mask tokens — show only last 8 chars
    const masked = webhooks.map(w => ({
      ...w,
      token: `...${w.token.slice(-8)}`,
      webhookUrl: `/api/v1/automation/hook/${w.token}`,
    }))

    return reply.send({ success: true, data: masked })
  })

  // POST /automation/webhooks
  app.post('/', async (req, reply) => {
    const { tenantId } = req as any
    const { workflowId, name } = req.body as any

    const workflow = await prisma.autoWorkflow.findFirst({ where: { id: workflowId, tenantId, deletedAt: null } })
    if (!workflow) return reply.code(404).send({ success: false, error: 'Workflow not found' })

    const token = randomBytes(32).toString('hex')

    const webhook = await prisma.autoWebhook.create({
      data: { tenantId, workflowId, name, token, isActive: true },
    })

    return reply.code(201).send({
      success: true,
      data: { id: webhook.id, name: webhook.name, token, webhookUrl: `/api/v1/automation/hook/${token}` },
    })
  })

  // DELETE /automation/webhooks/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    await prisma.autoWebhook.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    })

    return reply.send({ success: true })
  })

  // POST /automation/hook/:token — public webhook endpoint (no auth required)
  app.post('/hook/:token', { config: { skipAuth: true } } as any, async (req, reply) => {
    const { token } = req.params as any
    const payload = req.body ?? {}

    const webhook = await prisma.autoWebhook.findFirst({
      where: { token, isActive: true },
      include: { workflow: true },
    })
    if (!webhook) return reply.code(404).send({ success: false, error: 'Webhook not found' })
    if (!webhook.workflow.isEnabled) return reply.code(400).send({ success: false, error: 'Workflow is disabled' })

    await prisma.autoWebhook.update({
      where: { id: webhook.id },
      data: { lastCalledAt: new Date(), callCount: { increment: 1 } },
    })

    const result = await runWorkflow(webhook.workflowId, 'webhook', 'webhook', payload, webhook.tenantId)

    return reply.send({ success: true, data: result })
  })
}
