import { FastifyInstance } from 'fastify'
import { licensingRoutes } from './routes.js'

export async function licensingModuleRoutes(app: FastifyInstance) {
  await app.register(licensingRoutes, { prefix: '/licensing' })
}
