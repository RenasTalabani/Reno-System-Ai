import type { FastifyInstance } from 'fastify'
import { biDashboardRoutes } from './routes.js'

export async function biDashboardModuleRoutes(app: FastifyInstance) {
  await app.register(biDashboardRoutes)
}