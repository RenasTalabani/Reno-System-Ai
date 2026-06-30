import type { FastifyInstance } from 'fastify'
import { hospitalityRoutes } from './routes.js'
export async function hospitalityModuleRoutes(app: FastifyInstance) { await app.register(hospitalityRoutes) }
