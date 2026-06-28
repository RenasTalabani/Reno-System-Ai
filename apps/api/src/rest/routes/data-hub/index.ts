import type { FastifyInstance } from 'fastify'
import { dataHubRoutes } from './data-hub.routes.js'

export async function dataHubModuleRoutes(app: FastifyInstance) {
  await app.register(dataHubRoutes, { prefix: '' })
}
