import { FastifyInstance } from 'fastify'
import { multiRegionRoutes } from './routes.js'

export async function multiRegionModuleRoutes(app: FastifyInstance) {
  await app.register(multiRegionRoutes, { prefix: '/multi-region' })
}
