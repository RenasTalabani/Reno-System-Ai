import type { FastifyInstance } from 'fastify'
import { ticketingRoutes } from './routes.js'
export async function ticketingModuleRoutes(app: FastifyInstance) { await app.register(ticketingRoutes) }
