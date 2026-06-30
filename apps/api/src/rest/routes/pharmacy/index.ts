import type { FastifyInstance } from 'fastify'
import { pharmacyRoutes } from './routes.js'
export async function pharmacyModuleRoutes(app: FastifyInstance) { await app.register(pharmacyRoutes) }
