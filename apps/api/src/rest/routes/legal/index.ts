import type { FastifyInstance } from 'fastify'
import { legalRoutes } from './routes.js'
export async function legalModuleRoutes(app: FastifyInstance) { await app.register(legalRoutes) }
