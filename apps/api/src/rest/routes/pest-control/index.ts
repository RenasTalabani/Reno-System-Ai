import type { FastifyInstance } from 'fastify'
import { pestControlRoutes } from './routes.js'
export async function pestControlModuleRoutes(app: FastifyInstance) { await app.register(pestControlRoutes) }
