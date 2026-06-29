import type { FastifyInstance } from 'fastify'
import { appStoreRoutes } from './routes.js'
export async function appStoreModuleRoutes(app: FastifyInstance) {
  await app.register(appStoreRoutes)
}
