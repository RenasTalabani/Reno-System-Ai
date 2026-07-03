import type { FastifyInstance } from 'fastify'
import { reportRoutes } from './routes.js'

export async function reportsModuleRoutes(app: FastifyInstance) {
  await app.register(reportRoutes, { prefix: '/reports' })
}
