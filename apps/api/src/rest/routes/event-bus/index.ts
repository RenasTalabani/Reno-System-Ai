import type { FastifyInstance } from 'fastify'
import { eventBusRoutes } from './routes.js'

export async function eventBusModuleRoutes(app: FastifyInstance) {
  await app.register(eventBusRoutes, { prefix: '/event-bus' })
}
