import type { FastifyInstance } from 'fastify'
import { dentalRoutes } from './routes.js'
export async function dentalModuleRoutes(app: FastifyInstance) { await app.register(dentalRoutes) }
