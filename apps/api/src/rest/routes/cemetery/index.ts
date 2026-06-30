import type { FastifyInstance } from 'fastify'
import { cemeteryRoutes } from './routes.js'
export async function cemeteryModuleRoutes(app: FastifyInstance) { await app.register(cemeteryRoutes) }
