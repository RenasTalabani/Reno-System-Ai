import type { FastifyInstance } from 'fastify'
import { wasteRoutes } from './routes.js'
export async function wasteModuleRoutes(app: FastifyInstance) { await app.register(wasteRoutes) }
