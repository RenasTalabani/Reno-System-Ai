import { FastifyInstance } from 'fastify'
import { docsHubRoutes } from './routes.js'

export async function docsHubModuleRoutes(app: FastifyInstance) {
  await app.register(docsHubRoutes, { prefix: '/docs-hub' })
}
