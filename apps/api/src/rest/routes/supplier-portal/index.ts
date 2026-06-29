import type { FastifyInstance } from 'fastify'
import { supplierPortalRoutes } from './routes.js'

export async function supplierPortalModuleRoutes(app: FastifyInstance) {
  await app.register(supplierPortalRoutes)
}