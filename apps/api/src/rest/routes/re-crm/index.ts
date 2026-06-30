import type { FastifyInstance } from 'fastify'
import { reCrmRoutes } from './routes.js'
export async function reCrmModuleRoutes(app: FastifyInstance) { await app.register(reCrmRoutes) }
