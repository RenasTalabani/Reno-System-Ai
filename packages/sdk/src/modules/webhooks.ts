import type { RenoClient } from '../client.js'

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  failureCount: number
  lastDeliveryAt: string | null
  createdAt: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  eventType: string
  statusCode: number | null
  success: boolean
  attemptCount: number
  deliveredAt: string
}

export interface CreateWebhookRequest {
  name: string
  url: string
  events?: string[]
}

export class WebhooksModule {
  constructor(private client: RenoClient) {}

  list(): Promise<{ webhooks: Webhook[] }> {
    return this.client.get('/developer/webhooks')
  }

  create(data: CreateWebhookRequest): Promise<Webhook & { secret: string; warning: string }> {
    return this.client.post('/developer/webhooks', data)
  }

  update(id: string, data: Partial<{ isActive: boolean; events: string[]; name: string }>): Promise<{ updated: boolean }> {
    return this.client.patch(`/developer/webhooks/${id}`, data)
  }

  delete(id: string): Promise<{ deleted: boolean }> {
    return this.client.delete(`/developer/webhooks/${id}`)
  }

  deliveries(id: string, limit = 20): Promise<{ deliveries: WebhookDelivery[] }> {
    return this.client.get(`/developer/webhooks/${id}/deliveries`, { limit })
  }

  test(id: string): Promise<{ tested: boolean; statusCode: number; success: boolean }> {
    return this.client.post(`/developer/webhooks/${id}/test`)
  }
}
