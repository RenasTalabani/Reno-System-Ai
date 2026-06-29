import type { FastifyInstance } from 'fastify'
import { etlRoutes } from './routes.js'

export async function etlModuleRoutes(app: FastifyInstance) {
  await app.register(etlRoutes)
}
