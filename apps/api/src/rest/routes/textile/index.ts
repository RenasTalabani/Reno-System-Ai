import type { FastifyInstance } from 'fastify'
import { textileRoutes } from './routes.js'
export async function textileModuleRoutes(app: FastifyInstance) { await app.register(textileRoutes) }
