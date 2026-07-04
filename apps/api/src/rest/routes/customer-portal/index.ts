import { FastifyInstance } from 'fastify'
import { customerPortalRoutes } from './routes.js'

export async function customerPortalModuleRoutes(app: FastifyInstance) {
  await app.register(customerPortalRoutes, { prefix: '/customer-portal' })
}
