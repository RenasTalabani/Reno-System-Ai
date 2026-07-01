import type { FastifyInstance } from 'fastify'
import { cspRoutes } from './routes.js'

export async function cspModuleRoutes(app: FastifyInstance) {
  await app.register(cspRoutes, { prefix: '/csp' })
}
