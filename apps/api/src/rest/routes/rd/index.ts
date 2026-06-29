import type { FastifyInstance } from 'fastify'
import { rdRoutes } from './routes.js'
export async function rdModuleRoutes(app: FastifyInstance) { await app.register(rdRoutes) }
