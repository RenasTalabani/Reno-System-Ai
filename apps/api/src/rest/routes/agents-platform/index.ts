import type { FastifyInstance } from 'fastify'
import { agentsPlatformRoutes } from './routes.js'

export async function agentsPlatformModuleRoutes(app: FastifyInstance) {
  await app.register(agentsPlatformRoutes, { prefix: '/agents-platform' })
}
