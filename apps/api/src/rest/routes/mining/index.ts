import type { FastifyInstance } from 'fastify'
import { miningRoutes } from './routes.js'
export async function miningModuleRoutes(app: FastifyInstance) { await app.register(miningRoutes) }
