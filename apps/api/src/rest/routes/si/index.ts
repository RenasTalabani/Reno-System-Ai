import type { FastifyInstance } from 'fastify'
import { siRoutes } from './routes.js'

export async function siModuleRoutes(app: FastifyInstance) {
  await app.register(siRoutes, { prefix: '/si' })
}
