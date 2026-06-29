import type { FastifyInstance } from 'fastify'
import { franchiseRoutes } from './routes.js'
export async function franchiseModuleRoutes(app: FastifyInstance) { await app.register(franchiseRoutes) }
