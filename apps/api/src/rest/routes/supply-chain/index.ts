import type { FastifyInstance } from 'fastify'
import { scmRoutes } from './routes.js'
export async function scmModuleRoutes(app: FastifyInstance) {
  await app.register(scmRoutes)
}
