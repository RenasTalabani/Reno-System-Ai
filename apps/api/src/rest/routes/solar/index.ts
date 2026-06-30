import type { FastifyInstance } from 'fastify'
import { solarRoutes } from './routes.js'
export async function solarModuleRoutes(app: FastifyInstance) { await app.register(solarRoutes) }
