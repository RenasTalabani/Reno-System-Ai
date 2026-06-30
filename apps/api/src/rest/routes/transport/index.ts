import type { FastifyInstance } from 'fastify'
import { transportRoutes } from './routes.js'
export async function transportModuleRoutes(app: FastifyInstance) { await app.register(transportRoutes) }
