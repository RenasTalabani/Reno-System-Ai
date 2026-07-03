import { FastifyInstance } from 'fastify'
import { publicApiRoutes } from './routes.js'

export async function publicApiModuleRoutes(app: FastifyInstance) {
  await app.register(publicApiRoutes, { prefix: '/public-api' })
}
