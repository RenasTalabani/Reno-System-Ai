import type { FastifyInstance } from 'fastify'
import { webhookRoutes } from './routes.js'

export async function webhooksModuleRoutes(app: FastifyInstance) {
  await app.register(webhookRoutes, { prefix: '/webhooks' })
}
