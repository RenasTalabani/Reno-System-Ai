import type { FastifyInstance } from 'fastify'
import { identityRoutes } from './routes.js'

export async function identityModuleRoutes(app: FastifyInstance) {
  await app.register(identityRoutes)
}