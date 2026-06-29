import type { FastifyInstance } from 'fastify'
import { travelRoutes } from './routes.js'

export async function travelModuleRoutes(app: FastifyInstance) {
  await app.register(travelRoutes)
}
