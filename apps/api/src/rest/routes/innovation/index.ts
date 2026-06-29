import type { FastifyInstance } from 'fastify'
import { innovationRoutes } from './routes.js'

export async function innovationModuleRoutes(app: FastifyInstance) {
  await app.register(innovationRoutes)
}
