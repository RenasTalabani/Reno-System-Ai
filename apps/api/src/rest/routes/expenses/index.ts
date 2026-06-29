import type { FastifyInstance } from 'fastify'
import { expensesRoutes } from './routes.js'

export async function expensesModuleRoutes(app: FastifyInstance) {
  await app.register(expensesRoutes)
}