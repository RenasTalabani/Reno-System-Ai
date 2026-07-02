import type { FastifyInstance } from 'fastify'
import { eiRoutes } from './routes.js'

export async function eiModuleRoutes(app: FastifyInstance) {
  await app.register(eiRoutes, { prefix: '/ei' })
}
