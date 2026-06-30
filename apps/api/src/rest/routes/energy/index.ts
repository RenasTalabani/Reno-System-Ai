import type { FastifyInstance } from 'fastify'
import { energyRoutes } from './routes.js'
export async function energyModuleRoutes(app: FastifyInstance) { await app.register(energyRoutes) }
