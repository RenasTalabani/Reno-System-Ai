import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function marketingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Templates ──────────────────────────────────────────────────────────────

  app.get('/templates', async (request, reply) => {
    const { tenantId } = request as any
    const templates = await prisma.mktEmailTemplate.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } })
    return reply.send(buildSuccessResponse(templates))
  })

  app.post('/templates', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const t = await prisma.mktEmailTemplate.create({
      data: { tenantId, createdBy: userId, name: body.name, subject: body.subject, htmlBody: body.htmlBody ?? '', textBody: body.textBody, category: body.category ?? 'general', tags: body.tags ?? [] },
    })
    return reply.status(201).send(buildSuccessResponse(t))
  })

  app.put('/templates/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.mktEmailTemplate.updateMany({ where: { id, tenantId }, data: body })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Template not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  app.delete('/templates/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.mktEmailTemplate.deleteMany({ where: { id, tenantId } })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // ── Campaigns ──────────────────────────────────────────────────────────────

  app.get('/campaigns', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    const campaigns = await prisma.mktCampaign.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { sends: true } } } })
    return reply.send(buildSuccessResponse(campaigns))
  })

  app.post('/campaigns', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const campaign = await prisma.mktCampaign.create({
      data: { tenantId, createdBy: userId, name: body.name, subject: body.subject, templateId: body.templateId, fromName: body.fromName ?? 'Reno', fromEmail: body.fromEmail ?? 'noreply@reno.app', replyTo: body.replyTo, htmlBody: body.htmlBody, textBody: body.textBody, segmentIds: body.segmentIds ?? [] },
    })
    return reply.status(201).send(buildSuccessResponse(campaign))
  })

  app.put('/campaigns/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const campaign = await prisma.mktCampaign.findFirst({ where: { id, tenantId } })
    if (!campaign) throw new RenoError(ErrorCode.NOT_FOUND, 'Campaign not found', 404)
    if (campaign.status === 'sent') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Cannot edit a sent campaign', 400)
    const updated = await prisma.mktCampaign.update({ where: { id }, data: body })
    return reply.send(buildSuccessResponse(updated))
  })

  // POST /campaigns/:id/send — simulate sending to all segment recipients
  app.post('/campaigns/:id/send', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const campaign = await prisma.mktCampaign.findFirst({ where: { id, tenantId } })
    if (!campaign) throw new RenoError(ErrorCode.NOT_FOUND, 'Campaign not found', 404)
    if (campaign.status === 'sent') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Already sent', 400)

    // Collect recipients from segments
    const segmentIds = campaign.segmentIds as string[]
    let recipients: { email: string; customerId: string }[] = []
    if (segmentIds.length > 0) {
      const members = await prisma.cdpSegmentMember.findMany({
        where: { segmentId: { in: segmentIds } },
        include: { customer: { select: { id: true, email: true } } },
      })
      recipients = members.filter(m => m.customer.email).map(m => ({ email: m.customer.email!, customerId: m.customer.id }))
    } else {
      // Send to all customers
      const customers = await prisma.cdpCustomer.findMany({ where: { tenantId, deletedAt: null, email: { not: null } }, select: { id: true, email: true } })
      recipients = customers.map(c => ({ email: c.email!, customerId: c.id }))
    }

    // Check unsubscribes
    const unsubs = await prisma.mktUnsubscribe.findMany({ where: { tenantId }, select: { email: true } })
    const unsubEmails = new Set(unsubs.map(u => u.email.toLowerCase()))
    const eligible = recipients.filter(r => !unsubEmails.has(r.email.toLowerCase()))

    // Create send records
    if (eligible.length > 0) {
      await prisma.mktCampaignSend.createMany({
        data: eligible.map(r => ({ tenantId, campaignId: id, customerId: r.customerId, email: r.email, status: 'sent', sentAt: new Date() })),
        skipDuplicates: true,
      })
    }

    await prisma.mktCampaign.update({ where: { id }, data: { status: 'sent', sentAt: new Date(), totalRecipients: eligible.length, sentCount: eligible.length } })
    return reply.send(buildSuccessResponse({ sent: true, recipientCount: eligible.length }))
  })

  // GET /campaigns/:id/analytics
  app.get('/campaigns/:id/analytics', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const campaign = await prisma.mktCampaign.findFirst({ where: { id, tenantId } })
    if (!campaign) throw new RenoError(ErrorCode.NOT_FOUND, 'Campaign not found', 404)
    const sends = await prisma.mktCampaignSend.findMany({ where: { campaignId: id } })
    const opened = sends.filter(s => s.openedAt).length
    const clicked = sends.filter(s => s.clickedAt).length
    const bounced = sends.filter(s => s.bouncedAt).length
    const unsub = sends.filter(s => s.unsubscribedAt).length
    const total = sends.length
    return reply.send(buildSuccessResponse({
      total,
      sent: sends.filter(s => s.status === 'sent').length,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      clickRate: total > 0 ? Math.round((clicked / total) * 100) : 0,
      bounceRate: total > 0 ? Math.round((bounced / total) * 100) : 0,
      unsubscribeRate: total > 0 ? Math.round((unsub / total) * 100) : 0,
    }))
  })

  // ── Unsubscribes ───────────────────────────────────────────────────────────

  app.post('/unsubscribe', async (request, reply) => {
    const { tenantId } = request as any
    const { email, reason } = request.body as any
    await prisma.mktUnsubscribe.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: { tenantId, email, reason },
      update: { reason },
    })
    return reply.send(buildSuccessResponse({ unsubscribed: true }))
  })
}
