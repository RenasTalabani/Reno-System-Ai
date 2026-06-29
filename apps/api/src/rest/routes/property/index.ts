import type { FastifyInstance } from 'fastify'
import { propertyRoutes } from './routes.js'

export async function propertyModuleRoutes(app: FastifyInstance) {
  await app.register(propertyRoutes)
}
