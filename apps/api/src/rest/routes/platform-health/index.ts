import type { FastifyInstance } from 'fastify'
import { platformHealthRoutes } from './routes.js'

export async function platformHealthModuleRoutes(app: FastifyInstance) {
  await app.register(platformHealthRoutes)
}