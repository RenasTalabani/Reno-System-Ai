import type { FastifyInstance } from 'fastify'
import { damRoutes } from './routes.js'
export async function damModuleRoutes(app: FastifyInstance) { await app.register(damRoutes) }
