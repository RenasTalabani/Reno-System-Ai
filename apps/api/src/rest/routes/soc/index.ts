import { FastifyInstance } from 'fastify'
import { socRoutes } from './routes.js'

export async function socModuleRoutes(app: FastifyInstance) {
  await app.register(socRoutes, { prefix: '/soc' })
}
