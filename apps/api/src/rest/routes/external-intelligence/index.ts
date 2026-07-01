import type { FastifyInstance } from 'fastify'
import { externalIntelligenceRoutes } from './routes.js'

export async function externalIntelligenceModuleRoutes(app: FastifyInstance) {
  await app.register(externalIntelligenceRoutes, { prefix: '/external-intelligence' })
}
