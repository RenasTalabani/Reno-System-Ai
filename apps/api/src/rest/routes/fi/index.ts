import type { FastifyInstance } from 'fastify'
import { fiRoutes } from './routes.js'

export async function fiModuleRoutes(app: FastifyInstance) {
  await app.register(fiRoutes, { prefix: '/fi' })
}
