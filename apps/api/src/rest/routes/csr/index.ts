import type { FastifyInstance } from 'fastify'
import { csrRoutes } from './routes.js'

export async function csrModuleRoutes(app: FastifyInstance) {
  await app.register(csrRoutes)
}
