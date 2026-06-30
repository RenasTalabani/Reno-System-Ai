import type { FastifyInstance } from 'fastify'
import { automotiveRoutes } from './routes.js'
export async function automotiveModuleRoutes(app: FastifyInstance) { await app.register(automotiveRoutes) }
