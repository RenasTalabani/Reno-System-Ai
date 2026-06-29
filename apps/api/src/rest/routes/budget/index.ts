import type { FastifyInstance } from 'fastify'
import { budgetRoutes } from './routes.js'

export async function budgetModuleRoutes(app: FastifyInstance) {
  await app.register(budgetRoutes)
}
