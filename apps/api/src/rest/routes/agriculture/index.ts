import type { FastifyInstance } from 'fastify'
import { agricultureRoutes } from './routes.js'
export async function agricultureModuleRoutes(app: FastifyInstance) { await app.register(agricultureRoutes) }
