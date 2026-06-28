import type { FastifyInstance } from 'fastify'
import { cdpRoutes } from './cdp.routes.js'

export async function cdpModuleRoutes(app: FastifyInstance) {
  await app.register(cdpRoutes, { prefix: '' })
}
