import type { FastifyInstance } from 'fastify'
import { marineRoutes } from './routes.js'
export async function marineModuleRoutes(app: FastifyInstance) { await app.register(marineRoutes) }
