import type { FastifyInstance } from 'fastify'
import { publishingRoutes } from './routes.js'
export async function publishingModuleRoutes(app: FastifyInstance) { await app.register(publishingRoutes) }
