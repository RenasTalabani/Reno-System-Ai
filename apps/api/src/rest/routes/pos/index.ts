import type { FastifyInstance } from 'fastify'
import { posRoutes } from './routes.js'
export async function posModuleRoutes(app: FastifyInstance) { await app.register(posRoutes) }
