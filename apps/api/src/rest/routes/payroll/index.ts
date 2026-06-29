import type { FastifyInstance } from 'fastify'
import { payrollRoutes } from './routes.js'

export async function payrollModuleRoutes(app: FastifyInstance) {
  await app.register(payrollRoutes)
}
