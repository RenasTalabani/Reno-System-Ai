import type { FastifyInstance } from 'fastify'
import { laundryRoutes } from './routes.js'
export async function laundryModuleRoutes(app: FastifyInstance) { await app.register(laundryRoutes) }
