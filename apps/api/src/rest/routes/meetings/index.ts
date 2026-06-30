import type { FastifyInstance } from 'fastify'
import { meetingsRoutes } from './routes.js'
export async function meetingsModuleRoutes(app: FastifyInstance) { await app.register(meetingsRoutes) }
