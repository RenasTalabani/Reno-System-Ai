import type { FastifyInstance } from 'fastify'
import { healthcareRoutes } from './routes.js'
export async function healthcareModuleRoutes(app: FastifyInstance) { await app.register(healthcareRoutes) }
