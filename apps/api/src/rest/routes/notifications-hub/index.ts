import type { FastifyInstance } from 'fastify'
import { notificationsRoutes } from './routes.js'

export async function notificationsModuleRoutes(app: FastifyInstance) {
  await app.register(notificationsRoutes)
}