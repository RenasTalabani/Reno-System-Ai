import type { FastifyInstance } from 'fastify'
import { resilienceRoutes } from './routes.js'

export async function resilienceModuleRoutes(app: FastifyInstance) {
  await app.register(resilienceRoutes, { prefix: '/resilience' })
}
