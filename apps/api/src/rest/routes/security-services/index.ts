import type { FastifyInstance } from 'fastify'
import { securityServicesRoutes } from './routes.js'
export async function securityServicesModuleRoutes(app: FastifyInstance) { await app.register(securityServicesRoutes) }
