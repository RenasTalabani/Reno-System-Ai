import type { FastifyInstance } from 'fastify'
import { loyaltyRoutes } from './routes.js'

export async function loyaltyModuleRoutes(app: FastifyInstance) {
  await app.register(loyaltyRoutes)
}
