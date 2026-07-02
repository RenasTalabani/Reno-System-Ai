import type { FastifyInstance } from 'fastify'
import { hriRoutes } from './routes.js'

export async function hriModuleRoutes(app: FastifyInstance) {
  await app.register(hriRoutes, { prefix: '/hri' })
}
