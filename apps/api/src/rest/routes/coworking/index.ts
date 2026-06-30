import type { FastifyInstance } from 'fastify'
import { coworkingRoutes } from './routes.js'
export async function coworkingModuleRoutes(app: FastifyInstance) { await app.register(coworkingRoutes) }
