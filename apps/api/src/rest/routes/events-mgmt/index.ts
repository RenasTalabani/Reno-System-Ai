import type { FastifyInstance } from 'fastify'
import { eventsRoutes } from './routes.js'

export async function eventsModuleRoutes(app: FastifyInstance) {
  await app.register(eventsRoutes)
}