import { FastifyInstance } from 'fastify'
import { extensionsRoutes } from './routes.js'

export async function extensionsModuleRoutes(app: FastifyInstance) {
  await app.register(extensionsRoutes, { prefix: '/extensions-store' })
}
