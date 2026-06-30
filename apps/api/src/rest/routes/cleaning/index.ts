import type { FastifyInstance } from 'fastify'
import { cleaningRoutes } from './routes.js'
export async function cleaningModuleRoutes(app: FastifyInstance) { await app.register(cleaningRoutes) }
