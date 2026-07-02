import type { FastifyInstance } from 'fastify'
import { sciRoutes } from './routes.js'

export async function sciModuleRoutes(app: FastifyInstance) {
  await app.register(sciRoutes, { prefix: '/sci' })
}
