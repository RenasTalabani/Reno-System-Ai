import { FastifyInstance } from 'fastify'
import { cdnRoutes } from './routes.js'

export async function cdnModuleRoutes(app: FastifyInstance) {
  await app.register(cdnRoutes, { prefix: '/cdn-edge' })
}
