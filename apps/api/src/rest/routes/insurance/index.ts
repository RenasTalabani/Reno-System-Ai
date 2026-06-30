import type { FastifyInstance } from 'fastify'
import { insuranceRoutes } from './routes.js'
export async function insuranceModuleRoutes(app: FastifyInstance) { await app.register(insuranceRoutes) }
