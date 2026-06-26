export { RenoClient, RenoApiError } from './client.js'
export type { RenoClientOptions, PaginatedResponse } from './client.js'

export { AuthModule } from './modules/auth.js'
export type { LoginRequest, LoginResponse, RefreshResponse } from './modules/auth.js'

export { BrainModule } from './modules/brain.js'
export type { BrainQueryRequest, BrainQueryResponse, BrainInsight } from './modules/brain.js'

export { WebhooksModule } from './modules/webhooks.js'
export type { Webhook, WebhookDelivery, CreateWebhookRequest } from './modules/webhooks.js'

import { RenoClient, type RenoClientOptions } from './client.js'
import { AuthModule } from './modules/auth.js'
import { BrainModule } from './modules/brain.js'
import { WebhooksModule } from './modules/webhooks.js'

/**
 * Full Reno SDK client with all modules pre-attached.
 *
 * @example
 * ```ts
 * const reno = createRenoClient({ baseUrl: 'https://api.reno.app', apiKey: 'reno_...' })
 * const insights = await reno.brain.getInsights()
 * ```
 */
export function createRenoClient(options: RenoClientOptions) {
  const client = new RenoClient(options)
  return {
    client,
    auth: new AuthModule(client),
    brain: new BrainModule(client),
    webhooks: new WebhooksModule(client),
  }
}
