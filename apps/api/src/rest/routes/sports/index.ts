import type { FastifyInstance } from 'fastify'
import { sportsRoutes } from './routes.js'
export async function sportsModuleRoutes(app: FastifyInstance) { await app.register(sportsRoutes) }
