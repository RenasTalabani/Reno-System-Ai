import type { FastifyInstance } from 'fastify'
import { photographyRoutes } from './routes.js'
export async function photographyModuleRoutes(app: FastifyInstance) { await app.register(photographyRoutes) }
