import type { FastifyInstance } from 'fastify'
import { architectureRoutes } from './routes.js'
export async function architectureModuleRoutes(app: FastifyInstance) { await app.register(architectureRoutes) }
