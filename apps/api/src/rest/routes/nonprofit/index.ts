import type { FastifyInstance } from 'fastify'
import { nonprofitRoutes } from './routes.js'
export async function nonprofitModuleRoutes(app: FastifyInstance) { await app.register(nonprofitRoutes) }
