import type { FastifyInstance } from 'fastify'
import { conferenceRoutes } from './routes.js'
export async function conferenceModuleRoutes(app: FastifyInstance) { await app.register(conferenceRoutes) }
