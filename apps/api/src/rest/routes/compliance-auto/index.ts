import { FastifyInstance } from 'fastify'
import { complianceAutoRoutes } from './routes.js'

export async function complianceAutoModuleRoutes(app: FastifyInstance) {
  await app.register(complianceAutoRoutes, { prefix: '/compliance-auto' })
}
