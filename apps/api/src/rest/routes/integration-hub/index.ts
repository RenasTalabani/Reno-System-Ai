import type { FastifyInstance } from 'fastify'
import { integrationHubRoutes, webhookReceiverRoutes } from './routes.js'

export async function integrationHubModuleRoutes(app: FastifyInstance) {
  await app.register(integrationHubRoutes, { prefix: '/integration-hub' })
  await app.register(webhookReceiverRoutes, { prefix: '/integration-hub' })
}
