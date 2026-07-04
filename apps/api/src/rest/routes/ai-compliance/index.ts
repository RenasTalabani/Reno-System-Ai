import { FastifyInstance } from 'fastify'
import { aiComplianceRoutes } from './routes.js'

export async function aiComplianceModuleRoutes(app: FastifyInstance) {
  await app.register(aiComplianceRoutes, { prefix: '/ai-compliance' })
}
