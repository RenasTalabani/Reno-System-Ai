import type { FastifyInstance } from 'fastify'
import { searchRoutes } from './search.routes.js'

export async function globalSearchRoutes(app: FastifyInstance) {
  await app.register(searchRoutes, { prefix: '' })
}
