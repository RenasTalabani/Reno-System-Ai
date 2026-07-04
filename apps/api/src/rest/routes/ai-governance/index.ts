import { FastifyInstance } from 'fastify'
import { aiGovernanceRoutes } from './routes.js'

export async function aiGovernanceModuleRoutes(app: FastifyInstance) {
  await app.register(aiGovernanceRoutes, { prefix: '/ai-governance' })
}
