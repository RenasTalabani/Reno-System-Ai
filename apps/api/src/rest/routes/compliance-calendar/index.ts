import type { FastifyInstance } from 'fastify'
import { complianceCalendarRoutes } from './routes.js'

export async function complianceCalendarModuleRoutes(app: FastifyInstance) {
  await app.register(complianceCalendarRoutes)
}