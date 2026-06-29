import type { FastifyInstance } from 'fastify'
import { billingRoutes } from './routes.js'
export async function billingModuleRoutes(app: FastifyInstance) {
  await app.register(billingRoutes)
}
