import type { FastifyInstance } from 'fastify'
import { vendorRoutes } from './vendors.routes.js'

export async function vendorModuleRoutes(app: FastifyInstance) {
  await app.register(vendorRoutes, { prefix: '' })
}
