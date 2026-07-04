import { FastifyInstance } from 'fastify'
import { explainabilityRoutes } from './routes.js'

export async function explainabilityModuleRoutes(app: FastifyInstance) {
  await app.register(explainabilityRoutes, { prefix: '/explainability' })
}
