import type { FastifyInstance } from 'fastify'
import { notificationCenterRoutes } from './routes.js'

export async function notificationCenterModuleRoutes(app: FastifyInstance) {
  await app.register(notificationCenterRoutes, { prefix: '/notification-center' })
}
