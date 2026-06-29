import type { FastifyInstance } from 'fastify'
import { reportingRoutes } from './routes.js'
export async function reportingModuleRoutes(app: FastifyInstance) {
  await app.register(reportingRoutes)
}
