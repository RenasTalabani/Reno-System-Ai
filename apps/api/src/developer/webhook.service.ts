import { prisma } from '@reno/database'
import crypto from 'node:crypto'

export type WebhookEventType =
  | 'user.created' | 'user.updated' | 'user.deleted'
  | 'tenant.created' | 'tenant.updated'
  | 'invoice.created' | 'invoice.paid' | 'invoice.overdue'
  | 'ticket.created' | 'ticket.resolved' | 'ticket.escalated'
  | 'employee.created' | 'employee.terminated'
  | 'leave.requested' | 'leave.approved' | 'leave.rejected'
  | 'backup.completed' | 'backup.failed'
  | 'deployment.completed' | 'deployment.failed' | 'deployment.rolledback'
  | 'dr.readiness_changed' | 'ai_sre.incident_detected'

export function signPayload(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export async function dispatchWebhookEvent(
  tenantId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.devWebhook.findMany({
    where: { tenantId, isActive: true },
  })

  const payload = {
    id: crypto.randomUUID(),
    event: eventType,
    tenantId,
    data,
    timestamp: new Date().toISOString(),
  }
  const body = JSON.stringify(payload)

  await Promise.allSettled(
    webhooks
      .filter((wh) => {
        const events = wh.events as string[]
        return events.length === 0 || events.includes(eventType) || events.includes('*')
      })
      .map((wh) => deliverWebhook(wh.id, wh.url, wh.secret, eventType, body, payload)),
  )
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secretHash: string,
  eventType: string,
  body: string,
  payload: unknown,
  attempt = 1,
): Promise<void> {
  const sig = signPayload(secretHash, body)
  let statusCode: number | undefined
  let responseBody: string | undefined
  let success = false

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Reno-Signature': `sha256=${sig}`,
        'X-Reno-Event': eventType,
        'User-Agent': 'Reno-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    statusCode = res.status
    responseBody = (await res.text()).slice(0, 2000)
    success = res.ok
  } catch (err) {
    responseBody = err instanceof Error ? err.message : String(err)
  }

  await prisma.devWebhookDelivery.create({
    data: {
      webhookId,
      eventType,
      payload: payload as never,
      statusCode,
      responseBody,
      attemptCount: attempt,
      success,
    },
  })

  if (!success) {
    await prisma.devWebhook.update({
      where: { id: webhookId },
      data: { failureCount: { increment: 1 } },
    })
    // Disable after 50 consecutive failures
    const wh = await prisma.devWebhook.findUnique({ where: { id: webhookId }, select: { failureCount: true } })
    if ((wh?.failureCount ?? 0) >= 50) {
      await prisma.devWebhook.update({ where: { id: webhookId }, data: { isActive: false } })
    }
  } else {
    await prisma.devWebhook.update({
      where: { id: webhookId },
      data: { failureCount: 0, lastDeliveryAt: new Date() },
    })
  }
}

export function hashWebhookSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('base64url')}`
}
