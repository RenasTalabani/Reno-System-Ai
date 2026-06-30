import type { FastifyInstance } from 'fastify'
import { governmentRoutes } from './routes.js'
export async function governmentModuleRoutes(app: FastifyInstance) { await app.register(governmentRoutes) }
