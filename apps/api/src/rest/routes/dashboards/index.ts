import type { FastifyInstance } from 'fastify'
import { dashboardRoutes } from './routes.js'

export async function dashboardsModuleRoutes(app: FastifyInstance) {
  await app.register(dashboardRoutes, { prefix: '/dashboards' })
}
