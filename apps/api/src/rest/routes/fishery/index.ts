import type { FastifyInstance } from 'fastify'
import { fisheryRoutes } from './routes.js'
export async function fisheryModuleRoutes(app: FastifyInstance) { await app.register(fisheryRoutes) }
