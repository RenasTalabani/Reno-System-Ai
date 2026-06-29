import type { FastifyInstance } from 'fastify'
import { iotRoutes } from './routes.js'

export async function iotModuleRoutes(app: FastifyInstance) {
  await app.register(iotRoutes)
}
