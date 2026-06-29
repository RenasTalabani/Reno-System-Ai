import type { FastifyInstance } from 'fastify'
import { fleetRoutes } from './routes.js'

export async function fleetModuleRoutes(app: FastifyInstance) {
  await app.register(fleetRoutes)
}
