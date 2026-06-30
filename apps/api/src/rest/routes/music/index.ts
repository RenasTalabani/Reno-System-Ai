import type { FastifyInstance } from 'fastify'
import { musicRoutes } from './routes.js'
export async function musicModuleRoutes(app: FastifyInstance) { await app.register(musicRoutes) }
