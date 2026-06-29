import type { FastifyInstance } from 'fastify'
import { qmsRoutes } from './routes.js'
export async function qmsModuleRoutes(app: FastifyInstance) {
  await app.register(qmsRoutes)
}
