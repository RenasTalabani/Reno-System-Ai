import type { FastifyInstance } from 'fastify'
import { financialAdvisoryRoutes } from './routes.js'
export async function financialAdvisoryModuleRoutes(app: FastifyInstance) { await app.register(financialAdvisoryRoutes) }
