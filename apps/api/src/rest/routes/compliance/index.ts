import type { FastifyInstance } from 'fastify'
import { complianceRoutes } from './compliance.routes.js'

export async function complianceModuleRoutes(app: FastifyInstance) {
  await app.register(complianceRoutes, { prefix: '' })
}
