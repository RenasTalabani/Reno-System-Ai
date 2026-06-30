import type { FastifyInstance } from 'fastify'
import { veterinaryRoutes } from './routes.js'
export async function veterinaryModuleRoutes(app: FastifyInstance) { await app.register(veterinaryRoutes) }
