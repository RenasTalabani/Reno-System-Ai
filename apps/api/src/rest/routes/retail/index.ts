import type { FastifyInstance } from 'fastify'
import { retailRoutes } from './routes.js'
export async function retailModuleRoutes(app: FastifyInstance) { await app.register(retailRoutes) }
