import type { FastifyInstance } from 'fastify'
import { lciRoutes } from './routes.js'

export async function lciModuleRoutes(app: FastifyInstance) {
  await app.register(lciRoutes, { prefix: '/lci' })
}
