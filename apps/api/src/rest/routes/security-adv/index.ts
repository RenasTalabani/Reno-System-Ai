import type { FastifyInstance } from 'fastify'
import { secAdvRoutes } from './routes.js'
export async function secAdvModuleRoutes(app: FastifyInstance) {
  await app.register(secAdvRoutes)
}
