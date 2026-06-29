import type { FastifyInstance } from 'fastify'
import { facilityRoutes } from './routes.js'

export async function facilityModuleRoutes(app: FastifyInstance) {
  await app.register(facilityRoutes)
}
