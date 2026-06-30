import type { FastifyInstance } from 'fastify'
import { mediaRoutes } from './routes.js'
export async function mediaModuleRoutes(app: FastifyInstance) { await app.register(mediaRoutes) }
