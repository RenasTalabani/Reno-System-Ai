import type { FastifyInstance } from 'fastify'
import { aviationRoutes } from './routes.js'
export async function aviationModuleRoutes(app: FastifyInstance) { await app.register(aviationRoutes) }
