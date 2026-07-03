import { FastifyInstance } from 'fastify'
import { pluginsRoutes } from './routes.js'

export async function pluginsModuleRoutes(app: FastifyInstance) {
  await app.register(pluginsRoutes, { prefix: '/plugins-marketplace' })
}
