import type { FastifyInstance } from 'fastify'
import { riskRoutes } from './routes.js'

export async function riskModuleRoutes(app: FastifyInstance) {
  await app.register(riskRoutes)
}
