import type { FastifyInstance } from 'fastify'
import { marketingRoutes } from './marketing.routes.js'

export async function mktRoutes(app: FastifyInstance) {
  await app.register(marketingRoutes, { prefix: '' })
}
