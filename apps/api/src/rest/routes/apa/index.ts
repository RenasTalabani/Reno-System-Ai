import type { FastifyInstance } from 'fastify'
import { apaRoutes } from './routes.js'

export async function apaModuleRoutes(app: FastifyInstance) {
  await app.register(apaRoutes, { prefix: '/apa' })
}
